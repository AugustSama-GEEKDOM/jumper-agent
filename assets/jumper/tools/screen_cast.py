#!/usr/bin/env python3
"""Choose two circular desktop regions and mirror them to Jumper's simulator.

Run this GUI directly to start the bundled policy-driven simulator, or start a
replay first and run the GUI without ``--standalone`` to attach to it::

    python scripts/play.py --task jumper.flat --agent zero --backend native \
        --num_envs 1 --viewer-env-num 1

Then run this GUI. It uses Pillow's Windows screen grabber and only sends raw
RGB frames to the loopback endpoint; no image is written to disk. Enter the
source diameter, open each capture button, move the circle over the source, and
click once to confirm it.

For a real walking simulator that starts the bundled locomotion policy itself,
use ``--standalone`` (or pass ``--app``). W/A/S/D then go through the app's
operator controls and policy rather than teleporting the base.
"""

from __future__ import annotations

import argparse
import ctypes
import json
import os
import queue
import socket
import subprocess
import sys
import threading
import time
import tkinter as tk
import urllib.error
import urllib.request
from ctypes import wintypes
from dataclasses import dataclass
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from PIL import Image, ImageGrab, ImageTk

REPO = Path(__file__).resolve().parents[3]
SCREEN_SIZE = 256
# Desktop capture is independent of the simulator render loop. Ten updates per
# second keeps the screens responsive while avoiding a full-screen ImageGrab and
# two resizes on every 30 FPS render frame.
CAPTURE_HZ = 10.0
ACTION_PORT = 18766


def _newest_app() -> Path | None:
    """Find the newest built app for the simulator launcher."""
    candidates = [path for path in REPO.glob("out/**/*.app") if path.is_file()]
    if not candidates:
        return None
    return max(candidates, key=lambda path: path.stat().st_mtime)


def _free_loopback_port() -> int:
    """Return an available port for the simulator's local screen receiver."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _simulator_command(app_path: Path) -> list[str]:
    """Build the real policy simulator command for the selected app bundle."""
    return [
        sys.executable,
        str(REPO / "scripts" / "play.py"),
        "--app",
        str(Path(app_path).expanduser().resolve()),
        # A single robot is faster on the native MuJoCo backend on this host.
        # Warp pays a large kernel-launch cost for a one-environment app and
        # leaves the controller at a fraction of real time.  Run the world at
        # the fastest policy rate, 200 Hz: this is the training timestep for
        # locomotion/jump and removes all redundant substeps from those modes.
        # The 50 Hz motion modes retain four physics steps per control tick via
        # play.py's decimation adjustment.
        "--backend",
        "native",
        "--device",
        "cpu",
        "--physics-hz",
        "200",
        "--num_envs",
        "1",
        "--viewer-env-num",
        "1",
        "--viewer-fps",
        "30",
        "--no-viewer-ui",
        "--speed",
        "1",
        # Keep the world at real time by default so the CPU is not forced to
        # simulate twice as many control ticks as the operator can observe.
        # The 0.3 s keyboard ramp keeps manual response immediate at 1x.
        "--app-keyboard-full-after-s",
        "0.3",
    ]


class _AppSimulator:
    """Run the repository's real ``play --app`` simulator in a child process.

    The screen-cast GUI is intentionally not a second physics implementation.
    ``play --app`` loads the bundle's controller and ONNX policy, maps the
    simulator's servos to the controller's targets, and already forwards both
    keyboard edges. Keeping it in a child process also keeps its MuJoCo viewer
    on the thread layout it expects, while this Tk process remains responsive
    during desktop capture.
    """

    def __init__(self, app_path: Path, port: int | None = None, action_port: int = ACTION_PORT) -> None:
        self.app_path = Path(app_path).expanduser().resolve()
        if not self.app_path.is_file():
            raise FileNotFoundError(f"app not found: {self.app_path}")
        self.port = _free_loopback_port() if port is None else int(port)
        self.url = f"http://127.0.0.1:{self.port}"
        self.action_port = int(action_port)
        self.action_url = f"http://127.0.0.1:{self.action_port}/actions"
        self.action_bridge = _ActionBridge(self.action_port)
        env = os.environ.copy()
        env["MJRL_SCREEN_MIRROR_PORT"] = str(self.port)
        env["MJRL_KEY_DEBUG"] = "1"
        env["PYTHONUNBUFFERED"] = "1"
        # The machine may have an editable install of the original checkout.
        # Put this independent copy first so its screen receiver and controller
        # changes are the ones loaded by the child simulator.
        env["PYTHONPATH"] = os.pathsep.join(
            str(path) for path in (REPO / "rl", REPO) if path.exists()
        ) + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
        command = _simulator_command(self.app_path)
        self._lock = threading.Lock()
        self._ready = False
        self._failure = ""
        self._last_key_event = ""
        vocabulary_path = REPO / "controller" / "vocabulary.json"
        vocabulary = json.loads(vocabulary_path.read_text("utf-8"))
        self._key_names = {
            int(key["glfw"]): key["name"] for key in vocabulary["keys"]
        }
        self._recent_output: list[str] = []
        self.process = subprocess.Popen(
            command,
            cwd=str(REPO),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        self._reader = threading.Thread(
            target=self._read_output,
            name="jumper-play-app-output",
            daemon=True,
        )
        self._reader.start()

    def _read_output(self) -> None:
        stream = self.process.stdout
        if stream is None:
            return
        for raw in stream:
            line = raw.strip()
            if not line:
                continue
            with self._lock:
                self._recent_output.append(line)
                del self._recent_output[:-12]
                if line.startswith("[mjrl] key "):
                    fields = line.split()
                    try:
                        code = int(fields[2])
                    except (IndexError, ValueError):
                        pass
                    else:
                        name = self._key_names.get(code, str(code))
                        edge = fields[3] if len(fields) > 3 else ""
                        self._last_key_event = f"最近输入: {name} {edge}"
                if "expression screens ready at" in line:
                    self._ready = True
                    # The Tk controller is usually still the foreground window
                    # when the child viewer finishes loading.  In that state
                    # the user can press a shortcut, see no error, and assume
                    # the mapping is broken because the key went to Tk.  Put
                    # focus on MuJoCo once, after startup; selecting a screen
                    # later can still bring the cast window forward normally.
                    _focus_mujoco_window()
                elif "going headless:" in line or "live viewer failed to open" in line:
                    self._failure = line
                elif line.startswith("ImportError:") or line.startswith("ModuleNotFoundError:"):
                    self._failure = line

    @property
    def status(self) -> str:
        code = self.process.poll()
        with self._lock:
            ready = self._ready
            failure = self._failure
            last_key_event = self._last_key_event
            recent = self._recent_output[-1] if self._recent_output else ""
        if code is None:
            if failure:
                return f"模拟器窗口不可用：{failure}"
            if ready:
                suffix = f"；{last_key_event}" if last_key_event else "；等待模拟器窗口按键"
                return f"真实步态模拟器已就绪；点击模拟器窗口后按 W/A/S/D 行走{suffix}"
            return "正在加载真实步态模拟器和内置策略…"
        if code == 0:
            return "步态模拟器已关闭"
        return f"模拟器启动失败（退出码 {code}）：{failure or recent}"

    def close(self) -> None:
        """Stop the child simulator and leave no orphaned viewer process."""
        self.action_bridge.close()
        if self.process.poll() is not None:
            return
        self.process.terminate()
        try:
            self.process.wait(timeout=5.0)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5.0)


def _focus_mujoco_window() -> None:
    """Give the newly ready simulator keyboard focus on Windows."""
    if __import__("sys").platform != "win32":
        return
    try:
        user32 = ctypes.windll.user32
        enum_proc_type = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
        found = []

        @enum_proc_type
        def visit(hwnd, _lparam):
            if not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            title = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, title, length + 1)
            if title.value.startswith("MuJoCo"):
                found.append(hwnd)
                return False
            return True

        user32.EnumWindows(visit, 0)
        if found:
            user32.ShowWindow(found[0], 9)
            user32.SetForegroundWindow(found[0])
    except (AttributeError, OSError):
        return


class _ActionBridge:
    """Expose a loopback JSON endpoint that presses the simulator controls."""

    _VK = {
        "w": 0x57, "a": 0x41, "s": 0x53, "d": 0x44,
        "0": 0x30, "1": 0x31, "2": 0x32, "3": 0x33, "4": 0x34,
        "space": 0x20, "ctrl": 0x11,
    }
    _DIRECTION_KEYS = {"forward": "w", "backward": "s", "left": "a", "right": "d"}
    _DANCE_KEYS = {"crab": "1", "brazilian": "2", "maze": "3", "dream_wings": "4"}
    _GESTURE_KEYS = {"hello": "1", "bow": "2", "paw": "3", "salute": "4"}

    def __init__(self, port: int) -> None:
        self.port = int(port)
        self._server = ThreadingHTTPServer(("127.0.0.1", self.port), self._handler_type())
        self._server.bridge = self  # type: ignore[attr-defined]
        self._thread = threading.Thread(target=self._server.serve_forever, name="jumper-action-bridge", daemon=True)
        self._thread.start()

    def _handler_type(self):
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, _format: str, *_args: object) -> None:
                return

            def _cors(self) -> None:
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")

            def do_OPTIONS(self) -> None:  # noqa: N802
                self.send_response(204)
                self._cors()
                self.end_headers()

            def do_POST(self) -> None:  # noqa: N802
                if self.path.rstrip("/") != "/actions":
                    self.send_error(404)
                    return
                try:
                    length = min(int(self.headers.get("Content-Length", "0")), 16_000)
                    payload = json.loads(self.rfile.read(length).decode("utf-8"))
                    result = self.server.bridge.execute(payload)  # type: ignore[attr-defined]
                    data = json.dumps(result, ensure_ascii=False).encode("utf-8")
                    self.send_response(200 if result.get("ok") else 400)
                except Exception as error:  # noqa: BLE001 - return a browser-readable failure
                    data = json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False).encode("utf-8")
                    self.send_response(400)
                self._cors()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        return Handler

    @classmethod
    def _key_event(cls, key: str, down: bool) -> None:
        if sys.platform != "win32":
            return
        vk = cls._VK[key]
        class KEYBDINPUT(ctypes.Structure):
            _fields_ = [("wVk", wintypes.WORD), ("wScan", wintypes.WORD),
                        ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD),
                        ("dwExtraInfo", ctypes.c_ulonglong if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_ulong)]
        class INPUT_UNION(ctypes.Union):
            _fields_ = [("ki", KEYBDINPUT), ("mi", ctypes.c_byte * (32 if ctypes.sizeof(ctypes.c_void_p) == 8 else 28))]
        class INPUT(ctypes.Structure):
            _anonymous_ = ("u",)
            _fields_ = [("type", wintypes.DWORD), ("u", INPUT_UNION)]
        input_value = INPUT(type=1, ki=KEYBDINPUT(vk, 0, 2 if not down else 0, 0, 0))
        ctypes.windll.user32.SendInput(1, ctypes.byref(input_value), ctypes.sizeof(INPUT))

    @classmethod
    def _tap(cls, key: str, modifier: str | None = None) -> None:
        if modifier:
            cls._key_event(modifier, True)
        cls._key_event(key, True)
        time.sleep(0.035)
        cls._key_event(key, False)
        if modifier:
            cls._key_event(modifier, False)

    def execute(self, action: object) -> dict[str, object]:
        if not isinstance(action, dict):
            return {"ok": False, "error": "动作格式无效"}
        action_type = str(action.get("type", "")).lower()
        _focus_mujoco_window()
        if action_type == "walk":
            direction = str(action.get("direction", "forward"))
            key = self._DIRECTION_KEYS.get(direction)
            if key is None:
                return {"ok": False, "error": "行走方向无效"}
            count = max(1, min(10, int(action.get("steps", 1))))
            self._key_event(key, True)
            time.sleep(0.62 * count)
            self._key_event(key, False)
            return {"ok": True, "type": action_type, "duration_ms": round(620 * count)}
        if action_type == "dance":
            key = self._DANCE_KEYS.get(str(action.get("name", "crab")), "1")
            self._tap(key, "ctrl")
            time.sleep(6.0)
            self._tap("0")
            return {"ok": True, "type": action_type}
        if action_type == "gesture":
            key = self._GESTURE_KEYS.get(str(action.get("name", "hello")), "1")
            self._tap(key)
            time.sleep(2.2)
            self._tap("0")
            return {"ok": True, "type": action_type}
        if action_type == "jump":
            self._tap("space")
            time.sleep(1.5)
            self._tap("0")
            return {"ok": True, "type": action_type}
        if action_type == "stop":
            self._send_cancel()
            return {"ok": True, "type": action_type}
        return {"ok": False, "error": "不支持的动作类型"}

    @classmethod
    def _send_cancel(cls) -> None:
        # AppPlayer treats the physical 0 key as an emergency action cancel.
        if sys.platform != "win32":
            return
        vk = 0x30
        cls._key_event("space", False)  # release a possible stale jump key
        class KEYBDINPUT(ctypes.Structure):
            _fields_ = [("wVk", wintypes.WORD), ("wScan", wintypes.WORD),
                        ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD),
                        ("dwExtraInfo", ctypes.c_ulonglong if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_ulong)]
        class INPUT_UNION(ctypes.Union):
            _fields_ = [("ki", KEYBDINPUT), ("mi", ctypes.c_byte * (32 if ctypes.sizeof(ctypes.c_void_p) == 8 else 28))]
        class INPUT(ctypes.Structure):
            _anonymous_ = ("u",)
            _fields_ = [("type", wintypes.DWORD), ("u", INPUT_UNION)]
        for flags in (0, 2):
            value = INPUT(type=1, ki=KEYBDINPUT(vk, 0, flags, 0, 0))
            ctypes.windll.user32.SendInput(1, ctypes.byref(value), ctypes.sizeof(INPUT))

    def close(self) -> None:
        self._server.shutdown()
        self._server.server_close()


def _grab_desktop() -> Image.Image:
    """Capture the desktop in the same virtual-screen coordinates used by Tk."""
    return ImageGrab.grab(all_screens=__import__("sys").platform == "win32")


def _desktop_origin() -> tuple[int, int]:
    """Return the origin Pillow uses for an all-monitor Windows capture."""
    if __import__("sys").platform != "win32":
        return 0, 0
    try:
        user32 = ctypes.windll.user32
        return int(user32.GetSystemMetrics(76)), int(user32.GetSystemMetrics(77))
    except (AttributeError, OSError):
        return 0, 0


def _enable_dpi_awareness() -> None:
    """Make Tk coordinates and ImageGrab pixels agree on Windows HiDPI screens."""
    if __import__("sys").platform != "win32":
        return
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except (AttributeError, OSError):
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except (AttributeError, OSError):
            pass


def _selection_box(
    start: tuple[int, int], end: tuple[int, int], bounds: tuple[int, int, int, int],
) -> tuple[int, int, int, int] | None:
    """Return a square drag clipped to the screenshot, or None if it is tiny."""
    left, top, right, bottom = bounds
    x0 = max(left, min(int(start[0]), right))
    y0 = max(top, min(int(start[1]), bottom))
    x1 = max(left, min(int(end[0]), right))
    y1 = max(top, min(int(end[1]), bottom))
    dx, dy = x1 - x0, y1 - y0
    requested = max(abs(dx), abs(dy))
    if requested < 8:
        return None
    side = min(
        requested,
        right - x0 if dx >= 0 else x0 - left,
        bottom - y0 if dy >= 0 else y0 - top,
    )
    if side < 8:
        return None
    x1 = x0 + (side if dx >= 0 else -side)
    y1 = y0 + (side if dy >= 0 else -side)
    return min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)


def _region_from_drag(
    start: tuple[int, int],
    end: tuple[int, int],
    *,
    image_bounds: tuple[int, int, int, int],
    image_offset: tuple[int, int],
    scale: float,
    screenshot_size: tuple[int, int],
    desktop_origin: tuple[int, int],
) -> Region | None:
    """Map the visible drag rectangle to a bounded square in desktop pixels."""
    box = _selection_box(start, end, image_bounds)
    if box is None:
        return None
    left, top, right, _bottom = box
    offset_x, offset_y = image_offset
    source_width, source_height = screenshot_size
    origin_x, origin_y = desktop_origin
    pixel_left = round((left - offset_x) / scale)
    pixel_top = round((top - offset_y) / scale)
    size = max(1, round((right - left) / scale))
    # Clamp at the screenshot edges in its own pixel coordinates. Never infer a
    # larger rectangle from the full-screen window or the monitor's dimensions.
    pixel_left = max(0, min(pixel_left, source_width))
    pixel_top = max(0, min(pixel_top, source_height))
    size = min(size, source_width - pixel_left, source_height - pixel_top)
    if size < 1:
        return None
    return Region(origin_x + pixel_left, origin_y + pixel_top, size)


def _clamp_circle_center(
    center: tuple[float, float],
    diameter: int,
    *,
    image_bounds: tuple[int, int, int, int],
    scale: float,
) -> tuple[float, float]:
    """Keep a displayed circle with ``diameter`` source pixels inside the image."""
    left, top, right, bottom = image_bounds
    radius = max(1.0, float(diameter) * scale / 2.0)
    return (
        max(left + radius, min(float(center[0]), right - radius)),
        max(top + radius, min(float(center[1]), bottom - radius)),
    )


def _region_from_center(
    center: tuple[float, float],
    diameter: int,
    *,
    image_bounds: tuple[int, int, int, int],
    image_offset: tuple[int, int],
    scale: float,
    screenshot_size: tuple[int, int],
    desktop_origin: tuple[int, int],
) -> Region | None:
    """Map a displayed circle center to its square source crop."""
    source_width, source_height = screenshot_size
    if diameter < 1 or diameter > source_width or diameter > source_height or scale <= 0:
        return None
    center_x, center_y = _clamp_circle_center(
        center,
        diameter,
        image_bounds=image_bounds,
        scale=scale,
    )
    offset_x, offset_y = image_offset
    pixel_left = round((center_x - offset_x) / scale - diameter / 2.0)
    pixel_top = round((center_y - offset_y) / scale - diameter / 2.0)
    pixel_left = max(0, min(pixel_left, source_width - diameter))
    pixel_top = max(0, min(pixel_top, source_height - diameter))
    origin_x, origin_y = desktop_origin
    return Region(origin_x + pixel_left, origin_y + pixel_top, diameter)


class DesktopMirror:
    """Capture two selected desktop squares and pack them as RGB simulator frames."""

    def __init__(self, url: str, regions: list[Region | None]) -> None:
        self.url = url.rstrip("/")
        self.regions = regions
        self.running = False
        self.desktop_origin = _desktop_origin()

    def frame(self) -> bytes:
        """Return a left-then-right pair of resized RGB crops."""
        if any(region is None for region in self.regions):
            raise ValueError("select both screen regions before starting the mirror")
        desktop = _grab_desktop()
        frames = []
        for region in self.regions:
            assert region is not None
            left, top, right, bottom = region.bbox()
            origin_x, origin_y = self.desktop_origin
            crop_box = (left - origin_x, top - origin_y, right - origin_x, bottom - origin_y)
            if (
                crop_box[0] < 0 or crop_box[1] < 0
                or crop_box[2] > desktop.width or crop_box[3] > desktop.height
            ):
                raise ValueError(
                    "a selected region is outside the current desktop capture; "
                    "select it again on the current monitor layout"
                )
            image = desktop.crop(crop_box).convert("RGB")
            if image.size != (region.size, region.size):
                raise ValueError(
                    "desktop capture did not contain the full selected region; "
                    "select it again on the current monitor layout"
                )
            frames.append(image.resize((SCREEN_SIZE, SCREEN_SIZE), Image.Resampling.LANCZOS))
        return b"".join(image.tobytes() for image in frames)


class RegionPicker(tk.Toplevel):
    """Show a captured desktop image with a mouse-following fixed-diameter circle."""

    def __init__(
        self,
        parent: tk.Tk,
        title: str,
        screenshot: Image.Image,
        desktop_origin: tuple[int, int],
        diameter: int,
    ) -> None:
        super().__init__(parent)
        self.result: Region | None = None
        self.title(title)
        self.configure(background="#111318")
        self.resizable(False, False)
        self.attributes("-topmost", True)
        self.grab_set()
        self.bind("<Escape>", lambda _event: self.destroy())
        self.protocol("WM_DELETE_WINDOW", self.destroy)

        max_width, max_height = 1600, 900
        self.scale = min(max_width / screenshot.width, max_height / screenshot.height, 1.0)
        display_width = max(1, round(screenshot.width * self.scale))
        display_height = max(1, round(screenshot.height * self.scale))
        self.image_offset = (0, 0)
        self.image_bounds = (0, 0, display_width, display_height)
        self.screenshot_size = screenshot.size
        self.desktop_origin = desktop_origin
        self.diameter = diameter
        self._center: tuple[float, float] = (display_width / 2, display_height / 2)

        shown = screenshot.resize((display_width, display_height), Image.Resampling.LANCZOS)
        self._photo = ImageTk.PhotoImage(shown)
        self.canvas = tk.Canvas(
            self,
            width=display_width,
            height=display_height,
            background="#111318",
            highlightthickness=0,
            cursor="crosshair",
        )
        self.canvas.pack()
        self.canvas.create_image(0, 0, anchor="nw", image=self._photo)
        self.canvas.create_rectangle(
            0, 0, display_width, 42, fill="#111318", stipple="gray50", outline=""
        )
        self.canvas.create_text(
            16,
            21,
            anchor="w",
            text="移动鼠标将圆心对准屏幕，再点击确认；按 Esc 取消",
            fill="white",
            font=("Segoe UI", 12, "bold"),
        )
        self._circle = self.canvas.create_oval(0, 0, 0, 0, outline="#42f5c5", width=3)
        self._crosshair_h = self.canvas.create_line(0, 0, 0, 0, fill="#ffffff", width=1)
        self._crosshair_v = self.canvas.create_line(0, 0, 0, 0, fill="#ffffff", width=1)
        self.canvas.bind("<Motion>", self._move)
        self.canvas.bind("<Button-1>", self._confirm)

        origin_x, origin_y = desktop_origin
        x = origin_x + max(0, (screenshot.width - display_width) // 2)
        y = origin_y + max(0, (screenshot.height - display_height) // 2)
        self.geometry(f"{display_width}x{display_height}{x:+d}{y:+d}")
        self._draw_circle()

    def _move(self, event: tk.Event) -> None:
        self._center = (float(event.x), float(event.y))
        self._draw_circle()

    def _draw_circle(self) -> None:
        center_x, center_y = _clamp_circle_center(
            self._center,
            self.diameter,
            image_bounds=self.image_bounds,
            scale=self.scale,
        )
        radius = self.diameter * self.scale / 2
        self.canvas.coords(
            self._circle,
            center_x - radius,
            center_y - radius,
            center_x + radius,
            center_y + radius,
        )
        self.canvas.coords(
            self._crosshair_h,
            center_x - 8,
            center_y,
            center_x + 8,
            center_y,
        )
        self.canvas.coords(
            self._crosshair_v,
            center_x,
            center_y - 8,
            center_x,
            center_y + 8,
        )

    def _confirm(self, event: tk.Event) -> None:
        self._center = (float(event.x), float(event.y))
        self.result = _region_from_center(
            self._center,
            self.diameter,
            image_bounds=self.image_bounds,
            image_offset=self.image_offset,
            scale=self.scale,
            screenshot_size=self.screenshot_size,
            desktop_origin=self.desktop_origin,
        )
        if self.result is None:
            return
        self.destroy()


@dataclass(frozen=True)
class Region:
    """A square in desktop pixel coordinates."""

    left: int
    top: int
    size: int

    def bbox(self) -> tuple[int, int, int, int]:
        return self.left, self.top, self.left + self.size, self.top + self.size


class ScreenCastApp:
    """Small Tk controller for two independently selected round displays."""

    def __init__(self, root: tk.Tk, url: str, standalone: bool = False,
                 app_path: Path | None = None, screen_port: int | None = None,
                 action_port: int = ACTION_PORT) -> None:
        self.root = root
        self.root.title("Jumper dual-screen cast")
        self.root.geometry("560x420")
        self.root.minsize(560, 400)
        self.url = url.rstrip("/")
        self._desktop_origin = _desktop_origin()
        self.regions: list[Region | None] = [None, None]
        self.mirror = DesktopMirror(self.url, self.regions)
        self._standalone = None
        self._screen_port = screen_port
        self._action_port = action_port
        self._worker: threading.Thread | None = None
        self._stop = threading.Event()
        self._capture_result: queue.Queue[tuple[Image.Image | None, Exception | None]] = queue.Queue()
        self._mirror_status = "投屏尚未开始"
        self._message = f"接收地址: {self.url}/frames"
        self._last_displayed_status = ""

        outer = tk.Frame(root, padx=18, pady=18)
        outer.pack(fill="both", expand=True)
        tk.Label(
            outer,
            text="Jumper 双圆屏投屏（正面视角）",
            font=("Segoe UI", 18, "bold"),
        ).pack(anchor="w")
        tk.Label(
            outer,
            text="输入桌面截图中的圆形直径（像素）。点击选择按钮后，圆形选框会跟随鼠标；再次点击确认。",
            justify="left",
        ).pack(anchor="w", pady=(5, 14))
        diameter_row = tk.Frame(outer)
        diameter_row.pack(anchor="w", pady=(0, 10))
        tk.Label(diameter_row, text="圆形直径（像素）：").pack(side="left")
        self.diameter_var = tk.StringVar(value="256")
        self.diameter_entry = tk.Entry(diameter_row, textvariable=self.diameter_var, width=8)
        self.diameter_entry.pack(side="left")
        tk.Label(diameter_row, text=" 例如 256").pack(side="left")
        previews = tk.Frame(outer)
        previews.pack(anchor="w")
        self._preview_canvases = []
        self._preview_images: list[ImageTk.PhotoImage | None] = [None, None]
        for index, label in enumerate(("画面左屏", "画面右屏")):
            pane = tk.Frame(previews)
            pane.pack(side="left", padx=(0, 18))
            tk.Label(pane, text=label).pack()
            canvas = tk.Canvas(pane, width=96, height=96, bg="#17191e", highlightthickness=0)
            canvas.pack()
            canvas.create_oval(2, 2, 94, 94, fill="black", outline="#535a66")
            self._preview_canvases.append(canvas)
        tk.Label(
            outer,
            text=(
                "模拟器控制：点击模拟器窗口后按 W/A/S/D 真实行走；1–4 动作，"
                "Ctrl+1–4 舞蹈，Space 跳跃，V/B 夹爪，0 结束当前动作。\n"
                "若主键盘快捷键与 viewer 冲突，可用安全备用键：小键盘 8/5/7/9 行走，"
                "小键盘 Enter 跳跃，- / + 夹爪。"
            ),
            justify="left",
            wraplength=510,
        ).pack(anchor="w", pady=(8, 2))
        self.status = tk.StringVar(value=f"接收地址: {self.url}/frames")
        tk.Label(outer, textvariable=self.status, anchor="w").pack(fill="x")
        buttons = tk.Frame(outer)
        buttons.pack(fill="x", pady=12)
        for index, label in enumerate(("选择左屏画面", "选择右屏画面")):
            tk.Button(
                buttons,
                text=label,
                command=lambda i=index: self.pick(i),
                width=18,
            ).pack(side="left", padx=(0, 8))
        self.start_button = tk.Button(
            outer, text="开始投屏", command=self.toggle, state="disabled", width=18
        )
        self.start_button.pack(anchor="w")
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.root.after(33, self._poll_worker_status)
        if standalone:
            self._open_standalone(app_path)

    def _open_standalone(self, app_path: Path | None) -> None:
        """Start the real policy-driven simulator used by the app bundle."""
        try:
            selected = Path(app_path) if app_path is not None else _newest_app()
            if selected is None:
                raise FileNotFoundError(
                    "no built app found under out/; pass --app <jumper.app> or build one first"
                )
            self._standalone = _AppSimulator(selected, self._screen_port, self._action_port)
            self.url = self._standalone.url
            self.mirror = DesktopMirror(self.url, self.regions)
            self._message = (
                f"投屏接收地址: {self.url}/frames；动作桥: {self._standalone.action_url}"
            )
        except Exception as error:  # noqa: BLE001 - show GUI-friendly failure
            self.status.set(f"独立模拟器启动失败: {type(error).__name__}: {error}")

    def pick(self, index: int) -> None:
        try:
            diameter = int(self.diameter_var.get().strip())
        except ValueError:
            self.status.set("圆形直径必须是整数像素")
            self.diameter_entry.focus_set()
            return
        if diameter < 1:
            self.status.set("圆形直径必须大于 0")
            self.diameter_entry.focus_set()
            return
        self.root.withdraw()
        self.root.update_idletasks()
        self._capture_result = queue.Queue(maxsize=1)
        self.root.after(35, lambda: self._capture_desktop(index, diameter))

    def _capture_desktop(self, index: int, diameter: int) -> None:
        """Take the desktop snapshot off the Tk thread and poll for completion."""
        def capture() -> None:
            try:
                result = (_grab_desktop(), None)
            except Exception as error:  # noqa: BLE001 - report capture failures in the GUI
                result = (None, error)
            self._capture_result.put(result)

        threading.Thread(target=capture, name="jumper-desktop-snapshot", daemon=True).start()
        self.root.after(30, lambda: self._finish_capture(index, diameter))

    def _finish_capture(self, index: int, diameter: int) -> None:
        try:
            screenshot, error = self._capture_result.get_nowait()
        except queue.Empty:
            if self.root.winfo_exists():
                self.root.after(30, lambda: self._finish_capture(index, diameter))
            return
        if error is not None or screenshot is None:
            self._show_window()
            self._message = f"桌面捕获失败: {type(error).__name__}: {error}"
            return
        if diameter > screenshot.width or diameter > screenshot.height:
            self._show_window()
            self._message = (
                f"圆形直径 {diameter}px 大于截图尺寸 "
                f"{screenshot.width}×{screenshot.height}px"
            )
            return
        try:
            picker = RegionPicker(
                self.root,
                f"选择第 {index + 1} 个圆形屏幕区域",
                screenshot,
                self._desktop_origin,
                diameter,
            )
            self.root.wait_window(picker)
        except Exception as error:  # noqa: BLE001 - keep picker errors in the GUI
            self._show_window()
            self._message = f"区域选择失败: {type(error).__name__}: {error}"
            return
        self._show_window()
        if picker.result is not None:
            self.regions[index] = picker.result
            self._update_preview(index, screenshot)
            self._message = (
                f"已选择画面{'左' if index == 0 else '右'}屏: "
                f"({picker.result.left}, {picker.result.top}), 直径 {picker.result.size}px"
            )
            if all(region is not None for region in self.regions):
                self.start_button.configure(state="normal")
        else:
            self._message = "已取消区域选择"

    def _show_window(self) -> None:
        if self.root.winfo_exists():
            self.root.deiconify()
            self.root.lift()

    def toggle(self) -> None:
        if self.mirror.running:
            self._stop.set()
            self.mirror.running = False
            self.start_button.configure(text="开始投屏")
            self._mirror_status = "投屏已停止"
            return
        self._stop.clear()
        self.mirror.running = True
        self.start_button.configure(text="停止投屏")
        self._mirror_status = "正在连接模拟器…"
        self._worker = threading.Thread(target=self._loop, name="jumper-screen-capture", daemon=True)
        self._worker.start()

    def _loop(self) -> None:
        period = 1.0 / CAPTURE_HZ
        while not self._stop.is_set():
            started = time.monotonic()
            try:
                payload = self.mirror.frame()
                request = urllib.request.Request(
                    self.url + "/frames",
                    data=payload,
                    method="PUT",
                    headers={"Content-Type": "application/octet-stream"},
                )
                with urllib.request.urlopen(request, timeout=1.0):
                    pass
                self._mirror_status = f"投屏中（{CAPTURE_HZ:g} FPS）"
            except (OSError, urllib.error.URLError, ValueError) as error:
                self._mirror_status = f"投屏连接失败: {error}"
            self._stop.wait(max(0.0, period - (time.monotonic() - started)))

    def _update_preview(self, index: int, screenshot: Image.Image) -> None:
        region = self.regions[index]
        if region is None:
            return
        left, top, right, bottom = region.bbox()
        ox, oy = self._desktop_origin
        image = screenshot.crop((left - ox, top - oy, right - ox, bottom - oy)).convert("RGBA")
        image = image.resize((92, 92), Image.Resampling.LANCZOS)
        mask = Image.new("L", (92, 92), 0)
        from PIL import ImageDraw

        ImageDraw.Draw(mask).ellipse((0, 0, 91, 91), fill=255)
        image.putalpha(mask)
        photo = ImageTk.PhotoImage(image)
        self._preview_images[index] = photo
        canvas = self._preview_canvases[index]
        canvas.delete("preview")
        canvas.create_image(48, 48, image=photo, tags="preview")

    def _poll_worker_status(self) -> None:
        parts = []
        if self._standalone is not None:
            parts.append(self._standalone.status)
        parts.append(self._mirror_status)
        if self._message:
            parts.append(self._message)
        display = " | ".join(parts)
        if display != self._last_displayed_status:
            self._last_displayed_status = display
            self.status.set(display)
        if self.root.winfo_exists():
            self.root.after(33, self._poll_worker_status)

    def close(self) -> None:
        self._stop.set()
        if self._worker is not None and self._worker is not threading.current_thread():
            self._worker.join(timeout=2.0)
        if self._standalone is not None:
            self._standalone.close()
        self.root.destroy()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8765",
        help="live viewer's loopback endpoint (printed when play.py opens the viewer)",
    )
    parser.add_argument(
        "--standalone",
        action="store_true",
        help="start the newest built app with the real policy-driven simulator",
    )
    parser.add_argument(
        "--app",
        type=Path,
        default=None,
        help="app bundle to launch with --standalone (defaults to newest out/**/*.app)",
    )
    parser.add_argument(
        "--screen-port",
        type=int,
        default=None,
        help="fixed local screen receiver port (useful for a browser eye sync)",
    )
    parser.add_argument(
        "--action-port",
        type=int,
        default=ACTION_PORT,
        help="loopback port used by the web page to send sequential robot actions",
    )
    args = parser.parse_args()
    _enable_dpi_awareness()
    root = tk.Tk()
    ScreenCastApp(
        root,
        args.url,
        standalone=args.standalone or args.app is not None,
        app_path=args.app,
        screen_port=args.screen_port,
        action_port=args.action_port,
    )
    root.mainloop()


if __name__ == "__main__":
    main()

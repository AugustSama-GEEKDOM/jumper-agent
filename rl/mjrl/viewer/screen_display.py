"""Receive two local desktop crops and upload them to MuJoCo display textures.

The receiver is loopback-only. The GUI sends two contiguous 256 x 256 RGB images
as one HTTP PUT; MuJoCo's viewer thread uploads changed frames into the screen
textures. No display image enters the policy or sensor state.
"""

from __future__ import annotations

from contextlib import nullcontext
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SCREEN_SIZE = 256
SCREEN_CHANNELS = 3
SCREEN_COUNT = 2
SCREEN_BYTES = SCREEN_SIZE * SCREEN_SIZE * SCREEN_CHANNELS
FRAME_BYTES = SCREEN_COUNT * SCREEN_BYTES

_TEXTURE_NAMES = (
    "display_screen_left_texture",
    "display_screen_right_texture",
)
_GEOM_NAMES = (
    "display_screen_left_geom",
    "display_screen_right_geom",
)


class ScreenMirrorReceiver:
    """Loopback HTTP endpoint holding only the most recently received frame."""

    def __init__(self, port: int = 8765, host: str = "127.0.0.1") -> None:
        self.host = host
        self._lock = threading.Lock()
        self._sequence = 0
        self._payload: bytes | None = None
        receiver = self

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def _cors(self) -> None:
                """Allow the copied local web page to publish eye frames."""
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")

            def do_OPTIONS(self) -> None:  # noqa: N802 - stdlib handler API
                self.send_response(204)
                self._cors()
                self.send_header("Content-Length", "0")
                self.end_headers()

            def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
                if self.path != "/health":
                    self.send_error(404)
                    return
                with receiver._lock:
                    ready = receiver._payload is not None
                body = (
                    f'{{"ok":true,"width":{SCREEN_SIZE},"screens":{SCREEN_COUNT},'
                    f'"frame_ready":{str(ready).lower()}}}'
                ).encode("ascii")
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_PUT(self) -> None:  # noqa: N802 - stdlib handler API
                if self.path != "/frames":
                    self.send_error(404)
                    return
                try:
                    length = int(self.headers.get("Content-Length", "-1"))
                except ValueError:
                    length = -1
                if length != FRAME_BYTES:
                    self.send_error(400, f"expected {FRAME_BYTES} RGB bytes")
                    return
                payload = self.rfile.read(length)
                if len(payload) != FRAME_BYTES:
                    self.send_error(400, "incomplete frame")
                    return
                receiver.publish(payload)
                self.send_response(204)
                self._cors()
                self.send_header("Content-Length", "0")
                self.end_headers()

            def log_message(self, _format: str, *_args: object) -> None:
                return

        self._server = ThreadingHTTPServer((host, int(port)), Handler)
        self._server.daemon_threads = True
        self.port = int(self._server.server_address[1])
        self._thread = threading.Thread(
            target=self._server.serve_forever,
            kwargs={"poll_interval": 0.1},
            name="mjrl-screen-mirror-http",
            daemon=True,
        )
        self._thread.start()
        self._closed = False

    @property
    def url(self) -> str:
        """Base URL the desktop GUI should connect to."""
        return f"http://{self.host}:{self.port}"

    def publish(self, payload: bytes) -> None:
        """Store a validated pair of raw RGB frames."""
        if len(payload) != FRAME_BYTES:
            raise ValueError(f"expected {FRAME_BYTES} bytes, got {len(payload)}")
        with self._lock:
            self._sequence += 1
            self._payload = bytes(payload)

    def latest(self) -> tuple[int, bytes] | None:
        """Return the newest immutable frame pair, if one has arrived."""
        with self._lock:
            if self._payload is None:
                return None
            return self._sequence, self._payload

    def close(self) -> None:
        """Stop accepting frames; safe to call more than once."""
        if self._closed:
            return
        self._closed = True
        self._server.shutdown()
        self._server.server_close()
        if self._thread is not threading.current_thread():
            self._thread.join(timeout=2.0)


def find_screen_textures(model) -> tuple[int, int] | None:
    """Find both display textures and their geoms, allowing attached name prefixes."""
    import mujoco

    textures: dict[str, int] = {}
    for texture_id in range(model.ntex):
        name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_TEXTURE, texture_id) or ""
        basename = name.rsplit("/", 1)[-1]
        if basename in _TEXTURE_NAMES:
            textures[basename] = texture_id

    geoms: dict[str, int] = {}
    for geom_id in range(model.ngeom):
        name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_GEOM, geom_id) or ""
        basename = name.rsplit("/", 1)[-1]
        if basename in _GEOM_NAMES:
            geoms[basename] = geom_id

    if set(textures) != set(_TEXTURE_NAMES) or set(geoms) != set(_GEOM_NAMES):
        return None
    for texture_id in textures.values():
        if (
            int(model.tex_width[texture_id]) != SCREEN_SIZE
            or int(model.tex_height[texture_id]) != SCREEN_SIZE
            or int(model.tex_nchannel[texture_id]) != SCREEN_CHANNELS
        ):
            return None
    # Keep the stream-to-surface contract explicit. A model with two correctly
    # named textures but swapped materials would otherwise show the two captures
    # on the wrong physical screens without raising an error.
    rgb_role = int(mujoco.mjtTextureRole.mjTEXROLE_RGB.value)
    for side in ("left", "right"):
        geom_id = geoms[f"display_screen_{side}_geom"]
        material_id = int(model.geom_matid[geom_id])
        if material_id < 0 or int(model.mat_texid[material_id, rgb_role]) != textures[
            f"display_screen_{side}_texture"
        ]:
            return None
    return tuple(textures[name] for name in _TEXTURE_NAMES)


def upload_screen_frames(model, handle, texture_ids: tuple[int, int], payload: bytes) -> None:
    """Copy both frames under the viewer lock, then upload their textures."""
    import numpy as np

    if len(payload) != FRAME_BYTES:
        raise ValueError(f"expected {FRAME_BYTES} bytes, got {len(payload)}")

    lock_factory = getattr(handle, "lock", None)
    lock = lock_factory() if lock_factory is not None else nullcontext()
    with lock:
        for index, texture_id in enumerate(texture_ids):
            start = index * SCREEN_BYTES
            image = np.frombuffer(payload[start : start + SCREEN_BYTES], dtype=np.uint8)
            image = image.reshape(SCREEN_SIZE, SCREEN_SIZE, SCREEN_CHANNELS)
            # Desktop images start at the top row; MuJoCo's OpenGL texture starts at
            # the bottom row. The mesh UVs already follow the camera's left-to-right
            # direction, so only convert the vertical origin.
            image = np.ascontiguousarray(image[::-1]).reshape(-1)
            tex_start = int(model.tex_adr[texture_id])
            tex_end = tex_start + SCREEN_BYTES
            model.tex_data[tex_start:tex_end] = image

    # Handle.update_texture takes the same viewer lock internally, so call it only
    # after releasing the lock above (it also performs the GL upload).
    for texture_id in texture_ids:
        handle.update_texture(texture_id)


__all__ = [
    "FRAME_BYTES",
    "SCREEN_CHANNELS",
    "SCREEN_COUNT",
    "SCREEN_SIZE",
    "ScreenMirrorReceiver",
    "find_screen_textures",
    "upload_screen_frames",
]

"""The desktop mirror crops only the two selected circles and launches the app runtime."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw
import pytest

from assets.jumper.tools import screen_cast


def _region(center: tuple[int, int], diameter: int) -> screen_cast.Region | None:
    return screen_cast._region_from_center(
        center,
        diameter,
        image_bounds=(100, 50, 500, 350),
        image_offset=(100, 50),
        scale=0.5,
        screenshot_size=(800, 600),
        desktop_origin=(-800, 0),
    )


def test_fixed_diameter_circle_maps_mouse_center_to_source_pixels() -> None:
    region = _region((300, 200), 160)

    assert region is not None
    assert region.bbox() == (-480, 220, -320, 380)


def test_fixed_diameter_circle_clamps_to_capture_edges() -> None:
    region = _region((105, 55), 160)

    assert region is not None
    assert region.bbox() == (-800, 0, -640, 160)


def test_circle_larger_than_capture_is_rejected() -> None:
    assert _region((300, 200), 801) is None


def test_mirror_crops_two_regions_in_left_then_right_order(monkeypatch) -> None:
    desktop = Image.new("RGB", (64, 64), "black")
    draw = ImageDraw.Draw(desktop)
    draw.rectangle((4, 8, 19, 23), fill=(220, 20, 30))
    draw.rectangle((28, 32, 43, 47), fill=(15, 180, 70))
    monkeypatch.setattr(screen_cast, "_grab_desktop", lambda: desktop)
    monkeypatch.setattr(screen_cast, "_desktop_origin", lambda: (0, 0))
    regions = [screen_cast.Region(4, 8, 16), screen_cast.Region(28, 32, 16)]

    payload = screen_cast.DesktopMirror("http://127.0.0.1:8765", regions).frame()
    frame_bytes = screen_cast.SCREEN_SIZE * screen_cast.SCREEN_SIZE * 3

    assert len(payload) == frame_bytes * 2
    assert tuple(payload[:3]) == (220, 20, 30)
    assert tuple(payload[frame_bytes : frame_bytes + 3]) == (15, 180, 70)


def test_mirror_refuses_to_start_until_both_regions_are_selected() -> None:
    mirror = screen_cast.DesktopMirror("http://127.0.0.1:8765", [None, None])

    with pytest.raises(ValueError, match="select both"):
        mirror.frame()


def test_standalone_launches_play_app_and_keeps_the_live_viewer() -> None:
    app_path = Path("out/bundle_example/jumper.app")

    command = screen_cast._simulator_command(app_path)

    assert command[:3] == [
        str(screen_cast.sys.executable),
        str(screen_cast.REPO / "scripts" / "play.py"),
        "--app",
    ]
    assert str(app_path.resolve()) in command
    assert "--num_envs" in command and "1" in command
    assert "--viewer-env-num" in command
    assert "--no-viewer-ui" in command
    assert "--headless" not in command
    response_index = command.index("--app-keyboard-full-after-s")
    assert command[response_index + 1] == "0.3"

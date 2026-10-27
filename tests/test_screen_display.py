"""The simulator's expression screens stay visual-only and accept live frames."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from contextlib import nullcontext
from pathlib import Path

import numpy as np
import pytest

mujoco = pytest.importorskip("mujoco")

from mjrl.viewer.screen_display import (  # noqa: E402
    FRAME_BYTES,
    SCREEN_BYTES,
    SCREEN_SIZE,
    ScreenMirrorReceiver,
    find_screen_textures,
    upload_screen_frames,
)

REPO = Path(__file__).resolve().parents[1]
MODEL_PATH = REPO / "assets" / "jumper" / "jumper.xml"


@pytest.fixture(scope="module")
def model():
    return mujoco.MjModel.from_xml_path(str(MODEL_PATH))


def _id(model, kind, name: str) -> int:
    value = mujoco.mj_name2id(model, kind, name)
    assert value >= 0
    return value


def test_expression_screens_match_hardware_size_without_changing_dynamics(model) -> None:
    """The display faces add no mass, collision, bodies, joints, or coordinates."""
    radius = 0.9 * 0.0254 / 2
    left = _id(model, mujoco.mjtObj.mjOBJ_GEOM, "display_screen_left_geom")
    right = _id(model, mujoco.mjtObj.mjOBJ_GEOM, "display_screen_right_geom")
    left_body = _id(model, mujoco.mjtObj.mjOBJ_BODY, "display_module_link")

    assert model.geom_size[left, 1] == pytest.approx(radius)
    assert model.geom_size[right, 1] == pytest.approx(radius)
    assert model.geom_pos[left, 1] < 0, "front-view left is the model's -Y side"
    assert model.geom_pos[right, 1] > 0, "front-view right is the model's +Y side"
    for geom_id in (left, right):
        assert model.geom_contype[geom_id] == 0
        assert model.geom_conaffinity[geom_id] == 0
        assert model.geom_group[geom_id] == 2

    # These hardware values come from the model's pre-existing inertial elements.
    # A display geom with nonzero mass would change both the module and robot totals.
    assert model.body_mass[left_body] == pytest.approx(0.0228873)
    assert model.body_inertia[left_body] == pytest.approx(
        [2.02160e-05, 1.78123e-05, 2.44316e-06]
    )
    assert model.body_mass.sum() == pytest.approx(2.54296197)
    assert (model.nbody, model.njnt, model.nq, model.nv) == (42, 23, 29, 28)


def test_expression_screens_render_texture_without_lighting_stripes(model) -> None:
    """Screen pixels must not inherit shading from the thin disk's shared normals."""
    for name in ("display_screen_left_geom", "display_screen_right_geom"):
        geom_id = _id(model, mujoco.mjtObj.mjOBJ_GEOM, name)
        material_id = int(model.geom_matid[geom_id])
        assert model.mat_emission[material_id] == pytest.approx(1.0)
        assert model.mat_specular[material_id] == pytest.approx(0.0)
        assert model.mat_reflectance[material_id] == pytest.approx(0.0)
        # A solid pixel face has no extruded side faces to cast segmented
        # shadows across the live texture at oblique viewer angles.
        mesh_id = int(model.geom_dataid[geom_id])
        start = int(model.mesh_vertadr[mesh_id])
        stop = start + int(model.mesh_vertnum[mesh_id])
        assert np.ptp(model.mesh_vert[start:stop, 0]) == pytest.approx(0.0)


def test_texture_upload_keeps_left_right_order_and_upright_rows(model) -> None:
    texture_ids = find_screen_textures(model)
    assert texture_ids is not None

    first = np.zeros((SCREEN_SIZE, SCREEN_SIZE, 3), dtype=np.uint8)
    second = np.zeros_like(first)
    first[0, :, :] = (11, 12, 13)
    first[-1, :, :] = (21, 22, 23)
    second[0, :, :] = (31, 32, 33)
    second[-1, :, :] = (41, 42, 43)
    payload = first.tobytes() + second.tobytes()

    class Handle:
        updated: list[int]

        def __init__(self) -> None:
            self.updated = []

        def lock(self):
            return nullcontext()

        def update_texture(self, texture_id: int) -> None:
            self.updated.append(texture_id)

    handle = Handle()
    upload_screen_frames(model, handle, texture_ids, payload)
    assert handle.updated == list(texture_ids)

    for texture_id, top, bottom in zip(
        texture_ids, ((11, 12, 13), (31, 32, 33)), ((21, 22, 23), (41, 42, 43))
    ):
        start = int(model.tex_adr[texture_id])
        texture = model.tex_data[start : start + SCREEN_BYTES].reshape(
            SCREEN_SIZE, SCREEN_SIZE, 3
        )
        assert tuple(texture[0, 0]) == bottom
        assert tuple(texture[-1, 0]) == top


def test_loopback_receiver_validates_and_publishes_complete_pairs() -> None:
    receiver = ScreenMirrorReceiver(port=0)
    try:
        with urllib.request.urlopen(receiver.url + "/health", timeout=2.0) as response:
            assert json.load(response) == {
                "ok": True,
                "width": SCREEN_SIZE,
                "screens": 2,
                "frame_ready": False,
            }

        payload = bytes((index % 251 for index in range(FRAME_BYTES)))
        request = urllib.request.Request(
            receiver.url + "/frames",
            data=payload,
            method="PUT",
            headers={"Content-Type": "application/octet-stream"},
        )
        with urllib.request.urlopen(request, timeout=2.0) as response:
            assert response.status == 204
        latest = receiver.latest()
        assert latest is not None
        assert latest[0] == 1
        assert latest[1] == payload

        bad_request = urllib.request.Request(
            receiver.url + "/frames", data=b"short", method="PUT"
        )
        with pytest.raises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(bad_request, timeout=2.0)
        assert error.value.code == 400
        assert receiver.latest() == latest
    finally:
        receiver.close()

# Simulator expression-screen mirroring

The Jumper MJCF includes two render-only circular display faces. Their physical
diameter is 0.9 inch (22.86 mm), matching the hardware table. They use 256 x 256
RGB textures for the simulator stream. The display faces have no collision mask
and no mass, so adding them does not change the robot's inertial or contact model.

Install the optional desktop-capture dependency and development checks in the
Train environment:

```bash
pip install -e ".[dev,screen-mirror]"
```

For a policy-driven walking simulator, launch the screen-cast GUI directly. It
starts the newest built `.app` under `out/` with `play --app`, which loads the
bundle's locomotion policy and the same keyboard controls as the deployed app:

```bash
python assets/jumper/tools/screen_cast.py --standalone
```

Or choose a bundle explicitly:

```bash
python assets/jumper/tools/screen_cast.py --app out/bundle_example/jumper.app
```

The simulator starts in the app's default locomotion mode, using the normal
world and ground from the task. Click its window to focus it, then hold W/A/S/D
to send walking commands through the built-in controller and gait policy. The
GUI also supports connecting to a simulator that is already running. Start a
replay with one visible environment; the live viewer prints a loopback endpoint
when the model contains both display faces:

```bash
python scripts/play.py --task jumper.flat --agent zero --backend native \
    --num_envs 1 --viewer-env-num 1
```

In a second terminal, start the desktop GUI without `--standalone`:

```bash
python assets/jumper/tools/screen_cast.py
```

Enter a source diameter in desktop pixels, then click each screen-selection
button. The GUI hides itself, captures the desktop on a background thread, and
shows that capture in a selection overlay. Move the mouse to align the live
circle and click once to confirm it; press Esc to cancel. The circle maps to a
square crop of exactly the entered diameter, and the preview is circular. After
both regions are selected, press **开始投屏**.

The GUI captures both regions at 10 FPS, resizes them to the simulator texture
size, and sends one loopback HTTP frame containing the two RGB images. The
left/right labels follow a front-facing view of the robot: when looking at its
display module, the visible left screen is on model -Y and the visible right
screen is on +Y.

Standalone mode chooses an available loopback port and passes it to the
simulator automatically. When connecting to an existing replay, the viewer
endpoint defaults to `http://127.0.0.1:8765`. Set `MJRL_SCREEN_MIRROR_PORT`
before starting replay if that port is occupied, then pass the same URL with
`--url` to the GUI. The endpoint accepts only complete two-screen RGB frames on
loopback; images are kept in memory and are not written to disk.
`GET /health` reports whether a frame has arrived.

The source crop is a square and is resized to the simulator's square texture;
the physical circular mask comes from the model geometry, so pixels outside the
circle are not visible on the simulated display. This feature mirrors the
desktop into the simulator viewer only; it does not add a display sensor to the
policy observations or provide a hardware display protocol.

## AI action bridge

Standalone mode also starts a loopback action endpoint on port `18766` by default. The copied
Tiaotiao page reads that endpoint from its `?sync=` URL and sends validated action steps in order.
The browser shows each step and its progress in the debug panel. `walk` holds the same W/A/S/D
controls as a person; dance, gesture and jump actions use their existing simulator shortcuts, and
the bridge uses key `0` to finish or cancel an action. Change the port with `--action-port` if it
is occupied. This action API is for the local simulator and is not a hardware control endpoint.

See [Tiaotiao development](TIAOTIAO_DEVELOPMENT.md) for the action schema, timing limits,
development checks and the full-project packaging procedure.

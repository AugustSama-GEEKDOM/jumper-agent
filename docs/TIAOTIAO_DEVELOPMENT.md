# Tiaotiao web and simulator development

[Project guide](PROJECT_GUIDE.md) · [简体中文](TIAOTIAO_DEVELOPMENT.zh.md)

This guide documents the Tiaotiao browser face and its connection to the Jumper simulator. The
whole-project architecture and checks are in [DEVELOPMENT.md](DEVELOPMENT.md).

## Windows integrated demo

The integrated launcher expects Windows 10/11, Python 3.11 at
LOCALAPPDATA\Programs\Python\Python311, Node.js 18 or newer, and Microsoft Edge. It uses the
Python installation at that path for both the screen-cast GUI and the child simulator. Install
the project and optional image-capture dependency into that interpreter:

~~~powershell
$python = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'
& $python -m pip install -e '.[screen-mirror]'
.\start-tiaotiao-web-simulator.ps1
~~~

The launcher starts the Node service on loopback port 4183, the Tk screen-cast GUI, the
policy-driven MuJoCo simulator, and Edge. The screen receiver uses port 18765 and the local
action bridge uses port 18766. The simulator loads the example app bundle under out.

The service and the viewer can also be started independently. To run only the browser app, open
web/tiaotiao and execute node server.mjs. To start the simulator and screen GUI without the
browser launcher, use:

~~~powershell
python assets/jumper/tools/screen_cast.py --standalone --app out/bundle_example/jumper.app
~~~

The GUI status line reports simulator startup and the stream endpoint. Click the MuJoCo window
before typing movement keys. Use W/A/S/D for walking, 1–4 for mapped gestures, Ctrl+1–4 for
dances, Space for jump, and 0 to end the current action. The optional keypad fallback is shown in
the GUI. The exact mapping belongs to the example app and its controller configuration.

## Desktop screen capture

The GUI captures a desktop snapshot on a background thread so the window remains responsive.
Enter the diameter in source pixels, select the left region, then the right region. In each
selection window, the circle follows the pointer over the visible desktop image. Click once to
confirm or press Esc to cancel. The square crop inside the circle is resized to 256 by 256 RGB;
the model's circular surface masks the corners.

After both regions are selected, start mirroring. The GUI captures at 10 frames per second and
sends the left and right crops together to the simulator's loopback frame endpoint. Images are
held in memory and are not written to disk by this capture path. If the monitor layout changes,
select both regions again.

There is also a browser frame producer: the integrated page renders its current eyes or media
screens and sends frames to the same simulator receiver at about 12 frames per second. These
producers overwrite the same pair of textures. Run one producer at a time for a simulator:

- For browser expression sync, open the page with the launcher's sync query and leave desktop
  capture stopped.
- For arbitrary desktop regions, run a page without a sync query and start desktop capture from
  the GUI.

The simulator receiver's health route reports whether a paired frame has arrived. It does not
identify which producer sent the latest frame.

## Web application

The browser page uses HTML, CSS, and JavaScript without a bundler or npm install step:

| File | Role |
|---|---|
| index.html | Eye SVG, music and weather layouts, controls, and debug panel |
| style.css | Eye geometry, animation, responsive layout, and media views |
| app.js | Expression state, wake-word recognition, speech synthesis, API calls, screen sync, and action queue |
| server.mjs | Static server, local configuration, API proxies, response validation, and action normalization |
| .env.example | Names of optional local settings, with credentials and model left blank |

Copy .env.example to .env inside web/tiaotiao for local configuration. Keep the AI endpoint,
secret, and model local; the public example does not supply an endpoint or a default model.
Restart Node after changing its environment. The application recognizes the wake phrase and
common speech-recognition variants configured in app.js, including 你好跳跳, 你好挑挑, and
你好调调.

For the browser alone:

~~~powershell
Set-Location web/tiaotiao
node --check app.js
node --check server.mjs
node server.mjs
~~~

Speech recognition requires a supported browser and microphone permission. A successful page
load does not establish that the browser has microphone access or that an upstream service is
available.

## Sequential action protocol

For a requested robot motion, the assistant response contains one ACTION record followed by
spoken text. The browser validates the record, removes it from the spoken response, and queues
each step until the bridge returns:

~~~json
[[ACTION:{"steps":[
  {"type":"walk","direction":"forward","steps":2},
  {"type":"walk","direction":"left","steps":2},
  {"type":"dance","name":"crab"},
  {"type":"gesture","name":"hello"}
]}]]
~~~

Supported types and limits:

| Type | Values | Bridge behavior |
|---|---|---|
| walk | direction: forward, backward, left, right; steps: 1–10 | Holds W/A/S/D for a bounded time per step |
| dance | crab, brazilian, maze, dream_wings | Starts the mapped dance and sends cancel after its configured interval |
| gesture | hello, bow, paw, salute | Starts the mapped gesture and sends cancel after its configured interval |
| jump | no extra fields | Starts jump and sends cancel after its configured interval |
| stop | no extra fields | Sends the existing action-cancel key |

The bridge validates action types and directions before injecting keys. It binds to loopback and
uses Windows keyboard injection; it is not a remote API and must not be exposed outside the local
machine. The browser queue reports request progress and bounded timers. The Rust controller does
not currently return a per-motion completion event through this bridge.

The web server also has deterministic parsing for common action phrases if a valid action record
is missing. This is a fallback for the supported movement and gesture vocabulary, not a general
language-to-control runtime.

## Checks and troubleshooting

Run the checks relevant to changed files:

~~~powershell
node --check web/tiaotiao/app.js
node --check web/tiaotiao/server.mjs
python -m py_compile assets/jumper/tools/screen_cast.py
python -m ruff check assets/jumper/tools/screen_cast.py
python -m pytest tests/test_screen_cast.py tests/test_screen_display.py tests/test_web_host.py -q
~~~

- If the GUI cannot capture a screen, confirm Pillow is installed in the launcher's Python and
  retry region selection after the monitor layout is stable.
- If the simulator window does not appear, inspect the GUI status and the output from
  scripts/play.py; verify the example app exists and the same Python environment has the project
  dependencies.
- If a browser frame and desktop crop keep replacing each other, stop one producer. Only one
  source should write a simulator receiver at a time.
- If the browser action list stays pending, verify the action bridge is listening on the port
  derived from the screen sync URL and that the MuJoCo window is open.
- If voice input is unavailable, use a supported Edge build, grant microphone permission to the
  local page, and confirm the OS has selected the intended microphone.

For a full source ZIP, use the repository-root package-project.ps1 script. It excludes .env
files, local browser profiles, logs, Python caches, checkpoints, and other ZIP archives. Inspect
the resulting archive before publishing it.

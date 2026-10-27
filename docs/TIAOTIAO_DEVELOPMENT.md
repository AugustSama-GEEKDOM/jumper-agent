# Tiaotiao web and simulator development

This copy adds a browser-based robot face, desktop screen mirroring, and sequential AI action
control to the Jumper simulator. The original Jumper checkout is a separate directory; develop
and test these additions from this copy.

## Components

- `web/tiaotiao/server.mjs` serves the page and proxies chat, weather, and music requests. It
  validates the model's `ACTION` control payload and has a deterministic parser for common
  Chinese movement and gesture requests when the model omits or malforms that payload.
- `web/tiaotiao/app.js` parses `ACTION` rows, displays the task list, sends one action at a time,
  and marks each task pending, running, done, or failed.
- `assets/jumper/tools/screen_cast.py` starts the policy-driven `play --app` simulator, mirrors
  the selected desktop circles, and exposes the simulator's loopback action bridge.
- `rl/mjrl/app_play.py` owns the simulator keyboard/FSM path. The bridge sends the same mapped
  controls the viewer already accepts, so movement uses the bundled gait policy.
- `start-tiaotiao-web-simulator.ps1` launches the web server, cast GUI, simulator, and Edge page.

## Local setup and launch

The Windows launcher expects Python 3.11 at `%LOCALAPPDATA%\Programs\Python\Python311`, Node.js,
Microsoft Edge, the optional `screen-mirror` Python dependencies, and a built `.app` under `out/`.
Install the Python project and screen-capture extra in the intended environment:

```powershell
python -m pip install -e ".[screen-mirror]"
```

Copy `web/tiaotiao/.env.example` to `web/tiaotiao/.env` and enter local API credentials there.
The public example leaves the AI API URL and default model blank. Set OPENAI_API_URL, OPENAI_API_KEY, and OPENAI_MODEL only in the local .env when enabling chat; never commit local credentials.
Never commit `.env`; use `.env.example` to document variable names without values. Start all
components with:

```powershell
./start-tiaotiao-web-simulator.ps1
```

The browser opens at `http://127.0.0.1:4183/`. The screen receiver listens on port `18765`, and
the action bridge listens on `http://127.0.0.1:18766/actions`. Both simulator endpoints bind to
loopback. The page can also be run without the simulator, but actions then remain unavailable.

## Action protocol

The model returns a control line followed by speech. The browser removes that line before speech
playback and sends each step only after the prior simulator action returns:

```text
[[ACTION:{"steps":[
  {"type":"walk","direction":"forward","steps":2},
  {"type":"walk","direction":"left","steps":2},
  {"type":"dance","name":"crab"},
  {"type":"gesture","name":"hello"}
]}]]
收到，我马上执行。
```

Supported steps are:

| Type | Fields | Behavior |
|---|---|---|
| `walk` | `direction`: `forward`, `backward`, `left`, `right`; `steps`: 1–10 | Holds the matching W/S/A/D control for about 620 ms per step. |
| `dance` | `name`: `crab`, `brazilian`, `maze`, `dream_wings` | Starts the mapped Ctrl+1–4 dance and ends it with the existing 0 cancel key after about six seconds. |
| `gesture` | `name`: `hello`, `bow`, `paw`, `salute` | Starts the mapped 1–4 gesture and ends it with 0 after about 2.2 seconds. |
| `jump` | none | Starts Space and cancels after about 1.5 seconds. |
| `stop` | none | Sends the existing 0 action-cancel key. |

The GUI reports action completion from the bridge response and its configured duration. It does
not claim to read the controller's internal motion-complete event; timings may need adjustment if
the bundled motion clips or simulator speed change. The bridge is Windows-specific for injected
keyboard input. Keep action steps bounded and do not add arbitrary shell commands or key names to
the protocol.

## Development checks

Run these checks after changing the browser or bridge:

```powershell
node --check web/tiaotiao/app.js
node --check web/tiaotiao/server.mjs
python -m py_compile assets/jumper/tools/screen_cast.py
ruff check assets/jumper/tools/screen_cast.py
```

With the launcher running, `GET http://127.0.0.1:18765/health` should report `frame_ready: true`
after the first mirrored frame. Send a harmless stop step to verify the bridge without moving
the robot:

```powershell
Invoke-RestMethod http://127.0.0.1:18766/actions -Method Post `
  -ContentType 'application/json' -Body '{"type":"stop"}'
```

Send a continuous phrase to `POST /api/chat` and verify that the returned `ACTION` steps preserve
the spoken order. For example, “先往前走两步再往左走两步再跳个舞最后再打一下招呼” should
produce forward, left, dance, and hello steps in that order. The dashboard should show each
current item and overall completion progress.

## Packaging and credentials

Use the root `package-project.ps1` to create a source archive. It excludes local environment
files, browser profiles, logs, build caches, and training checkpoints while retaining the project
source and required example app bundle. Inspect the resulting archive before sharing it. Keep API
keys in the local `.env` file; if a key was ever committed or distributed, revoke and replace it.

The app's `web/tiaotiao/package-project.ps1` creates a smaller web-only package; it is different
from the root full-project archive.

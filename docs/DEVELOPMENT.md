# Development guide

[Home](../README.md) · [简体中文](DEVELOPMENT.zh.md)

Jumper Agent is a feature branch derived from
[KingKongRobotics/jumper](https://github.com/KingKongRobotics/jumper). The repository combines
the robot-training and deployment code with the Tiaotiao web application and simulator display
tools. This guide describes the seams between those parts and the checks that catch regressions.
For a Windows demo walkthrough, see [Tiaotiao web and simulator development](TIAOTIAO_DEVELOPMENT.md).

## Repository map

| Path | Responsibility |
|---|---|
| assets/jumper | Jumper MJCF, meshes, model tools, and desktop screen-cast GUI |
| tasks/jumper | Task configurations, locomotion and reference-motion behaviors |
| scenes | Training and replay environments |
| rl/mjrl | Backend selection, simulation bridge, viewer, operator, and app playback |
| rl/mjlab and rl/rsl_rl | Vendored framework packages used by the local Python environment |
| controller | Input vocabulary and host-independent input readers |
| deploy | Bundle schema, controller, web runtime, board runtime, and conversion workflow |
| web/tiaotiao | Browser eyes, speech interaction, API proxy, and action queue |
| scripts | Stable training, replay, export, and deployment entry points |
| out/bundle_example | Versioned example .app and its runnable bundle payload |
| tests | Framework, model, simulator, bundle, browser-host, and screen-display checks |
| docs | Project workflows and component-specific references |

The repository intentionally keeps the upstream training framework intact as a usable part of
the project. Browser display code and simulator screen mirroring are additional components; they
do not replace the training or deployment APIs.

## Runtime components

### Robot and display model

The MuJoCo model lives under assets/jumper. Its two circular expression-screen surfaces use
render-only RGB textures; the physical display dimensions follow the project hardware table.
Texture updates affect rendering only. They do not alter the contact model, policy observations,
or the robot's display hardware.

### Simulator and movement

scripts/play.py is the replay entry point. With an .app bundle it loads the bundled controller and
policies. The screen-cast GUI starts this same player in a child process when run with
--standalone, so walking goes through the mapped controls and gait policy. It is not a separate
kinematic mock-up.

The screen-cast GUI lives in assets/jumper/tools/screen_cast.py. It captures the desktop outside
the physics/render loop, lets the user choose two square source crops using a fixed-diameter
circle overlay, resizes each crop for the model texture, and streams the paired RGB frame to a
loopback HTTP receiver. Its capture rate is 10 frames per second. The integrated player caps its
viewer at 30 frames per second.

The player and screen receiver use a loopback-only stream endpoint. In the integrated Windows
launcher the screen receiver uses port 18765; an action bridge uses port 18766. The standalone
screen tool can select a free receiver port when no fixed screen port is supplied.

### Browser face and local service

web/tiaotiao/index.html defines the browser interface, style.css owns its layout and animation,
and app.js handles expressions, voice recognition, speech output, weather/music screens, browser
screen rendering, and the sequential action queue. server.mjs serves static files and proxies
the configured upstream services. The browser never receives the AI credential.

When opened with a sync URL, the page rasterizes each eye or media view to a separate 256 by 256
RGB canvas and sends a paired frame to the simulator receiver. The desktop-capture GUI and the
browser sync are independent frame producers. Do not run both against the same receiver at once:
the most recent frame from either producer replaces the other image.

### Action path

The web server validates the assistant's ACTION payload. The browser displays the steps and sends
them in order to the loopback action bridge. The bridge maps each allowed action to existing
simulator keyboard controls. Walking holds a direction key for a bounded duration; gestures,
dances, and jumps invoke the mapped motion and then use the existing cancel key.

The bridge sends keyboard input to the simulator window on Windows. It is not reachable as a
hardware transport and must not be exposed on a public interface. The page's progress reflects
bridge responses and configured action durations, not a motion-complete signal from the policy
controller.

## Environment and local runs

The Python project supports Python 3.10 through 3.13. Use the project install so imports resolve
from both the root package tree and rl:

~~~powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e '.[dev,screen-mirror]'
python -m pytest tests/test_screen_cast.py tests/test_screen_display.py -q
~~~

The browser service uses Node.js 18 or newer and has no third-party npm runtime dependencies:

~~~powershell
Set-Location web/tiaotiao
node --check app.js
node --check server.mjs
node server.mjs
~~~

For the integrated launcher, the current PowerShell script resolves Python 3.11 from the
per-user installation path under LOCALAPPDATA. Install the editable project and Pillow capture
extra into that exact interpreter, or adjust the launcher before using another environment.

## Configuration and credentials

The browser service reads web/tiaotiao/.env. Start from
web/tiaotiao/.env.example and keep the local file untracked. The AI endpoint, credential, and
model settings in the public example are blank; there is no bundled endpoint or default model.
Weather and music provider credentials are separate settings. Never put credentials in browser
JavaScript, screenshots, logs, a source archive, or a commit.

The repository root .env configures training defaults and is distinct from the browser service
configuration. Both local configuration files are ignored by Git and excluded from the source
archive. Check a candidate archive before distribution.

## Validation

Run checks that match the changed seam, then the repository suite:

~~~powershell
node --check web/tiaotiao/app.js
node --check web/tiaotiao/server.mjs
python -m py_compile assets/jumper/tools/screen_cast.py
python -m ruff check .
python -m pytest tests/ -q
~~~

The screen-cast test covers region math and the capture contract. The screen-display test checks
the two render-only model screens. The web-host tests cover the controller's browser target.
These checks do not prove GPU training speed, motion quality, live microphone behavior, external
provider availability, or operation on physical hardware.

For a live screen check, run the standalone screen tool and inspect the local health route. A
ready flag means a complete paired frame arrived; it does not imply that the image came from the
intended source. Check the browser query string or GUI capture status when diagnosing competing
frame sources.

## Source archive and contribution

Run package-project.ps1 from the repository root to write a complete source ZIP outside the
checkout. The script excludes Git internals, local .env files, browser profiles, logs, caches,
training checkpoints, and ZIP files. It keeps the project source and the versioned example app
bundle. A packaged source archive is distinct from a deployable robot bundle.

Before committing:

1. Review git diff and git status; ensure local credentials and generated recordings are absent.
2. Run the focused checks for the changed component and the complete test suite for cross-cutting
   changes.
3. Update the corresponding English and Chinese documentation together.
4. Run tools/checks/stamp_translations.py --write after editing the translation.
5. Run git diff --check and verify relative Markdown links.

Read [CLAUDE.md](../CLAUDE.md) for framework invariants, [CONTRIBUTING.md](../CONTRIBUTING.md)
for repository conventions, and [deployment guidance](../deploy/README.md) before changing a
bundle consumer or hardware runtime.

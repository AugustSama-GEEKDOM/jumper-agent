# Jumper Agent project guide

[Home](../README.md) · [简体中文](PROJECT_GUIDE.zh.md)

Jumper Agent is a feature branch derived from
[KingKongRobotics/jumper](https://github.com/KingKongRobotics/jumper). It brings the inherited
robot-training and simulation code together with the Tiaotiao web app, the two-screen simulator
display, and the desktop mirroring GUI.

## Pick a starting point

| Goal | Start here |
|---|---|
| Launch the web eyes and simulator on Windows | [Integrated demo](TIAOTIAO_DEVELOPMENT.md#windows-integrated-demo) |
| Select two desktop areas for the simulated displays | [Screen capture workflow](TIAOTIAO_DEVELOPMENT.md#desktop-screen-capture) |
| Run a motion bundle in MuJoCo | [Replay with an app bundle](../deploy/README.md) |
| Train a policy | [Environment setup](USAGE.md#setting-up), then [the tutorial](TUTORIAL.md) |
| Change the browser face or its server | [Web development](TIAOTIAO_DEVELOPMENT.md#web-application) |
| Change the simulator or screen receiver | [Architecture](DEVELOPMENT.md#runtime-components) |
| Export for a supported host | [Deployment guide](../deploy/README.md) |

Appearance and scene generation remain a separate workflow in the independent
[jumper-design repository](https://github.com/KingKongRobotics/jumper-design). The current
integration boundary and its setup instructions are recorded in [WORKFLOWS.md](WORKFLOWS.md).

## Install the training and simulator environment

The Python project supports Python 3.10 through 3.13. An editable install is required because
the local framework packages are split between the repository root and rl.

~~~powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e '.[dev,screen-mirror]'
python scripts/train.py --list
~~~

The desktop integrated launcher currently invokes the per-user Python 3.11 installation at
LOCALAPPDATA\Programs\Python\Python311. If using a different interpreter or virtual environment,
adjust the Python path in start-tiaotiao-web-simulator.ps1 so the GUI and its simulator child
use the environment where this repository was installed.

For GPU training, install a PyTorch build that matches the local CUDA setup before installing the
project. For CPU-only replay, the screen-cast GUI starts the sample app with the native MuJoCo
backend. Consult [AGENT_SETUP.md](AGENT_SETUP.md) and [USAGE.md](USAGE.md) for platform-specific
environment details.

## Configure and launch the browser app

The web application is served by Node.js and listens on loopback port 4183 by default. Install
Node.js 18 or newer, then copy web/tiaotiao/.env.example to web/tiaotiao/.env if local API
configuration is needed. The public example leaves the AI endpoint, key, and model blank.
Weather and music also require the credentials for their respective providers.

To run only the web app:

~~~powershell
Set-Location web/tiaotiao
node server.mjs
~~~

To run the full Windows demo from the repository root, use
start-tiaotiao-web-simulator.ps1. The launcher opens the local web page and starts the simulator
with its screen and action endpoints bound to loopback. Microsoft Edge is used for browser speech
recognition and the page launcher.

## How the two displays are used

The robot model includes two 0.9-inch circular display surfaces with 256 by 256 RGB textures.
The simulator viewer applies the circular mask. There are two ways to supply the images:

- Browser sync renders each eye, music view, or weather view into a separate round-screen frame.
- Desktop mirroring captures two selected desktop regions and sends their RGB crops to the
  simulator receiver.

Both sources write simulator display frames. Use only one active producer for a given simulator
receiver at a time. The [web and simulator guide](TIAOTIAO_DEVELOPMENT.md) explains both paths
and the frame endpoints. The textures do not feed the policy observation and are not a hardware
display protocol.

## Continue into a focused workflow

- [Training commands and assets](USAGE.md)
- [A train-to-bundle walkthrough](TUTORIAL.md)
- [Keyboard and gamepad controls](CONTROLS.md)
- [Screen mirroring implementation](SCREEN_MIRROR.md)
- [Repository development and validation](DEVELOPMENT.md)
- [Controller deployment](../deploy/README.md)

## License and project boundaries

Jumper Agent is a branch of the upstream Jumper project, with additional browser and simulator
integration. Project licensing and third-party notices are in [LICENSE](../LICENSE) and
[NOTICE](../NOTICE). Training output, downloaded media, external service responses, and physical
robot behavior have their own provenance and licensing considerations.

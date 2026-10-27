<!-- tracks: README.md @ sha256:85e3a5b25b92c84f -->

![跳跳 Agent](docs/media/jumper-hero-zh.png)

# Jumper Agent

[English](README.md) | **简体中文**

> **项目来源：** 本仓库是
> [KingKongRobotics/jumper](https://github.com/KingKongRobotics/jumper) 的 GitHub fork。
> 当前项目分支为 \`jumper-agent\`，保留机器人训练与 MuJoCo 仿真基础，并集成跳跳网页表情、
> 双圆屏投屏和本机 AI 动作控制。

这个仓库把机器人模型、动作工具、模拟器、网页眼睛和桌面投屏流程放在一起。
仓库地址：[AugustSama-GEEKDOM/jumper-agent](https://github.com/AugustSama-GEEKDOM/jumper-agent)。

## 项目包含什么

- 22 关节跳跳模型、MuJoCo 场景、运动任务、训练、回放、策略导出和控制器动作包。
- 由策略驱动的桌面模拟器。模型上有两个与原机 0.9 英寸圆屏规格对应的渲染屏幕。
- Windows 圆形区域投屏 GUI：分别选择电脑桌面上的两个圆形画面，传输到模拟器屏幕。
- 跳跳网页眼睛：包括动画表情、语音交互、天气与音乐界面，以及网页到模拟器的表情同步。
- 可选的 AI 动作队列：按顺序执行有限的移动和内置动作，并在网页显示进度。

投屏只更新模拟器的显示纹理，不会增加摄像头观测或真实硬件显示传输。AI 动作桥只控制本机
模拟器，不是机器人硬件控制 API。

## 在 Windows 启动整合演示

整合启动器需要 Windows 10/11、安装在默认用户目录的 Python 3.11、Node.js 18 或更新版本、
Microsoft Edge，以及仓库 out 目录下可用的示例动作包。请把 Python 依赖安装到启动器调用的
同一个 Python 3.11 环境中：

~~~powershell
$python = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'
& $python -m pip install -e '.[screen-mirror]'
.\start-tiaotiao-web-simulator.ps1
~~~

启动器会打开本机网页，同时启动模拟器和投屏窗口。在 GUI 中输入桌面圆形画面的直径，
依次选择两个区域，然后开始投屏。配置、控制和排错方式见
[网页与模拟器开发指南](docs/TIAOTIAO_DEVELOPMENT.zh.md)。

## 训练或回放动作

根据 CPU 或 NVIDIA GPU 创建合适的环境，然后安装本仓库：

~~~bash
python -m venv .venv
python -m pip install -e '.[dev]'
python scripts/train.py --list
python scripts/play.py --task jumper.tripod
~~~

环境和工作流选择见[项目指南](docs/PROJECT_GUIDE.zh.md)；仓库结构、检查和贡献流程见
[开发指南](docs/DEVELOPMENT.zh.md)。

## 文档

| 指南 | 内容 |
|---|---|
| [项目指南](docs/PROJECT_GUIDE.zh.md) | 环境准备、主要模块和工作流入口 |
| [开发指南](docs/DEVELOPMENT.zh.md) | 架构、本机检查、打包和参与开发 |
| [网页与模拟器指南](docs/TIAOTIAO_DEVELOPMENT.zh.md) | 网页眼睛、区域投屏、动作队列和 Windows 启动器 |
| [投屏技术说明](docs/SCREEN_MIRROR.md) | 屏幕几何、数据流和模拟器接收端 |
| [训练手册](docs/USAGE.zh.md) | 训练命令、任务、资源和参数 |
| [部署说明](deploy/README.md) | 控制器动作包和硬件部署路径 |

## 许可证与声明

项目拥有的内容采用 [LICENSE](LICENSE) 中的许可。第三方组件和媒体见 [NOTICE](NOTICE)。
由本项目生成的内容不会自动继承仓库许可证。

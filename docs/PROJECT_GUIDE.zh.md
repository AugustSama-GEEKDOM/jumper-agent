<!-- tracks: PROJECT_GUIDE.md @ sha256:86119640c7c508d1 -->

# Jumper Agent 项目指南

[首页](../README.zh.md) · [English](PROJECT_GUIDE.md)

Jumper Agent 是 [KingKongRobotics/jumper](https://github.com/KingKongRobotics/jumper) 的
GitHub fork。当前项目分支为 \`jumper-agent\`，在上游机器人训练与仿真代码基础上，集成了跳跳网页、
双圆屏模拟器显示和桌面投屏 GUI。

## 按目标开始

| 目标 | 从这里开始 |
|---|---|
| 在 Windows 启动网页眼睛和模拟器 | [整合演示](TIAOTIAO_DEVELOPMENT.zh.md#windows-整合演示) |
| 选择两个桌面画面投到模拟器 | [桌面区域投屏](TIAOTIAO_DEVELOPMENT.zh.md#桌面区域投屏) |
| 在 MuJoCo 中运行动作包 | [使用 app 动作包回放](../deploy/README.md) |
| 训练策略 | [环境搭建](USAGE.zh.md#环境搭建)，再看[教程](TUTORIAL.zh.md) |
| 修改网页或服务端 | [网页应用开发](TIAOTIAO_DEVELOPMENT.zh.md#网页应用) |
| 修改模拟器或屏幕接收端 | [运行组件](DEVELOPMENT.zh.md#运行组件) |
| 导出到受支持的宿主 | [部署指南](../deploy/README.md) |

外观与场景生成仍属于独立的
[jumper-design 仓库](https://github.com/KingKongRobotics/jumper-design)工作流。当前集成边界和准备
方式见 [WORKFLOWS.md](WORKFLOWS.md)。

## 安装训练和模拟器环境

Python 项目支持 3.10 到 3.13。由于本地框架包分布在仓库根目录和 rl 目录中，需要使用 editable
方式安装。

~~~powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e '.[dev,screen-mirror]'
python scripts/train.py --list
~~~

当前 Windows 整合启动器会调用 LOCALAPPDATA\Programs\Python\Python311 下的用户级 Python 3.11。
如果使用其他解释器或虚拟环境，请调整 start-tiaotiao-web-simulator.ps1 中的 Python 路径，
确保投屏 GUI 和它启动的模拟器子进程都使用已安装本项目的环境。

GPU 训练前，根据本机 CUDA 环境安装对应的 PyTorch。CPU 回放时，投屏 GUI 会使用原生 MuJoCo
后端启动示例 app。各平台的详细环境步骤见 [AGENT_SETUP.md](AGENT_SETUP.md) 和
[USAGE.zh.md](USAGE.zh.md)。

## 配置和启动网页

网页服务由 Node.js 提供，默认只监听本机回环地址的 4183 端口。安装 Node.js 18 或更新版本；
需要本地服务配置时，将 web/tiaotiao/.env.example 复制为 web/tiaotiao/.env。公开模板中的 AI
接口地址、密钥和模型均留空。天气和音乐功能还需要各自服务的凭据。

只启动网页：

~~~powershell
Set-Location web/tiaotiao
node server.mjs
~~~

从仓库根目录运行 start-tiaotiao-web-simulator.ps1，可启动完整 Windows 演示。启动器会打开本机
网页，并启动模拟器以及仅绑定回环地址的屏幕和动作接口。语音识别使用 Microsoft Edge。

## 两个显示屏的用途

机器人模型包含两个 0.9 英寸圆形显示面，纹理为 256 × 256 RGB；模拟器 viewer 用模型几何显示圆形
边界。可使用两种图像来源：

- 网页同步会分别把眼睛、音乐页或天气页渲染成两个圆屏画面。
- 桌面投屏会捕获两个自行选择的桌面区域，并将 RGB 裁剪图传给模拟器。

两种来源都会写入模拟器显示帧，因此同一个模拟器接收端一次只启用一个图像来源。两条数据流和
相关端点见[网页与模拟器指南](TIAOTIAO_DEVELOPMENT.zh.md)。纹理不会进入策略观测，也不是
真实硬件显示协议。

## 继续阅读专项指南

- [训练命令和资源](USAGE.zh.md)
- [从训练到动作包的完整示例](TUTORIAL.zh.md)
- [键盘和手柄控制](CONTROLS.zh.md)
- [屏幕投屏实现](SCREEN_MIRROR.md)
- [仓库开发与验证](DEVELOPMENT.zh.md)
- [控制器部署](../deploy/README.md)

## 许可证与项目边界

Jumper Agent 是 Jumper 上游项目的一个分支，并增加了网页及模拟器整合功能。项目许可证和第三方
声明见 [LICENSE](../LICENSE) 与 [NOTICE](../NOTICE)。训练输出、下载的媒体、外部服务返回结果和
实体机器人的行为可能分别受其来源及许可证约束。

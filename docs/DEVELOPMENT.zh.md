<!-- tracks: DEVELOPMENT.md @ sha256:32bc11848185a798 -->

# 开发指南

[首页](../README.zh.md) · [English](DEVELOPMENT.md)

Jumper Agent 是从 [KingKongRobotics/jumper](https://github.com/KingKongRobotics/jumper) 分支发展
而来的项目。仓库在机器人训练和部署代码上，集成了跳跳网页应用与模拟器显示工具。本文说明这些
组件的衔接方式，以及能够发现回归问题的检查。Windows 演示步骤见
[网页与模拟器开发说明](TIAOTIAO_DEVELOPMENT.zh.md)。

## 仓库结构

| 路径 | 职责 |
|---|---|
| assets/jumper | Jumper MJCF、网格模型、模型工具和桌面投屏 GUI |
| tasks/jumper | 任务配置、步态与参考动作行为 |
| scenes | 训练和回放场景 |
| rl/mjrl | 后端选择、仿真桥接、viewer、操作器和 app 回放 |
| rl/mjlab、rl/rsl_rl | 本地 Python 环境使用的 vendored 框架包 |
| controller | 输入词汇表和跨宿主输入读取器 |
| deploy | 动作包 schema、controller、网页 runtime、板端 runtime 和转换流程 |
| web/tiaotiao | 网页眼睛、语音交互、API 代理和动作队列 |
| scripts | 稳定的训练、回放、导出和部署入口 |
| out/bundle_example | 版本管理中的示例 .app 及可运行 bundle 数据 |
| tests | 框架、模型、模拟器、动作包、浏览器宿主和屏幕检查 |
| docs | 项目工作流和各模块参考 |

仓库保留上游训练框架作为可用的项目组成部分。网页与模拟器圆屏投屏是新增组件，不会替代训练或
部署 API。

## 运行组件

### 机器人与屏幕模型

MuJoCo 模型位于 assets/jumper。两个圆形表情屏使用只用于渲染的 RGB 纹理；显示器的物理尺寸
与项目硬件规格保持一致。更新纹理只影响画面，不会改变接触模型、策略观测或真实机器人的屏幕硬件。

### 模拟器和移动

scripts/play.py 是回放入口。传入 .app 动作包时，它会加载包内 controller 和策略。投屏 GUI 使用
--standalone 启动时，会在子进程中运行同一个 player，因此步行控制经过映射的控制和步态策略，
而不是独立的运动学假模拟。

投屏 GUI 位于 assets/jumper/tools/screen_cast.py。它在物理和渲染循环之外截取桌面，让用户通过
固定直径的圆形选框选择两个方形画面，再将裁剪区域缩放为模型纹理尺寸，并把成对的 RGB 帧传给
本机 HTTP 接收端。捕获速率为每秒 10 帧。整合启动器把模拟器 viewer 限制为每秒 30 帧。

player 和屏幕接收端使用仅绑定本机回环地址的数据流接口。Windows 整合启动器使用 18765 作为屏幕
接收端口，18766 作为动作桥端口。独立运行投屏工具且未指定屏幕端口时，接收端会选择可用端口。

### 网页眼睛与本地服务

web/tiaotiao/index.html 定义网页界面，style.css 负责布局和动画，app.js 负责表情、语音识别、
语音播报、天气/音乐页面、网页圆屏渲染和顺序动作队列。server.mjs 提供静态文件服务，并代理
已配置的外部服务。AI 凭据不会发送到浏览器。

网页带有同步地址打开时，会分别把眼睛或媒体页面绘制到两个 256 × 256 RGB canvas，再将成对画面
发给模拟器接收端。桌面投屏 GUI 与网页同步是独立的画面来源。不要同时向同一个接收端运行两种来源：
每个新帧都会覆盖另一个来源的画面。

### 动作控制链路

网页服务会校验助手输出的 ACTION 数据。网页显示动作条目，并按顺序提交给本机动作桥。动作桥把允许
的动作映射到模拟器已有的键盘控制：行走会在有限时长内按住方向键；手势、舞蹈和跳跃调用对应动作，
然后使用现有取消键结束。

动作桥在 Windows 上向模拟器窗口发送键盘输入。它不是硬件传输接口，不应暴露到公网。网页显示的
进度根据动作桥响应和预设时长计算，不代表策略控制器报告动作已经完成。

## 环境和本地运行

Python 项目支持 3.10 到 3.13。必须安装本项目，才能同时从仓库根目录和 rl 目录解析包：

~~~powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e '.[dev,screen-mirror]'
python -m pytest tests/test_screen_cast.py tests/test_screen_display.py -q
~~~

网页服务使用 Node.js 18 或更新版本，没有第三方 npm 运行依赖：

~~~powershell
Set-Location web/tiaotiao
node --check app.js
node --check server.mjs
node server.mjs
~~~

当前整合启动器从 LOCALAPPDATA 下的用户级安装路径定位 Python 3.11。请将 editable 项目和 Pillow
投屏依赖安装到该解释器中；若使用其他 Python 环境，先修改启动器中的路径。

## 配置与凭据

网页服务读取 web/tiaotiao/.env。以 web/tiaotiao/.env.example 为模板，并确保本机配置文件不被 Git
跟踪。公开示例中的 AI 接口、密钥和模型设置均留空，不包含预设接口或默认模型。天气和音乐服务
使用各自独立的配置。不要把凭据放进浏览器 JavaScript、截图、日志、源码压缩包或提交记录。

仓库根目录的 .env 用于训练默认参数，与网页服务配置不同。两个本机配置文件都会被 Git 忽略，并由
源码打包脚本排除。分发前请检查压缩包内容。

## 验证

针对修改的模块先跑专项检查；跨模块改动再运行完整套件：

~~~powershell
node --check web/tiaotiao/app.js
node --check web/tiaotiao/server.mjs
python -m py_compile assets/jumper/tools/screen_cast.py
python -m ruff check .
python -m pytest tests/ -q
~~~

屏幕投屏测试覆盖区域坐标计算和捕获数据契约；屏幕模型测试检查两个只用于渲染的模型屏幕；
网页宿主测试覆盖 controller 的浏览器目标。这些检查不代表 GPU 训练速度、动作质量、真实麦克风
表现、外部服务可用性或实体硬件运行结果。

若要验证实时圆屏数据，可启动独立投屏工具并查看本机健康接口。接收状态就绪表示成对完整画面已经
抵达，不代表画面来自预期来源。排查多个画面写入时，应检查网页查询参数和 GUI 投屏状态。

## 源码压缩包与贡献流程

在仓库根目录运行 package-project.ps1，可将完整源码打包到仓库之外。脚本会排除 Git 数据、本机
.env、浏览器配置目录、日志、缓存、训练检查点和 ZIP 文件，同时保留项目源码及版本管理中的示例
动作包。源码压缩包与部署到机器人的动作包用途不同。

提交前：

1. 检查 git diff 与 git status，确认本机凭据和生成的视频等文件未进入变更。
2. 对修改的模块运行专项验证；跨模块改动运行完整测试套件。
3. 同步更新英文文档和中文翻译。
4. 翻译完成后运行 tools/checks/stamp_translations.py --write。
5. 运行 git diff --check，并检查相对 Markdown 链接。

框架不变量见 [CLAUDE.md](../CLAUDE.md)，仓库规范见 [CONTRIBUTING.md](../CONTRIBUTING.md)。
修改动作包消费者或硬件 runtime 前，先阅读[部署指南](../deploy/README.md)。

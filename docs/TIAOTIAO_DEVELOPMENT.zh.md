<!-- tracks: TIAOTIAO_DEVELOPMENT.md @ sha256:108d98f4d08e69c4 -->

# 跳跳网页与模拟器开发说明

[项目指南](PROJECT_GUIDE.zh.md) · [English](TIAOTIAO_DEVELOPMENT.md)

本文说明跳跳网页眼睛如何连接 Jumper 模拟器。完整项目结构和检查方式见
[DEVELOPMENT.zh.md](DEVELOPMENT.zh.md)。

## Windows 整合演示

整合启动器需要 Windows 10/11、位于 LOCALAPPDATA\Programs\Python\Python311 的 Python 3.11、
Node.js 18 或更新版本，以及 Microsoft Edge。启动器会使用该路径下的 Python 运行投屏 GUI 和
模拟器子进程。请将项目及可选图像捕获依赖安装到该解释器：

~~~powershell
$python = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'
& $python -m pip install -e '.[screen-mirror]'
.\start-tiaotiao-web-simulator.ps1
~~~

启动器会依次启动监听本机 4183 端口的 Node 服务、Tk 投屏 GUI、策略驱动的 MuJoCo 模拟器和 Edge。
屏幕接收端使用 18765 端口，本机动作桥使用 18766 端口。模拟器从 out 目录加载示例动作包。

也可以分别启动服务和 viewer。只运行网页时，进入 web/tiaotiao 并执行 node server.mjs。若要在
没有网页启动器的情况下运行模拟器和投屏 GUI：

~~~powershell
python assets/jumper/tools/screen_cast.py --standalone --app out/bundle_example/jumper.app
~~~

GUI 状态栏会显示模拟器启动状态和图像接收地址。先点击 MuJoCo 窗口获取焦点，再按移动键：
W/A/S/D 控制行走，1–4 触发映射手势，Ctrl+1–4 触发舞蹈，Space 跳跃，0 结束当前动作。
备用小键盘映射会显示在 GUI 中。具体按键取决于示例动作包和 controller 配置。

## 桌面区域投屏

GUI 会在后台线程捕获桌面快照，避免界面卡住。输入原始画面中的像素直径，分别选择左侧和右侧区域。
选择窗口会显示桌面图像和跟随鼠标移动的圆形选框。点击一次确认，按 Esc 取消。圆形范围内的方形
裁剪会缩放为 256 × 256 RGB，模型上的圆形显示面负责遮挡四角。

选择好两个区域后开始投屏。GUI 以每秒 10 帧捕获，并将左右画面作为一组发送到模拟器的本机帧接收
端。该捕获流程只在内存中处理图像，不会写入磁盘。如果显示器布局发生变化，请重新选择两个区域。

网页也是一个图像来源：整合启动器通过同步查询参数打开网页后，网页会将眼睛或媒体画面以约每秒
12 帧发送到同一个模拟器接收端。两类画面来源都会覆盖同一对纹理，因此一个模拟器一次只运行一个
来源：

- 要同步网页表情时，使用启动器打开带同步参数的页面，并保持桌面投屏处于停止状态。
- 要投送任意桌面区域时，打开不含同步参数的页面，再从 GUI 开始桌面投屏。

模拟器健康接口可显示是否收到了完整的一对帧，但不会标明最后一帧由哪个来源发送。

## 网页应用

网页采用 HTML、CSS 和 JavaScript，无需打包工具或 npm 安装步骤：

| 文件 | 职责 |
|---|---|
| index.html | 眼睛 SVG、音乐和天气布局、操作控件与调试面板 |
| style.css | 眼睛几何形状、动画、响应式布局和媒体页面 |
| app.js | 表情状态、唤醒词识别、语音合成、服务调用、圆屏同步和动作队列 |
| server.mjs | 静态服务、本地配置、API 代理、返回数据校验和动作解析 |
| .env.example | 可选本机配置项名称；其中凭据和模型为空 |

需要本地配置时，把 web/tiaotiao/.env.example 复制为同目录下的 .env。AI 接口、密钥和模型只保留
在本机；公开模板不提供预设接口或默认模型。修改服务端环境后需要重启 Node。网页唤醒逻辑会接受
app.js 中配置的语音识别变体，包括“你好跳跳”“你好挑挑”和“你好调调”。

单独运行网页：

~~~powershell
Set-Location web/tiaotiao
node --check app.js
node --check server.mjs
node server.mjs
~~~

语音识别要求浏览器支持相关接口并取得麦克风授权。网页成功打开并不代表浏览器已获得麦克风权限，
也不代表外部服务当前可用。

## 顺序动作协议

用户要求机器人动作时，助手的回答包含一条 ACTION 控制记录，后接语音文本。网页会校验并移除控制
记录，再等待动作桥完成当前步骤后发送下一项：

~~~json
[[ACTION:{"steps":[
  {"type":"walk","direction":"forward","steps":2},
  {"type":"walk","direction":"left","steps":2},
  {"type":"dance","name":"crab"},
  {"type":"gesture","name":"hello"}
]}]]
~~~

支持的类型和范围：

| 类型 | 取值 | 动作桥行为 |
|---|---|---|
| walk | direction：forward、backward、left、right；steps：1–10 | 在有限时长内按住 W/A/S/D |
| dance | crab、brazilian、maze、dream_wings | 触发映射舞蹈，并在预设时间后发送取消 |
| gesture | hello、bow、paw、salute | 触发映射手势，并在预设时间后发送取消 |
| jump | 无额外字段 | 触发跳跃，并在预设时间后发送取消 |
| stop | 无额外字段 | 发送已有的动作取消按键 |

动作桥会先检查类型和方向，再发送键盘输入。它只绑定本机，并在 Windows 上模拟键盘事件；它不是
远程 API，不应暴露到本机之外。网页队列根据请求返回和限时器显示进度。Rust controller 当前不会
经此动作桥返回逐动作完成事件。

如果 AI 没有返回有效 ACTION 记录，网页服务还会对常见动作短语使用确定性解析。此功能只覆盖已经
支持的移动和手势词汇，不是通用自然语言控制运行时。

## 检查与排错

按修改内容运行专项检查：

~~~powershell
node --check web/tiaotiao/app.js
node --check web/tiaotiao/server.mjs
python -m py_compile assets/jumper/tools/screen_cast.py
python -m ruff check assets/jumper/tools/screen_cast.py
python -m pytest tests/test_screen_cast.py tests/test_screen_display.py tests/test_web_host.py -q
~~~

- GUI 无法捕获桌面时，确认启动器使用的 Python 已安装 Pillow，并在显示器布局稳定后重新选择区域。
- 模拟器窗口未出现时，检查 GUI 状态和 scripts/play.py 输出，确认示例动作包存在且该 Python 环境已
  安装项目依赖。
- 网页画面和桌面裁剪不断互相覆盖时，停止一个来源；一个接收端一次只应该有一个图像来源。
- 网页动作队列一直等待时，确认同步地址推导出的动作桥端口正在监听，且 MuJoCo 窗口已启动。
- 语音输入不可用时，使用支持语音接口的 Edge，为本机页面授权麦克风，并检查操作系统选中的麦克风。

完整源码 ZIP 使用仓库根目录的 package-project.ps1。脚本会排除 .env、本机浏览器配置目录、日志、
Python 缓存、训练检查点和其他 ZIP 文件。发布前检查压缩包内容。

<!-- tracks: TIAOTIAO_DEVELOPMENT.md @ sha256:e86195a46106935d -->

# 跳跳网页与模拟器开发说明

此副本在 Jumper 模拟器中增加了浏览器机器人表情、桌面画面投屏和 AI 连续动作控制。原始 Jumper 仓库位于另一个目录；请在此副本中开发和测试这些改动。

## 组件结构

- `web/tiaotiao/server.mjs` 提供网页，并代理聊天、天气和音乐请求。它会验证 AI 返回的 `ACTION` 控制数据；若模型漏掉或写错控制数据，会使用确定性的中文指令解析器处理常见移动和手势。
- `web/tiaotiao/app.js` 解析动作控制行、显示任务列表，并一次发送一个动作；每项状态为等待、执行中、完成或失败。
- `assets/jumper/tools/screen_cast.py` 启动策略驱动的 `play --app` 模拟器、投屏所选桌面圆形区域，并提供本机回环动作桥。
- `rl/mjrl/app_play.py` 负责模拟器键盘和 FSM 控制。动作桥发送模拟器原本接受的按键，因此移动仍由内置步态策略执行。
- `start-tiaotiao-web-simulator.ps1` 启动网页服务、投屏 GUI、模拟器和 Edge 页面。

## 本机设置与启动

Windows 启动器需要 `%LOCALAPPDATA%\Programs\Python\Python311` 下的 Python 3.11、Node.js、Microsoft Edge、可选的 `screen-mirror` Python 依赖，以及 `out/` 下已构建的 `.app`。在目标环境中安装项目和截屏依赖：

```powershell
python -m pip install -e ".[screen-mirror]"
```

复制 `web/tiaotiao/.env.example` 为 `web/tiaotiao/.env`，并在本机配置 API 密钥。不要提交 `.env`；用 `.env.example` 记录变量名而不填写真实密钥。启动所有组件：
公开样例中的 AI API 地址和默认模型均留空。启用聊天时，只在本机 .env 设置 OPENAI_API_URL、OPENAI_API_KEY 和 OPENAI_MODEL；不要把本机配置提交到仓库。

```powershell
./start-tiaotiao-web-simulator.ps1
```

浏览器会打开 `http://127.0.0.1:4183/`。屏幕接收端口为 `18765`，动作桥地址是 `http://127.0.0.1:18766/actions`。两个模拟器接口都只绑定本机回环地址。没有模拟器时也可以单独打开网页，但动作不可用。

## 动作协议

模型返回一行机器控制数据，后接语音文案。网页会从语音中移除控制行，并等待前一个模拟器动作返回后才发送下一项：

```text
[[ACTION:{"steps":[
  {"type":"walk","direction":"forward","steps":2},
  {"type":"walk","direction":"left","steps":2},
  {"type":"dance","name":"crab"},
  {"type":"gesture","name":"hello"}
]}]]
收到，我马上执行。
```

支持的动作如下：

| 类型 | 字段 | 行为 |
|---|---|---|
| `walk` | `direction`：`forward`、`backward`、`left`、`right`；`steps`：1–10 | 按住对应的 W/S/A/D 键，每步约 620 毫秒。 |
| `dance` | `name`：`crab`、`brazilian`、`maze`、`dream_wings` | 通过 Ctrl+1–4 启动对应舞蹈，约六秒后使用现有的 0 键取消。 |
| `gesture` | `name`：`hello`、`bow`、`paw`、`salute` | 通过 1–4 启动对应手势，约 2.2 秒后使用 0 键取消。 |
| `jump` | 无 | 按 Space 启动跳跃，约 1.5 秒后取消。 |
| `stop` | 无 | 发送现有的 0 动作取消键。 |

界面根据动作桥返回和预设时长显示完成状态。它不会读取控制器内部的动作完成事件；若动作片段或模拟速度改变，可能需要调整时长。动作桥通过 Windows 注入键盘输入，仅适用于 Windows。保持动作步骤有界，不要向协议添加任意 shell 命令或按键名称。

## 开发检查

修改网页或动作桥后运行：

```powershell
node --check web/tiaotiao/app.js
node --check web/tiaotiao/server.mjs
python -m py_compile assets/jumper/tools/screen_cast.py
ruff check assets/jumper/tools/screen_cast.py
```

启动程序后，第一帧投屏到达时，`GET http://127.0.0.1:18765/health` 应返回 `frame_ready: true`。可以发送无移动效果的停止动作来验证动作桥：

```powershell
Invoke-RestMethod http://127.0.0.1:18766/actions -Method Post `
  -ContentType 'application/json' -Body '{"type":"stop"}'
```

向 `POST /api/chat` 提交连续动作语句，确认返回的 `ACTION` 步骤保持原顺序。例如“先往前走两步再往左走两步再跳个舞最后再打一下招呼”应依次生成前进、左移、跳舞和打招呼。网页面板应显示当前项与总体进度。

## 打包与密钥

使用项目根目录的 `package-project.ps1` 创建源码压缩包。脚本会排除本机环境文件、浏览器配置目录、日志、构建缓存和训练检查点，同时保留源码及必需的示例应用包。分享前请检查压缩包内容。API 密钥只放在本机 `.env` 文件中；若密钥曾提交或分发，请撤销并更换。

`web/tiaotiao/package-project.ps1` 仅生成较小的网页包，与项目根目录的完整源码包用途不同。

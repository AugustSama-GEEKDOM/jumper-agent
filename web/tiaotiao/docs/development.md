# 开发文档

## 技术组成

- 前端：原生 HTML、CSS、ES Modules 风格的浏览器 JavaScript（脚本以普通 defer 方式加载），没有打包步骤。
- 服务端：Node.js 内置 `http`、`fs`、`path` 模块和运行时提供的 `fetch`，没有第三方 npm 运行依赖。
- 浏览器能力：SpeechRecognition、SpeechSynthesis、SVG、CSS 动画、localStorage、Audio。
- 运行地址：默认 `http://127.0.0.1:4183/`，可通过环境变量 `PORT` 修改端口。

## 目录结构

```text
.
├── app.js                 # 表情状态、语音识别、对话、音乐和天气客户端逻辑
├── index.html             # 主页面和调试台 DOM
├── style.css              # 眼睛、媒体页面、表情动画和调试台样式
├── server.mjs             # 本地 HTTP 服务、提示词、API 代理
├── favicon.svg            # 页面图标
├── .env.example           # 无密钥的配置模板
├── start-tiaotiao.bat     # ZIP 内的 Windows 启动入口
├── 启动跳跳.bat           # 中文文件名启动入口（工作目录保留）
├── promo.html / promo.css / promo.js # 独立宣传动画页面源码
├── tools/                  # 文档截图等开发辅助脚本
├── docs/screenshots/       # 15 张文档截图
├── render-demo.mjs        # 主眼睛页面视频录制脚本（本机工具路径需按环境修改）
└── docs/                  # 使用、开发、API 与部署说明
```

## 本地开发

从项目目录运行 `start-tiaotiao.bat`，或直接执行：

```powershell
node --check app.js
node --check server.mjs
node server.mjs
```

服务端配置位于项目目录的 .env。AI API 地址和默认模型在公开版本中为空；启用聊天时本地填写 OPENAI_API_URL、OPENAI_API_KEY 和 OPENAI_MODEL，修改后重启 Node 服务。

访问 GET /api/status 可检查聊天服务是否已配置、音乐密钥状态和默认模型；公开示例中的模型为空，接口不会返回密钥。

`preview-promo.mjs` 和 `qa-layout.mjs` 用于宣传动画截图与布局检查；`render-demo.mjs` 用于录制主眼睛演示视频。它们依赖本机 Edge、Playwright 和 ffmpeg 路径，换电脑后需要按实际安装位置修改脚本，主网页运行不依赖这些脚本。

`tools/capture-doc-screenshots.mjs` 启动一个无麦克风的 Edge 页面，使用前端公开的状态函数设置演示状态，然后保存文档截图。它不会调用聊天、天气或音乐上游接口；天气和音乐内容是前端构造的样例。截图图库见 [screenshot-gallery.md](screenshot-gallery.md)。

## 前端流程

`app.js` 管理状态与页面：`idle`、`listening`、`thinking`、`synthesis`、`speaking`，以及 `music`、`weather` 等页面状态。`setState()` 更新状态并触发表情过渡；`showExpression()` 插值更新眼睛 SVG 路径；`lookAt()` 和待机计时器管理注视方向。

识别连续运行并处理 interim results。唤醒词命中后进入 `command` 模式；静音达到约 1.5 秒后提交对话。模型返回音乐或天气控制行时，前端解析控制行，不把其内容作为语音播报，再调用相应代理接口。手动“进入聆听”复用相同指令收集流程，跳过唤醒词。

模型名和背景色使用浏览器本地 `localStorage` 保存。它们与服务端密钥配置互相独立。

## 提示词与模型

`server.mjs` 顶部的 `SYSTEM_PROMPT` 是聊天系统提示词。`POST /api/chat` 将它作为 system 消息发送给 OpenAI 兼容接口。修改提示词后必须重启服务。

默认模型值来自 OPENAI_MODEL，公开示例留空。也可以在调试台输入模型名称；名称保存在当前浏览器的本地存储中，清空后不会回退到内置模型。

## 添加表情

在 `app.js` 的 `shapes` 中定义 SVG 曲线控制点和线宽，在 `moods` 中把表情名映射为左右眼形状；需要按钮时在 `index.html` 的 `#expression-buttons` 新增 `data-expression` 按钮。需要状态专属效果时，在 `style.css` 按 `#eye-stage[data-state=...]` 或 `data-expression` 增加动画规则。新形状左右眼控制点的数量应一致，以便路径插值动画正常工作。

## 修改背景颜色功能

背景由 CSS 变量 `--page-background` 控制，设置入口在 `index.html` 调试台，初始化和持久化逻辑在 `app.js`，背景实际应用在 `style.css` 的 `:root`、`html/body` 和 `.eye-display`。

## 调试建议

1. 检查终端中 Node 服务的启动与运行信息。
2. 使用 `GET /api/status` 确认密钥配置状态。
3. 打开 Edge DevTools Console 查看前端异常。
4. 使用调试台观察识别文本、AI 阶段、TTS 状态和媒体错误。
5. `SpeechRecognition` 需要 Edge 支持、联网、麦克风权限；自动化浏览器没有真实麦克风时，可测试 UI 状态但不能验证真实语音识别质量。

## 代码阅读顺序

建议按以下顺序阅读，能最快建立完整模型：

1. 先看 `index.html`，确认所有运行时 DOM id 和表单入口。
2. 再看 `style.css` 的主题变量、状态选择器和媒体查询。
3. 阅读 `app.js` 的 `shapes`、`moods`、`setState()` 和 `showExpression()`，理解视觉层。
4. 阅读 `app.js` 的 `recognition.onresult`、`finishCommand()` 和 `askAssistant()`，理解语音链路。
5. 阅读 `app.js` 的 `queryWeather()`、`playMusicByQuery()` 和 `synthesizeAndPlay()`，理解三个异步能力。
6. 最后看 `server.mjs` 的路由、校验和上游归一化。
7. 用 `docs/code-reference.md` 的时序图和验证矩阵逐项复现。

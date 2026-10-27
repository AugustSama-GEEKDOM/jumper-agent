# 跳跳机器人眼睛与语音助手

跳跳是一个以浏览器为显示终端的机器人眼睛界面。网页提供待机注视、眨眼、疑问、聆听、思考、播报等表情，并集成语音唤醒、对话、天气查询和音乐播放。根目录中的 `promo.html`、`promo.css` 和 `promo.js` 是独立的概念宣传动画，不参与主网页运行。

## 快速开始

### 环境

- Windows 10/11
- Node.js 18 或更新版本（推荐当前 LTS）
- Microsoft Edge 最新版
- 麦克风和网络连接

### 安装与运行

1. 将整个项目解压到一个普通文件夹。
2. 复制 `.env.example` 并命名为 `.env`，填入你自己的服务密钥。
3. 双击 `start-tiaotiao.bat`（中文工作目录中也提供 `启动跳跳.bat`），或在项目文件夹运行 `node server.mjs`。
4. 在 Edge 打开 `http://127.0.0.1:4183/`。
5. 首次使用语音功能时允许麦克风权限。说“你好跳跳”唤醒，也可以在调试台点击“进入聆听”。

语音需要在 Edge 等支持 Web Speech API 的浏览器中使用。网页与 Node 服务部署在其他主机时，浏览器的语音识别仍由访问网页的设备提供，并需为对应网页单独授予麦克风权限。

## 配置密钥

请在项目根目录 `.env` 中设置：

```dotenv
OPENAI_API_URL=
OPENAI_API_KEY=填写兼容接口密钥
MYHKW_MUSIC_KEY=填写音乐接口密钥
OPENAI_MODEL=
PORT=4183
```

AI API 地址和默认模型在公开版本中均留空。需要聊天功能时，在本地 .env 中填写 OPENAI_API_URL、OPENAI_API_KEY，并按服务要求设置 OPENAI_MODEL；也可在调试台临时输入模型名称。服务端只向该地址发起请求，密钥不要放入前端或提交到 Git。

## 文档

- [使用说明](docs/user-guide.md)：语音、表情、天气和音乐操作
- [开发文档](docs/development.md)：项目结构、状态机和本地开发
- [接口参考](docs/api-reference.md)：本地代理 API、上游服务与字段
- [部署与安全](docs/deployment-security.md)：配置、运行与密钥保护
- [代码详解](docs/code-reference.md)：前端、服务端、状态机、时序和扩展方法
- [截图图库](docs/screenshot-gallery.md)：15 张状态、表情、媒体和响应式截图

需要重新生成源码包时，可运行 `powershell -ExecutionPolicy Bypass -File package-project.ps1`，压缩包会写入当前用户桌面。

## 项目内容

主网页使用原生 HTML、CSS 和 JavaScript，无需构建工具或 npm 依赖。`server.mjs` 提供静态文件和上游 API 代理。`promo.html` 是与主应用解耦的宣传动画源码，可用浏览器直接打开它。

文档截图放在 `docs/screenshots/`，截图脚本在 `tools/capture-doc-screenshots.mjs`。截图中的天气、音乐和识别信息是演示数据；运行时不会读取这些 PNG。

## 许可与第三方服务

此源码包未附加额外开源许可证。运行聊天、音乐或天气功能会请求各自配置的第三方服务；请遵守这些服务的条款、配额和内容版权要求。

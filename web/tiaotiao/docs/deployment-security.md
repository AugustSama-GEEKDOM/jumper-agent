# 部署与安全说明

## 本地启动

1. 安装 Node.js 18 或更新版本和 Microsoft Edge。
2. 将 `.env.example` 复制为 `.env`，并填写自己的聊天与音乐密钥。
3. 执行 `启动跳跳.bat` 或 `node server.mjs`。
4. 浏览器访问 `http://127.0.0.1:4173/`。

服务监听 `127.0.0.1`，只接受本机连接。设置 `PORT` 可更换端口；需要在局域网、反向代理或公网部署时，应先自行设计认证、HTTPS、限流和网络访问控制，本项目默认不提供这些部署层能力。

## 凭据管理

- `.env` 是本机私密文件，不要放进 ZIP、邮件、公开仓库或截图。
- 将 `.env.example` 复制为 `.env`，自行填入新环境使用的密钥。
- 公共 .env.example 中 AI 接口地址和默认模型留空。启用聊天时，只在本地 .env 配置 OPENAI_API_URL、OPENAI_API_KEY 和 OPENAI_MODEL。
- 不要将 API 密钥写到 `app.js`、HTML、CSS 或浏览器 localStorage。
- 密钥若曾被公开分享，应在对应服务控制台撤销旧密钥并创建新密钥。
- 分享源码时只提供 `.env.example`，绝不提供实际 `.env`。

## 浏览器权限和网络

语音识别由访问网页的浏览器执行。使用 Edge 并允许麦克风；浏览器的语音服务可能要求互联网连接。Node 服务端需能连接配置的聊天、音乐和天气上游接口。音乐封面与音频由浏览器直接加载上游提供的 URL，因此还取决于远端资源有效期、跨域响应和浏览器自动播放策略。

## HTTP 安全响应

服务端设置了 `Content-Security-Policy`、`Permissions-Policy`、`Referrer-Policy` 和 `X-Content-Type-Options`。这些设置针对本机单用户场景；若更改为对外提供服务，需要另行加入身份验证和访问控制。

## ZIP 包含范围

项目 ZIP 应包含主应用源码、文档、文档用截图、启动脚本、宣传动画源码和空白 `.env.example`。可以包含 `docs/screenshots/` 中的演示截图；不得包含真实 `.env`、密钥、`node_modules`、本机 `.video-render/` 临时录制目录、桌面视频或浏览器运行缓存。

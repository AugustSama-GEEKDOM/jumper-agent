# 跳跳网页开发说明

本文件记录 web/tiaotiao 的实现边界与维护入口。Jumper Agent 的训练框架、MuJoCo 模拟器、双屏投放和
完整开发检查见仓库根目录 [docs/DEVELOPMENT.zh.md](../../../docs/DEVELOPMENT.zh.md)；Windows 整合
启动与联调步骤见 [网页与模拟器开发说明](../../../docs/TIAOTIAO_DEVELOPMENT.zh.md)。

## 组件边界

网页由原生 HTML、CSS 和 JavaScript 构成，没有构建步骤和第三方 npm 运行依赖。Node 服务使用内置
HTTP、文件系统和 fetch API，并只绑定本机回环地址。API 凭据在 Node 进程中读取，不传入浏览器。
浏览器同步和桌面捕获都向 MuJoCo 的两个渲染纹理提供 RGB 帧；两种来源不可同时向一个模拟器实例
投帧。

| 组件 | 入口 | 维护内容 |
|---|---|---|
| 页面结构 | index.html | 眼睛 SVG、天气/音乐布局、按钮、调试区域 |
| 样式 | style.css | 圆屏布局、SVG 状态动画、响应式规则 |
| 浏览器逻辑 | app.js | 表情状态、语音、天气/音乐、投屏画面与动作队列 |
| 本机服务 | server.mjs | 静态资源、配置读取、API 代理、动作协议校验 |
| 界面演示资源 | promo.html、promo.css、promo.js | 与产品网页隔离的宣传动画 |

## 本地配置和开发

在本目录复制 .env.example 为 .env。公开模板中的 AI 地址、凭据和模型都为空，不提供内置服务端点
或默认模型。修改本机配置后重启 Node 服务。密钥不能进入 app.js、浏览器存储、截图或 git 提交。

~~~powershell
node --check app.js
node --check server.mjs
node server.mjs
~~~

使用浏览器访问本机服务。麦克风交互依赖支持语音识别的浏览器和相应权限；自动化无头浏览器可检查
布局与状态，不能代替真实麦克风测试。Node 服务端日志只应记录排错所需状态，不能写入密钥或完整
授权请求头。

## 浏览器与模拟器同步

网页由同步 URL 参数取得本机屏幕接收地址。app.js 将两侧当前内容绘制到独立的 256 × 256 canvas，
组成一帧二进制 RGB 数据后发送给模拟器。眼睛、音乐和天气界面共用这条渲染路径。表情 SVG 有动画，
需要通过 canvas 绘制，因此浏览器同步是独立的低频画面生产者。

完整项目整合启动器默认每秒推送约 12 帧。桌面捕获 GUI 的速度约每秒 10 帧。二者写入同一接收端
时会相互覆盖。调试时确认同步 URL 是否存在，且桌面投屏没有同时开启。纹理用于 viewer 显示，不进入
策略输入。

## 动作队列

server.mjs 校验 ACTION 数据中的步骤类型、方向和数量；app.js 清理控制行并按顺序执行动作。动作桥
仅绑定本机，调用现有模拟器键位映射。页面的任务列表通过请求响应和设定的执行时长更新，不是对
controller 内部动作完成事件的直接订阅。

如果调整 AI 提示词、动作解析规则或按键映射，要一起检查：

- 服务端生成的步骤仍符合协议允许值。
- 多步请求在网页中保持原顺序，失败后正确显示状态。
- 行走使用步态控制映射，舞蹈和手势调用现有动作，停止键能结束当前动作。
- 未启动模拟器时，网页明确显示动作桥不可用，不伪称执行成功。

动作协议和本机动作桥细节见根目录
[顺序动作协议](../../../docs/TIAOTIAO_DEVELOPMENT.zh.md#顺序动作协议)。

## 测试和维护

~~~powershell
node --check app.js
node --check server.mjs
python -m pytest ../../tests/test_web_host.py ../../tests/test_screen_display.py -q
~~~

如有针对纯前端状态的自动化检查，可运行当前项目的布局 QA 脚本；需要截图时使用
tools/capture-doc-screenshots.mjs。演示截图中的内容不得包含本机 API 地址、密钥或浏览器个人信息。

修改组件后，更新此仓库的英文或中文说明，并同步维护根目录的集成指南。公开源码包从根目录
package-project.ps1 生成；web 子目录的打包脚本仅面向网页组件，不是完整 Jumper Agent 项目包。

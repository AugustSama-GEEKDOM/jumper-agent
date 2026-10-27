# 本机 API 参考

网页使用同源 Node 服务。聊天、音乐和天气上游请求都由服务端发出，浏览器不接收服务端凭据。状态接口
返回的是本地配置状态，不保证上游服务可用。请求无效时返回 400，配置缺失时返回 503，上游失败时
通常返回 502。

## 状态

~~~http
GET /api/status
~~~

返回字段包括聊天配置状态、音乐配置状态和浏览器使用的模型名。公开环境模板中的聊天接口、密钥和模型
均为空。

## 对话

~~~http
POST /api/chat
Content-Type: application/json

{"messages":[{"role":"user","content":"你好"}]}
~~~

messages 是按时间排序的 user/assistant 文本消息，最多 16 条，每条不超过 2000 个字符。可选 model
字段用于指定当前请求使用的模型。普通对话要求本机服务已配置 AI 接口和密钥，并且请求提供模型名或
本机配置模型。接口 URL、凭据和模型不在公开模板中预设。

机器人动作可带 ACTION 控制记录。服务端仅接受支持的有界操作类型、移动方向和步数；网页仍会二次
校验。具体动作队列见根目录的[顺序动作协议](../../../docs/TIAOTIAO_DEVELOPMENT.zh.md#顺序动作协议)。

## 音乐搜索

~~~http
POST /api/music/search
Content-Type: application/json

{"name":"歌曲名称","type":"wy","limit":5}
~~~

name 为搜索词，最多 120 个字符；type 是前端支持的平台代码；limit 范围为 1–10。响应只返回界面
需要的歌曲名称、歌手、专辑、封面和标识字段。

## 歌曲详情和封面

~~~http
POST /api/music/info
Content-Type: application/json

{"id":"歌曲标识","type":"wy"}
~~~

详情响应可包含歌曲名称、歌手、专辑、音频链接、封面和歌词。音乐封面另有本机代理路由
GET /api/music/cover，用于按允许的来源读取封面。上游资源的有效期及跨域能力由提供方决定。

## 天气

~~~http
POST /api/weather
Content-Type: application/json

{"city":"城市名"}
~~~

city 可省略或为空。成功响应包含归一化后的地点、天气、温度、风向、湿度和报告时间字段；界面不应依赖
未列出的上游字段。

## 配置变量

服务端从 web/tiaotiao/.env 读取本地配置。浏览器代码不应直接读取 .env。OPENAI_API_URL、
OPENAI_API_KEY、OPENAI_MODEL 和音乐服务密钥在公开模板中留空；设置端口时可以使用 PORT，未设置则
使用 4183。实际可用字段和校验方式以 server.mjs 为准。

# 接口参考

所有本地接口均由 `server.mjs` 提供，浏览器只访问同源 `/api/...`，密钥保留在服务端。除状态查询外，请求体为 JSON。服务端对无效输入返回 400；上游不可用通常返回 502；缺少所需密钥返回 503。

## 服务状态

`GET /api/status`

响应示例：

```json
{"ready":false,"musicReady":false,"model":""}
```

`ready` 表示聊天 API 地址与密钥已填写，`musicReady` 表示音乐密钥已填写；这两个字段不代表上游服务当前可用。

## 对话

`POST /api/chat`

请求：

```json
{"messages":[{"role":"user","content":"你好"}]}
```

messages 必须包含 1 至 16 条 user/assistant 文本消息，每条最多 2000 字符。model 可选，最多 160 字符；普通聊天需要在请求中提供模型名称，或在本地配置 OPENAI_MODEL。服务端还需要通过本地 .env 配置 OPENAI_API_URL 与 OPENAI_API_KEY，未配置时返回 503。纯动作指令可由本地服务直接回复确认，不执行机器人动作。

## 音乐搜索

`POST /api/music/search`

请求：

```json
{"name":"美丽的神话","type":"wy","limit":10}
```

`name` 必填，最多 120 字符；`type` 必须为 `wy` 网易云、`qq` QQ、`kw` 酷我、`kg` 酷狗、`mg` 咪咕、`qi` 千千之一；`limit` 范围为 1 至 10。成功响应为 `{ "songs": [...] }`，每项包含 `id`、`type`、`name`、`artist`、`album`、`pic`。服务端自动向上游请求格式化结果与封面。

## 歌曲详情

`POST /api/music/info`

请求：

```json
{"id":"4875127","type":"wy"}
```

返回 `{ "song": { "id", "type", "name", "artist", "album", "url", "pic", "lrc" } }`。上游 MP3 地址、封面和歌词由服务端统一获取。

## 天气

`POST /api/weather`

请求：

```json
{"city":"徐州"}
```

`city` 可省略或为空；不指定城市时，上游服务使用请求来源定位。指定时最多 80 字符。成功响应包含 `province`、`city`、`district`、`weather`、`weather_icon`、`temperature`、`feels_like`、`wind_direction`、`wind_power`、`humidity` 和 `report_time`。

## 上游服务与配置

- 聊天：由本地 OPENAI_API_URL 指定兼容接口，OPENAI_API_KEY 和 OPENAI_MODEL 均在本地配置；公开示例不包含地址或默认模型。
- 音乐：`https://myhkw.cn/open/music/search` 与 `/info`，密钥字段 `MYHKW_MUSIC_KEY`。
- 天气：`https://uapis.cn/api/v1/misc/weather`，当前客户端未配置上游密钥。

上游服务的可用性、配额、响应字段和内容授权由各服务提供方负责。服务端代理会归一化响应，但不缓存音乐或天气结果。

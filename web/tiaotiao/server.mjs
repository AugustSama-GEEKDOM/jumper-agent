import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
// The copied web page uses its own port so it cannot collide with an existing
// Tiaotiao instance or any service owned by the original repository.
const PORT = Number(process.env.PORT || 4183);

function loadLocalEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const values = {};
  for (const line of readFileSyncCompat(envPath).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const name = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

// Read synchronously at startup so the service can start even when .env is absent.
import { readFileSync } from 'node:fs';
function readFileSyncCompat(path) {
  return readFileSync(path, 'utf8');
}

const localEnv = loadLocalEnv();
const API_KEY = process.env.OPENAI_API_KEY || localEnv.OPENAI_API_KEY || '';
const MUSIC_API_KEY = process.env.MYHKW_MUSIC_KEY || localEnv.MYHKW_MUSIC_KEY || '';
const MODEL = process.env.OPENAI_MODEL || localEnv.OPENAI_MODEL || '';
const API_URL = process.env.OPENAI_API_URL || localEnv.OPENAI_API_URL || '';
const MUSIC_API_BASE = 'https://myhkw.cn/open/music/';
const WEATHER_API_URL = 'https://uapis.cn/api/v1/misc/weather';
const MUSIC_TYPES = new Set(['wy', 'qq', 'kw', 'kg', 'mg', 'qi']);
const MUSIC_REQUEST = /(?:想(?:要)?听|要听|听一首|播放|放一首|来一首|点一首|推荐.{0,12}(?:音乐|歌曲|歌)|(?:音乐|歌曲).{0,12}推荐)/u;
const WEATHER_REQUEST = /(?:天气|气温|温度|下雨|降雨|下雪|天气预报)/u;
const ACTION_REQUEST = /(?:前进|向前|后退|向后|左转|右转|向左|向右|转身|跳舞|跳一下|挥手|招手|打招呼|敬礼|鞠躬|蹲下|起立|站起来|坐下|趴下|走路|跑步|旋转|摇摆|停止动作|停下)/u;
const ACTION_ONLY_REQUEST = /^(?:请你?|帮我|你能)?(?:前进|向前|后退|向后|左转|右转|向左|向右|转身|跳舞|跳一下|挥手|招手|打招呼|敬礼|鞠躬|蹲下|起立|站起来|坐下|趴下|走路|跑步|旋转|摇摆|停止动作|停下)(?:一下|吧|好吗)?[。！!？?，,\s]*$/u;
const SYSTEM_PROMPT = '你是跳跳Agent，搭载在“跳跳”机器人上的AI大模型，一个灵动、温柔、可爱的小机器人伙伴，可以查天气、聊天、放音乐并操纵机器人。所有回答都会直接用中文语音播报：普通问题只用简短、口语化的回答，通常一句话，最多两句话，尽量不超过60个汉字；不要长篇解释、列表或复述问题。输出必须是纯文字，只允许中文、字母、数字和正常停顿标点；严禁 Markdown、代码围栏、标题、项目符号、链接，以及星号、井号、反引号、花括号、圆括号、斜杠、反斜杠、下划线、竖线、波浪号、等号、加号等格式符号。需要表达运算时请用“除以”“乘以”“加上”“减去”“等于”等中文说法。用户要求机器人动作时，必须先输出且只输出一行 ACTION 控制行，格式严格为 [[ACTION:{"steps":[{"type":"walk","direction":"forward","steps":2},{"type":"dance","name":"crab"},{"type":"gesture","name":"hello"}]}]]，然后换行说一句简短确认。连续动作按用户原本顺序逐项写入 steps。允许的 type 只有 walk、dance、gesture、jump、stop；walk 的 direction 只有 forward、backward、left、right，steps 是1到10的整数；dance 的 name 只能 crab、brazilian、maze、dream_wings，未指定舞蹈时用 crab；gesture 的 name 只能 hello、bow、paw、salute。ACTION 控制行只供网页解析，绝不能在自然话术中复述。普通聊天不要输出 ACTION。用户明确表达想听音乐、点歌或求推荐音乐时，只推荐一首歌，并在回答最前面单独输出一行机器指令，格式严格为 [[MUSIC:{"query":"搜索词","type":"平台代码"}]]，然后换行说一句不超过20字的简短话；type 必须是 wy、qq、kw、kg、mg、qi 之一，没有特别偏好时用 wy。用户询问天气时，必须在回答最前面单独输出一行机器指令，格式严格为 [[WEATHER:{"city":"城市名"}]]，然后换行说一句不超过20字的简短话；没有指定城市时 city 为空字符串。一次回答最多输出一条音乐指令或天气指令，动作指令可以与简短确认一起输出。';


const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);

function sendJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'microphone=(self)');
  response.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' http://127.0.0.1:*; img-src 'self' data: blob: https: http:; media-src 'self' blob: https: http:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 48_000) throw new Error('body-too-large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function normalizeMessages(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 16) return null;
  const messages = [];
  for (const item of input) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') return null;
    const content = item.content.trim();
    if (!content || content.length > 2_000) return null;
    messages.push({ role: item.role, content });
  }
  return messages;
}

async function requestMusicApi(endpoint, params) {
  const url = new URL(endpoint, MUSIC_API_BASE);
  url.search = new URLSearchParams({ key: MUSIC_API_KEY, ...params }).toString();
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(18_000),
  });
  if (!response.ok) throw new Error(`music-upstream-${response.status}`);
  const data = await response.json();
  if (data && !Array.isArray(data) && Number(data.code) === 0) {
    throw new Error(typeof data.msg === 'string' ? data.msg : 'music-upstream-rejected');
  }
  return data;
}

function unwrapMusicData(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.data !== undefined) return payload.data;
  return payload;
}

function normalizeArtist(artist) {
  if (Array.isArray(artist)) return artist.map(String).join(' / ');
  return typeof artist === 'string' ? artist : '';
}

function getFallbackMusicQuery(userText, reply) {
  const recommendation = reply.match(/(?:像|比如|例如)\s*\*{0,2}([^*（(\n]{2,60}?)\*{0,2}[（(]\s*(?:代表作|作品)\s*[*“"《]?([^*）)”“"》\n]{2,80})/u);
  if (recommendation) {
    const artist = recommendation[1].trim();
    const title = recommendation[2].trim();
    if (artist && title) return `${title}-${artist}`;
  }

  const request = userText.match(/(?:想(?:要)?听|要听|听一首|播放|放一首|来一首|点一首)\s*(.+)/u);
  const requestedText = request?.[1]?.trim().replace(/[，。！？!?；;]+$/u, '') || '';
  const specific = requestedText.replace(/(?:的)?(?:歌曲|音乐|歌曲吧|音乐吧|歌吧|歌呀|歌啊)$/u, '').trim();
  if (specific && !/(?:放松|舒缓|安静|开心|伤心|难过|欢快|治愈|摇滚|流行|音乐|歌单|随便|一点|一些)/u.test(specific)) {
    return specific.slice(0, 120);
  }

  if (/(?:放松|舒缓|安静|治愈|睡觉|助眠|轻音乐)/u.test(userText)) return 'Nuvole Bianche-Ludovico Einaudi';
  if (/(?:开心|欢快|高兴|快乐)/u.test(userText)) return '好日子-宋祖英';
  if (/(?:伤心|难过|失恋|悲伤)/u.test(userText)) return 'Fix You-Coldplay';
  if (/(?:提神|运动|热血|摇滚|有劲)/u.test(userText)) return 'Hall of Fame-The Script';
  return '起风了-买辣椒也用券';
}

function ensureMusicCommand(reply, messages) {
  const latestUserText = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  if (!MUSIC_REQUEST.test(latestUserText) || /\[\[MUSIC:[\s\S]*?\]\]/u.test(reply)) return reply;

  const query = getFallbackMusicQuery(latestUserText, reply).slice(0, 120);
  const [title, artist] = query.split(/-(.+)/u).filter(Boolean);
  const spokenReply = artist
    ? `好，我给你放一首《${title}》，由${artist}演唱。`
    : `好，我这就为你找《${query}》。`;
  return `[[MUSIC:${JSON.stringify({ query, type: 'wy' })}]]\n${spokenReply}`;
}

function ensureActionReply(reply, messages) {
  const latestUserText = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  if (!ACTION_REQUEST.test(latestUserText) || MUSIC_REQUEST.test(latestUserText) || WEATHER_REQUEST.test(latestUserText)) return reply;
  const supplied = String(reply).match(/\[\[\s*ACTION\s*:\s*([\s\S]*?)\]\]/iu)?.[1];
  if (supplied) {
    try {
      const value = JSON.parse(supplied);
      const valid = Array.isArray(value?.steps) && value.steps.length > 0 && value.steps.every((step) => {
        if (!step || typeof step !== 'object') return false;
        if (step.type === 'walk') return ['forward', 'backward', 'left', 'right'].includes(step.direction) && Number.isInteger(step.steps) && step.steps >= 1 && step.steps <= 10;
        if (step.type === 'dance') return ['crab', 'brazilian', 'maze', 'dream_wings'].includes(step.name);
        if (step.type === 'gesture') return ['hello', 'bow', 'paw', 'salute'].includes(step.name);
        return step.type === 'jump' || step.type === 'stop';
      });
      if (valid) return reply;
    } catch { /* fall through to the deterministic local parser */ }
  }

  const numberValue = (value) => {
    const text = String(value || '').trim();
    if (/^\d+$/u.test(text)) return Number(text);
    const digits = { 零: 0, 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    if (text === '十') return 10;
    if (text.length === 2 && text[0] === '十') return 10 + (digits[text[1]] || 0);
    if (text.length === 2 && text[1] === '十') return (digits[text[0]] || 1) * 10;
    if (text.length === 3 && text[1] === '十') return (digits[text[0]] || 1) * 10 + (digits[text[2]] || 0);
    return digits[text] ?? 1;
  };
  const steps = [];
  const push = (index, step) => steps.push({ index, step });
  const directionMap = { 前: 'forward', 后: 'backward', 左: 'left', 右: 'right' };
  const walkPattern = /(?:往|向|朝)?(前|后|左|右)(?:边)?(?:走|行走|移动|跑)?\s*([0-9一二两三四五六七八九十]{0,3})\s*步?/gu;
  for (const match of latestUserText.matchAll(walkPattern)) {
    const count = Math.max(1, Math.min(10, numberValue(match[2] || '1')));
    push(match.index ?? 0, { type: 'walk', direction: directionMap[match[1]], steps: count });
  }
  const directDirections = [
    [/前进|向前走?/gu, 'forward'], [/后退|向后走?/gu, 'backward'],
    [/左转|向左走?/gu, 'left'], [/右转|向右走?/gu, 'right'],
  ];
  for (const [pattern, direction] of directDirections) {
    for (const match of latestUserText.matchAll(pattern)) {
      if (!steps.some((entry) => entry.index === (match.index ?? 0))) {
        push(match.index ?? 0, { type: 'walk', direction, steps: 1 });
      }
    }
  }
  const dancePattern = /跳(?:个|一段|一支)?舞(?:蹈)?/gu;
  for (const match of latestUserText.matchAll(dancePattern)) {
    push(match.index ?? 0, { type: 'dance', name: 'crab' });
  }
  const gesturePatterns = [
    [/打(?:一下)?招呼|挥手|招手/gu, 'hello'],
    [/敬礼|行礼/gu, 'salute'],
    [/鞠躬|弯腰/gu, 'bow'],
    [/拍手|伸爪|握手/gu, 'paw'],
  ];
  for (const [pattern, name] of gesturePatterns) {
    for (const match of latestUserText.matchAll(pattern)) push(match.index ?? 0, { type: 'gesture', name });
  }
  for (const match of latestUserText.matchAll(/跳一下|跳起来|蹦一下/gu)) {
    push(match.index ?? 0, { type: 'jump' });
  }
  for (const match of latestUserText.matchAll(/停止动作|停止|停下/gu)) {
    push(match.index ?? 0, { type: 'stop' });
  }
  steps.sort((a, b) => a.index - b.index);
  const normalized = steps.map(({ step }) => step);
  if (!normalized.length) normalized.push({ type: 'gesture', name: 'hello' });
  return `[[ACTION:${JSON.stringify({ steps: normalized.slice(0, 12) })}]]\n收到，我马上执行。`;
}

function getFallbackWeatherCity(userText) {
  const location = String.raw`([\p{Script=Han}A-Za-z0-9·-]{2,24}?)`;
  const patterns = [
    new RegExp(`(?:今天|明天|现在|当前)\\s*${location}(?:的)?(?:天气|气温|温度)`, 'u'),
    new RegExp(`(?:查|查询|看看|查看|了解|告诉我)(?:一下)?(?:今天|明天|现在|当前)?${location}(?:的)?(?:天气|气温|温度)`, 'u'),
    new RegExp(`${location}(?:的)?(?:今天天气|天气|气温|温度)(?:怎么样|如何|好吗|情况)?`, 'u'),
  ];

  for (const pattern of patterns) {
    const match = userText.match(pattern);
    if (!match?.[1]) continue;
    const city = match[1]
      .replace(/^(?:(?:我想知道|我想问|请问|问一下|我问|查一下|查询|看看|今天|明天|现在|当前|的|一下))+/u, '')
      .replace(/(?:今天|明天|现在|当前|的)+$/u, '')
      .trim();
    if (city.length >= 2 && city.length <= 24) return city;
  }
  return '';
}

function ensureWeatherCommand(reply, messages) {
  const latestUserText = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
  if (!WEATHER_REQUEST.test(latestUserText) || MUSIC_REQUEST.test(latestUserText) ||
      /\[\[WEATHER:[\s\S]*?\]\]/u.test(reply)) return reply;

  const city = getFallbackWeatherCity(latestUserText);
  return `[[WEATHER:${JSON.stringify({ city })}]]\n我查一下${city ? city + ' ' : ''}的天气。`;
}

async function handleWeather(request, response) {
  let body;
  try {
    body = await readBody(request);
  } catch {
    return sendJson(response, 400, { error: '天气查询请求无效。' });
  }

  const city = typeof body?.city === 'string' ? body.city.trim() : '';
  if (city.length > 80) return sendJson(response, 400, { error: '城市名称过长。' });

  try {
    const endpoint = new URL(WEATHER_API_URL);
    if (city) endpoint.searchParams.set('city', city);
    const upstream = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(18_000),
    });
    if (!upstream.ok) throw new Error(`weather-upstream-${upstream.status}`);
    const data = await upstream.json();
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        (typeof data.weather !== 'string' && !Number.isFinite(Number(data.temperature)))) {
      throw new Error('weather-invalid-response');
    }

    const numberOrNull = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
    return sendJson(response, 200, {
      province: typeof data.province === 'string' ? data.province : '',
      city: typeof data.city === 'string' ? data.city : '',
      district: typeof data.district === 'string' ? data.district : '',
      weather: typeof data.weather === 'string' ? data.weather : '天气信息暂缺',
      weather_icon: typeof data.weather_icon === 'string' ? data.weather_icon : '',
      temperature: numberOrNull(data.temperature),
      feels_like: numberOrNull(data.feels_like),
      wind_direction: typeof data.wind_direction === 'string' ? data.wind_direction : '',
      wind_power: typeof data.wind_power === 'string' ? data.wind_power : '',
      humidity: numberOrNull(data.humidity),
      report_time: typeof data.report_time === 'string' ? data.report_time : '',
    });
  } catch (error) {
    const message = error?.message || '';
    return sendJson(response, 502, {
      error: message.startsWith('weather-upstream-')
        ? '天气服务暂时不可用，请稍后重试。'
        : '暂时无法获取天气数据，请检查网络后重试。',
    });
  }
}

async function handleMusicSearch(request, response) {
  if (!MUSIC_API_KEY) return sendJson(response, 503, { error: '音乐服务密钥未配置，请检查服务端 .env。' });
  let body;
  try {
    body = await readBody(request);
  } catch {
    return sendJson(response, 400, { error: '搜索请求内容无效或过大。' });
  }
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const type = typeof body?.type === 'string' ? body.type : '';
  if (!name || !MUSIC_TYPES.has(type)) {
    return sendJson(response, 400, { error: '请提供歌曲名或歌手，以及有效的音乐平台。' });
  }
  const limit = Math.max(1, Math.min(10, Number.parseInt(body?.limit, 10) || 10));
  try {
    const payload = await requestMusicApi('search', {
      name,
      type,
      page: '1',
      limit: String(limit),
      format: '1',
      pic: '1',
    });
    const rows = unwrapMusicData(payload);
    if (!Array.isArray(rows)) return sendJson(response, 502, { error: '歌曲搜索接口返回的数据格式无法识别。' });
    const songs = rows.map((song) => ({
      id: String(song?.id ?? song?.url_id ?? ''),
      type,
      name: typeof song?.name === 'string' ? song.name : '',
      artist: normalizeArtist(song?.artist),
      album: typeof song?.album === 'string' ? song.album : '',
      pic: typeof song?.pic === 'string' ? song.pic :
        (typeof song?.pic_url === 'string' ? song.pic_url : ''),
    })).filter((song) => song.id && song.name);
    return sendJson(response, 200, { songs });
  } catch (error) {
    const message = error?.message || '';
    return sendJson(response, 502, {
      error: message.startsWith('music-upstream-')
        ? '歌曲搜索服务暂时不可用，请稍后重试。'
        : (message || '连接歌曲搜索服务失败。'),
    });
  }
}

async function handleMusicInfo(request, response) {
  if (!MUSIC_API_KEY) return sendJson(response, 503, { error: '音乐服务密钥未配置，请检查服务端 .env。' });
  let body;
  try {
    body = await readBody(request);
  } catch {
    return sendJson(response, 400, { error: '歌曲详情请求内容无效。' });
  }
  const id = typeof body?.id === 'string' ? body.id.trim().slice(0, 100) : '';
  const type = typeof body?.type === 'string' ? body.type : '';
  if (!id || !MUSIC_TYPES.has(type)) {
    return sendJson(response, 400, { error: '请提供有效的歌曲 ID 和音乐平台。' });
  }
  try {
    const payload = await requestMusicApi('info', {
      id,
      type,
      url: '1',
      pic: '1',
      lrc: '1',
    });
    const data = unwrapMusicData(payload);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return sendJson(response, 502, { error: '歌曲详情接口返回的数据格式无法识别。' });
    }
    return sendJson(response, 200, {
      song: {
        id,
        type,
        name: typeof data.name === 'string' ? data.name : '',
        artist: normalizeArtist(data.artist),
        album: typeof data.album === 'string' ? data.album : '',
        url: typeof data.url === 'string' ? data.url : '',
        pic: typeof data.pic === 'string' ? data.pic : '',
        lrc: typeof data.lrc === 'string' ? data.lrc : '',
      },
    });
  } catch (error) {
    const message = error?.message || '';
    return sendJson(response, 502, {
      error: message.startsWith('music-upstream-')
        ? '歌曲详情服务暂时不可用，请稍后重试。'
        : (message || '连接歌曲详情服务失败。'),
    });
  }
}

async function handleMusicCover(url, response) {
  const target = url.searchParams.get('url') || '';
  let source;
  try {
    source = new URL(target);
  } catch {
    return sendJson(response, 400, { error: '封面地址无效。' });
  }
  if (!['http:', 'https:'].includes(source.protocol) || source.username || source.password) {
    return sendJson(response, 400, { error: '封面地址协议不受支持。' });
  }
  try {
    const upstream = await fetch(source, {
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.5' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!upstream.ok) return sendJson(response, 502, { error: '封面读取失败。' });
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return sendJson(response, 502, { error: '封面格式无效。' });
    const data = Buffer.from(await upstream.arrayBuffer());
    if (data.length > 8_000_000) return sendJson(response, 413, { error: '封面文件过大。' });
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': String(data.length),
    });
    response.end(data);
  } catch {
    sendJson(response, 502, { error: '封面服务暂时不可用。' });
  }
}

const server = createServer(async (request, response) => {
  setSecurityHeaders(response);
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/api/status') {
    return sendJson(response, 200, { ready: Boolean(API_KEY && API_URL), musicReady: Boolean(MUSIC_API_KEY), model: MODEL });
  }

  if (request.method === 'POST' && url.pathname === '/api/chat') {
    if (!API_KEY) return sendJson(response, 503, { error: '尚未配置 API 密钥。请在项目目录的 .env 文件中填写 OPENAI_API_KEY。' });
    if (!API_URL) return sendJson(response, 503, { error: '未配置 AI 接口地址。请在本地 .env 文件中设置 OPENAI_API_URL。' });
    let body;
    try {
      body = await readBody(request);
    } catch {
      return sendJson(response, 400, { error: '请求内容无效或过大。' });
    }
    const messages = normalizeMessages(body?.messages);
    if (!messages) return sendJson(response, 400, { error: '对话内容格式无效。' });
    const requestedModel = typeof body?.model === 'string'
      ? body.model.trim().slice(0, 160) : '';
    const model = requestedModel || MODEL;
    const latestUserText = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    if (ACTION_ONLY_REQUEST.test(latestUserText)) {
      return sendJson(response, 200, { reply: ensureActionReply('收到。', messages), model });
    }
    if (!model) return sendJson(response, 503, { error: '未配置 AI 模型。请在调试台输入模型名称，或在本地 .env 中设置 OPENAI_MODEL。' });

    try {
      const upstream = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
          ],
          temperature: 0.75,
          max_tokens: 260,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!upstream.ok) {
        return sendJson(response, 502, { error: `对话接口暂时不可用（HTTP ${upstream.status}），请检查模型设置或稍后重试。` });
      }
      const data = await upstream.json();
      const raw = data?.choices?.[0]?.message?.content;
      const reply = Array.isArray(raw)
        ? raw.map((part) => typeof part === 'string' ? part : part?.text || '').join('')
        : raw;
      if (typeof reply !== 'string' || !reply.trim()) {
        return sendJson(response, 502, { error: '对话接口没有返回可播放的文字。' });
      }
      const withWeather = ensureWeatherCommand(reply.trim(), messages);
      const withMusic = ensureMusicCommand(withWeather, messages);
      return sendJson(response, 200, { reply: ensureActionReply(withMusic, messages), model });
    } catch {
      return sendJson(response, 502, { error: '连接对话接口失败，请检查网络后重试。' });
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/music/search') {
    return handleMusicSearch(request, response);
  }

  if (request.method === 'POST' && url.pathname === '/api/music/info') {
    return handleMusicInfo(request, response);
  }

  if (request.method === 'GET' && url.pathname === '/api/music/cover') {
    return handleMusicCover(url, response);
  }

  if (request.method === 'POST' && url.pathname === '/api/weather') {
    return handleWeather(request, response);
  }

  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' });
  const file = files.get(url.pathname);
  if (!file) return sendJson(response, 404, { error: 'Not found.' });
  try {
    const content = await readFile(join(ROOT, file[0]));
    response.writeHead(200, {
      'Content-Type': file[1],
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(content);
  } catch {
    sendJson(response, 500, { error: '页面资源暂时不可用。' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`跳跳已启动：http://127.0.0.1:${PORT}`);
});

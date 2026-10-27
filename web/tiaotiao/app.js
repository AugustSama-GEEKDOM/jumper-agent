const display = document.querySelector('#eye-display');
const stage = document.querySelector('#eye-stage');
const musicView = document.querySelector('#music-view');
const musicAudio = document.querySelector('#music-audio');
const musicCover = document.querySelector('#music-cover');
const musicTitle = document.querySelector('#music-title');
const musicArtist = document.querySelector('#music-artist');
const musicAlbum = document.querySelector('#music-album');
const musicLyric = document.querySelector('#music-lyric');
const musicLyricCircle = document.querySelector('.music-lyric-circle');
const musicLyricViewport = document.querySelector('.music-lyric-viewport');
const weatherView = document.querySelector('#weather-view');
const weatherIconOrb = document.querySelector('#weather-icon-orb');
const weatherIcon = document.querySelector('#weather-icon');
const weatherLocation = document.querySelector('#weather-location');
const weatherTemperature = document.querySelector('#weather-temperature');
const weatherCondition = document.querySelector('#weather-condition');
const weatherDetails = document.querySelector('#weather-details');
const weatherUpdated = document.querySelector('#weather-updated');
const musicStop = document.querySelector('#music-stop');
const musicPlayToggle = document.querySelector('#music-play-toggle');
const musicSearchForm = document.querySelector('#music-search-form');
const musicSearchQuery = document.querySelector('#music-search-query');
const musicSearchType = document.querySelector('#music-search-type');
const gaze = document.querySelector('#gaze');
const eyeEffects = document.querySelector('#eye-effects');
const eyePaths = [document.querySelector('#left-eye'), document.querySelector('#right-eye')];
const eyeGroups = [...gaze.querySelectorAll('.eye-group')];
const debugPanel = document.querySelector('#debug-panel');
const expressionButtons = document.querySelector('#expression-buttons');
const debugFields = {
  state: document.querySelector('#debug-state'),
  stateDetail: document.querySelector('#debug-state-detail'),
  recognition: document.querySelector('#debug-recognition'),
  transcript: document.querySelector('#debug-transcript'),
  ai: document.querySelector('#debug-ai'),
  output: document.querySelector('#debug-output'),
  progress: document.querySelector('#debug-progress'),
  progressTrack: document.querySelector('#debug-progress-track'),
  tts: document.querySelector('#debug-tts'),
  ttsDetail: document.querySelector('#debug-tts-detail'),
  ttsProgress: document.querySelector('#debug-tts-progress'),
  ttsProgressTrack: document.querySelector('#debug-tts-progress-track'),
  voiceResource: document.querySelector('#debug-voice-resource'),
  downloadProgress: document.querySelector('#debug-download-progress'),
  resourceProgress: document.querySelector('#debug-resource-progress'),
  resourceProgressTrack: document.querySelector('#debug-resource-progress-track'),
  musicStatus: document.querySelector('#debug-music-status'),
  musicDetail: document.querySelector('#debug-music-detail'),
  weatherStatus: document.querySelector('#debug-weather-status'),
  weatherDetail: document.querySelector('#debug-weather-detail'),
  actionStatus: document.querySelector('#debug-action-status'),
  actionProgress: document.querySelector('#debug-action-progress'),
  actionList: document.querySelector('#debug-action-list'),
  modelName: document.querySelector('#debug-model-name'),
  modelStatus: document.querySelector('#debug-model-status'),
  log: document.querySelector('#debug-log'),
  clock: document.querySelector('#debug-clock'),
};
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = Recognition ? new Recognition() : null;
const speechEngine = window.speechSynthesis || null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const defaultModelName = '';
let modelName = (() => {
  try { return localStorage.getItem('tiaotiao-model-name-v2') || defaultModelName; }
  catch { return defaultModelName; }
})();

const shapes = {
  happy:    { p: [-38, 14, -34, -9, -23, -27, 0, -27, 23, -27, 34, -9, 38, 14], w: 15 },
  open:     { p: [0, -27, 0, -18, 0, -9, 0, 0, 0, 9, 0, 18, 0, 27], w: 30 },
  alert:    { p: [0, -32, 0, -21, 0, -10, 0, 0, 0, 10, 0, 21, 0, 32], w: 34 },
  blink:    { p: [-30, 0, -20, 0, -10, 0, 0, 0, 10, 0, 20, 0, 30, 0], w: 9 },
  sleepy:   { p: [-36, -9, -30, 11, -19, 22, 0, 22, 19, 22, 30, 11, 36, -9], w: 12 },
  // Deliberate left-pointing wink, with upper and lower arms mirrored.
  wink:     { p: [22, -25, 12, -17, -4, -7, -21, 0, -4, 7, 12, 17, 22, 25], w: 15 },
  sad:      { p: [-34, 18, -28, -1, -17, -11, 0, -11, 17, -11, 28, -1, 34, 18], w: 13 },
  angryL:   { p: [-28, -11, -18, -5, -8, 1, 0, 5, 8, 9, 17, 13, 25, 17], w: 24 },
  angryR:   { p: [-25, 17, -17, 13, -8, 9, 0, 5, 8, 1, 18, -5, 28, -11], w: 24 },
  // The puzzled line stays centered and mirrors around x=0, so it reads as a
  // lively wobble instead of a slanted stroke on one side.
  puzzled:  { p: [0, -24, -4, -17, 4, -8, 0, 0, -4, 8, 4, 17, 0, 24], w: 26 },
  wide:     { p: [0, -38, 0, -25, 0, -12, 0, 0, 0, 12, 0, 25, 0, 38], w: 36 },
  tiny:     { p: [0, -16, 0, -11, 0, -5, 0, 0, 0, 5, 0, 11, 0, 16], w: 18 },
  flat:     { p: [-31, 0, -21, 0, -10, 0, 0, 0, 10, 0, 21, 0, 31, 0], w: 11 },
  focused:  { p: [0, -30, 0, -20, 0, -10, 0, 0, 0, 10, 0, 20, 0, 30], w: 22 },
  soft:     { p: [-31, 5, -21, -1, -10, -5, 0, -5, 10, -5, 21, -1, 31, 5], w: 12 },
};
const moods = {
  happy: ['happy', 'happy'], neutral: ['open', 'open'], curious: ['alert', 'alert'],
  wink: ['happy', 'wink'], sleepy: ['sleepy', 'sleepy'], sad: ['sad', 'sad'],
  angry: ['angryL', 'angryR'], surprised: ['wide', 'wide'],
  listening: ['alert', 'alert'], thinking: ['focused', 'focused'],
  synthesis: ['puzzled', 'puzzled'], speaking: ['happy', 'happy'], blink: ['blink', 'blink'],
  excited: ['wide', 'wide'], shy: ['tiny', 'tiny'], unimpressed: ['flat', 'flat'],
  focused: ['focused', 'focused'], confused: ['puzzled', 'puzzled'], calm: ['soft', 'soft'],
  question: ['wide', 'wide'],
};
const labels = {
  idle: '待机监听', listening: '聆听中', thinking: 'AI 思考中',
  synthesis: '准备语音', speaking: '语音播报中', music: '音乐播放中', weather: '天气播报中',
};
const details = {
  idle: '待机观察 · 持续监听「你好跳跳」',
  listening: '唤醒成功 · 等待语音内容',
  thinking: '请求已发送 · 等待模型完整回复',
  synthesis: '回复已收到 · 正在准备语音引擎',
  speaking: '语音已开始 · 正在跟踪播放进度',
  music: '音乐播放期间持续监听「你好跳跳」',
  weather: '天气播报期间持续监听「你好跳跳」',
};

let currentEyes = [shapes.happy, shapes.happy].map(shape => ({ p: [...shape.p], w: shape.w }));
let eyeAnimation = 0;
let gazeAnimation = 0;
let gazePoint = [0, 0];
let gazeWanderTimer;
let state = 'idle';
let restingMood = 'happy';
let idleTimer;
let blinkTimer;
let manualExpressionTimer;
let manualExpressionUntil = 0;
let debugMessages = ['系统已就绪，正在启动持续语音识别'];
let enabled = Boolean(recognition);
let permissionBlocked = false;
let mode = 'wake';
let running = false;
let starting = false;
let processing = false;
let command = '';
let commandBase = '';
let commandOffset = 0;
let ignoredTranscriptLength = 0;
let sessionTranscript = '';
let silenceTimer;
let commandTimer;
let restartTimer;
let retryDelay = 350;
let selectedVoice = null;
let silenceStartedAt = 0;
let silenceProgressTimer;
let voiceResourceState = '正在读取 Edge 语音列表';
let musicRequestSequence = 0;
let musicPageActive = false;
let weatherPageActive = false;
let assistantRunSequence = 0;
let interruptedAssistantRun = 0;
let currentSong = null;
let lyricEntries = [];
let musicHideTimer;
let weatherHideTimer;
let weatherExitTimer;
let actionEndpoint = '';
let actionQueue = [];
let actionRunId = 0;

function renderEye(path, shape) {
  const p = shape.p.map(value => value.toFixed(2));
  path.setAttribute('d', 'M ' + p.slice(0, 2).join(' ') + ' C ' +
    p.slice(2, 8).join(' ') + ' C ' + p.slice(8).join(' '));
  path.setAttribute('stroke-width', shape.w.toFixed(2));
}

function showExpression(name, duration = 260) {
  const pair = moods[name] || moods.neutral;
  stage.dataset.expression = name;
  cancelAnimationFrame(eyeAnimation);
  const from = currentEyes.map(shape => ({ p: [...shape.p], w: shape.w }));
  const targets = pair.map(key => shapes[key]);
  updateGazeWander(name);
  const began = performance.now();
  function frame(now) {
    const progress = reducedMotion ? 1 : Math.min(1, (now - began) / Math.max(1, duration));
    const ease = 1 - (1 - progress) ** 3;
    currentEyes = from.map((shape, index) => ({
      p: shape.p.map((value, i) => value + (targets[index].p[i] - value) * ease),
      w: shape.w + (targets[index].w - shape.w) * ease,
    }));
    eyePaths.forEach((path, index) => renderEye(path, currentEyes[index]));
    if (progress < 1) eyeAnimation = requestAnimationFrame(frame);
  }
  eyeAnimation = requestAnimationFrame(frame);
}

function updateGazeWander(expression = stage.dataset.expression) {
  clearTimeout(gazeWanderTimer);
  const wandering = state === 'thinking' || state === 'listening' || expression === 'question';
  if (!wandering || document.hidden || reducedMotion) return;

  const glance = () => {
    if (document.hidden || (state !== 'thinking' && state !== 'listening' && stage.dataset.expression !== 'question')) return;
    const x = Math.random() * 44 - 22;
    const y = Math.random() * 30 - 15;
    lookAt(x, y, 480 + Math.random() * 300);
    gazeWanderTimer = setTimeout(glance, 1050 + Math.random() * 650);
  };
  gazeWanderTimer = setTimeout(glance, 500);
}

function lookAt(x, y, duration = 600) {
  cancelAnimationFrame(gazeAnimation);
  const from = [...gazePoint];
  const began = performance.now();
  function frame(now) {
    const progress = reducedMotion ? 1 : Math.min(1, (now - began) / duration);
    const ease = 1 - (1 - progress) ** 3;
    gazePoint = [from[0] + (x - from[0]) * ease, from[1] + (y - from[1]) * ease];
    gaze.setAttribute('transform', 'translate(' + gazePoint[0].toFixed(2) + ' ' +
      gazePoint[1].toFixed(2) + ')');
    if (progress < 1) gazeAnimation = requestAnimationFrame(frame);
  }
  gazeAnimation = requestAnimationFrame(frame);
}

function sizeEyesForViewport() {
  const panelTop = debugPanel.getBoundingClientRect().top;
  const eyeRegionHeight = Math.max(1, panelTop - 14);
  const reservedBottom = Math.max(0, window.innerHeight - eyeRegionHeight);
  display.style.setProperty('--content-bottom', reservedBottom + 'px');
  display.style.setProperty('--eye-region-height', eyeRegionHeight + 'px');
  display.toggleAttribute('data-compact', eyeRegionHeight < 220);
  const bounds = stage.getBoundingClientRect();
  const scale = bounds.width < 640 ? 1 : Math.min(bounds.width / 800, bounds.height / 400);
  const viewWidth = bounds.width / scale;
  const viewHeight = bounds.height / scale;
  stage.setAttribute('viewBox', '0 0 ' + viewWidth + ' ' + viewHeight);
  const centers = bounds.width < 640
    ? [viewWidth * .28, viewWidth * .72]
    : [viewWidth * 230 / 800, viewWidth * 570 / 800];
  const eyePixelWidth = Math.min(160, bounds.height * .52, bounds.width * .2);
  const eyeScale = eyePixelWidth / (90 * scale);
  eyeGroups.forEach((group, index) => {
    group.setAttribute('transform', 'translate(' + centers[index] + ' ' +
      viewHeight / 2 + ') scale(' + eyeScale + ')');
  });
  const effectX = Math.min(centers[1] + 58, viewWidth - 24);
  eyeEffects.setAttribute('transform', 'translate(' + effectX + ' ' +
    (viewHeight / 2 - 48) + ') scale(' + eyeScale + ')');
  requestAnimationFrame(refreshMusicLyricScroll);
}

function idleLook() {
  clearTimeout(idleTimer);
  if (manualExpressionUntil > performance.now()) {
    idleTimer = setTimeout(idleLook, manualExpressionUntil - performance.now() + 40);
    return;
  }
  if (state === 'idle' && mode === 'wake' && !document.hidden) {
    const choices = [
      'neutral', 'neutral', 'happy', 'happy', 'curious', 'excited', 'wink',
      'shy', 'unimpressed', 'focused', 'calm', 'sleepy',
    ];
    restingMood = choices[Math.floor(Math.random() * choices.length)];
    showExpression(restingMood, 400);
    lookAt(Math.random() * 38 - 19, Math.random() * 22 - 11, 650);
  }
  idleTimer = setTimeout(idleLook, 2200 + Math.random() * 2800);
}

function blink() {
  if (!document.hidden && manualExpressionUntil <= performance.now()) {
    showExpression('blink', 70);
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(() => {
      if (stage.dataset.expression === 'blink' && manualExpressionUntil <= performance.now()) {
        showExpression(state === 'idle' ? restingMood : state, 150);
      }
    }, 160);
  }
  setTimeout(blink, 3800 + Math.random() * 4200);
}

function updateProgress(field, track, value) {
  if (!field || !track) return;
  const progress = Math.max(0, Math.min(100, Number(value) || 0));
  field.setAttribute('width', String(progress));
  track.setAttribute('aria-valuenow', String(Math.round(progress)));
  track.setAttribute('aria-valuetext', Math.round(progress) + '%');
}

function setDebug(changes) {
  for (const [name, value] of Object.entries(changes)) {
    if (debugFields[name] && !['progress', 'ttsProgress', 'resourceProgress'].includes(name)) {
      debugFields[name].textContent = value;
      if (['output', 'transcript', 'ttsDetail', 'downloadProgress'].includes(name)) {
        debugFields[name].title = value;
      }
    }
    if (name === 'progress') updateProgress(debugFields.progress, debugFields.progressTrack, value);
    if (name === 'ttsProgress') updateProgress(debugFields.ttsProgress, debugFields.ttsProgressTrack, value);
    if (name === 'resourceProgress') {
      updateProgress(debugFields.resourceProgress, debugFields.resourceProgressTrack, value);
    }
  }
}

function setState(next) {
  clearTimeout(manualExpressionTimer);
  manualExpressionUntil = 0;
  state = next;
  stage.dataset.state = next;
  showExpression(next === 'idle' ? restingMood : next);
  const looks = {
    idle: [0, 0], listening: [0, 0], thinking: [13, -10],
    synthesis: [-10, 3], speaking: [0, 0],
  };
  const [x, y] = looks[next] || [0, 0];
  if (next !== 'thinking') lookAt(x, y, next === 'idle' ? 550 : 430);
  setDebug({ state: labels[next] || next, stateDetail: details[next] || '' });
}

function announce(message) {
  display.setAttribute('aria-label', '跳跳的眼睛。' + message);
}

function addDebugLog(message) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  debugMessages = debugMessages.concat('[' + time + '] ' + message).slice(-3);
  debugFields.log.replaceChildren(...debugMessages.map(entry => {
    const row = document.createElement('span');
    row.textContent = entry;
    return row;
  }));
}

function setMusicDebug(status, detail) {
  setDebug({ musicStatus: status, musicDetail: detail });
}

function setWeatherDebug(status, detail) {
  setDebug({ weatherStatus: status, weatherDetail: detail });
}

const musicSourceNames = { wy: '网易云', qq: 'QQ 音乐', kw: '酷我', kg: '酷狗', mg: '咪咕', qi: '千千音乐' };

function formatMediaTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  return String(Math.floor(whole / 60)).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0');
}

function updateMusicDebugProgress() {
  if (!musicPageActive || !currentSong) return;
  const song = currentSong;
  const elapsed = formatMediaTime(musicAudio.currentTime);
  const duration = formatMediaTime(musicAudio.duration);
  const progress = Number.isFinite(musicAudio.duration) && musicAudio.duration > 0
    ? ' · ' + elapsed + '/' + duration : '';
  const lyric = musicLyric.textContent && !musicLyric.textContent.startsWith('暂无可用歌词')
    ? ' · ' + musicLyric.textContent : '';
  const details = [song.name, song.artist, musicSourceNames[song.type] || '音乐'].filter(Boolean).join(' · ');
  setMusicDebug(musicAudio.paused ? '已暂停' : '正在播放', details + progress + lyric);
}

const controlCommandPattern = /\[\[\s*(MUSIC|WEATHER|ACTION)\s*:\s*([\s\S]*?)\]\]/giu;

function stripControlCommands(text, kind = '') {
  const commandName = kind ? String(kind).replace(/[^A-Z]/giu, '') : '(?:MUSIC|WEATHER|ACTION)';
  const completePattern = new RegExp(`\\[\\[\\s*${commandName}\\s*:\\s*[\\s\\S]*?\\]\\]`, 'giu');
  const danglingPattern = new RegExp(`\\[\\[\\s*${commandName}\\s*:[^\\r\\n]*(?:\\r?\\n|$)`, 'giu');
  return String(text || '')
    // The complete form is removed first; the second pass also handles a
    // malformed model marker that never received its closing brackets.
    .replace(completePattern, '')
    .replace(danglingPattern, '')
    .replace(/```[\s\S]*?```/gu, '')
    .replace(/```[\s\S]*$/gu, '')
    .replace(/\u200b/gu, '')
    .replace(/[ \t]{2,}/gu, ' ')
    .trim();
}

function sanitizePlainSpeech(text) {
  return stripControlCommands(text)
    .replace(/<[^>]*>/gu, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
    .replace(/```[\s\S]*?```/gu, '')
    .replace(/```[\s\S]*$/gu, '')
    .replace(/```(?:[a-z]+)?/giu, '')
    .replace(/\*\*([^*\n]+)\*\*/gu, '$1')
    .replace(/\*([\p{L}\p{N}\p{Script=Han}][^*\n]*)\*/gu, '$1')
    .replace(/__([^_\n]+)__/gu, '$1')
    .replace(/_([\p{L}\p{N}\p{Script=Han}][^_\n]*)_/gu, '$1')
    .replace(/~~([^~\n]+)~~/gu, '$1')
    .replace(/(^|\n)\s*#{1,6}\s*/gu, '$1')
    .replace(/(^|\n)\s*\d+[.)]\s+/gu, '$1')
    .replace(/(^|\n)\s*[-+*]\s+/gu, '$1')
    .replace(/(^|\n)\s*>\s*/gu, '$1')
    .replace(/(^|\n)\s*(?:---+|___+|\*\*\*+)\s*(?=\n|$)/gu, '$1')
    .replace(/\|/gu, ' ')
    .replace(/[\[\]{}()<>|_~`#]/gu, '')
    .replace(/\//gu, '除以')
    .replace(/\\/gu, '')
    .replace(/\*/gu, '乘以')
    .replace(/\+/gu, '加')
    .replace(/=/gu, '等于')
    .replace(/%/gu, '百分之')
    .replace(/\^/gu, '次方')
    .replace(/([0-9])\s*[-−]\s*([0-9])/gu, '$1减$2')
    .replace(/[-−]/gu, '，')
    .replace(/[^\p{Script=Han}\p{L}\p{N}\s，。！？；：、“”＂,.!?;:]/gu, '')
    .replace(/\s{2,}/gu, ' ')
    .trim();
}

function parseControlPayload(raw) {
  const candidate = String(raw || '').trim()
    .replace(/^```(?:json|text)?\s*/iu, '')
    .replace(/\s*```$/u, '')
    .trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const objectText = candidate.match(/\{[\s\S]*\}/u)?.[0];
    if (!objectText) return null;
    try { return JSON.parse(objectText); } catch { return null; }
  }
}

function parseMusicCommand(reply) {
  let request = null;
  for (const match of String(reply || '').matchAll(controlCommandPattern)) {
    if (String(match[1]).toUpperCase() !== 'MUSIC') continue;
    const value = parseControlPayload(match[2]);
    const query = typeof value?.query === 'string' ? value.query.trim().slice(0, 120) : '';
    const type = typeof value?.type === 'string' && ['wy', 'qq', 'kw', 'kg', 'mg', 'qi'].includes(value.type)
      ? value.type : 'wy';
    if (query) { request = { query, type }; break; }
  }
  return { request, reply: stripControlCommands(reply, 'MUSIC') };
}

function parseWeatherCommand(reply) {
  let request = null;
  for (const match of String(reply || '').matchAll(controlCommandPattern)) {
    if (String(match[1]).toUpperCase() !== 'WEATHER') continue;
    const value = parseControlPayload(match[2]);
    if (value && typeof value === 'object') {
      const city = typeof value.city === 'string' ? value.city.trim().slice(0, 80) : '';
      request = { city };
      break;
    }
  }
  return { request, reply: stripControlCommands(reply, 'WEATHER') };
}

function parseActionCommand(reply) {
  let plan = null;
  for (const match of String(reply || '').matchAll(controlCommandPattern)) {
    if (String(match[1]).toUpperCase() !== 'ACTION') continue;
    const value = parseControlPayload(match[2]);
    if (!Array.isArray(value?.steps)) continue;
    const steps = value.steps.map((item) => {
      if (!item || typeof item !== 'object') return null;
      const type = String(item.type || '').toLowerCase();
      if (type === 'walk') {
        const direction = ['forward', 'backward', 'left', 'right'].includes(String(item.direction))
          ? String(item.direction) : null;
        const count = Math.max(1, Math.min(10, Math.round(Number(item.steps) || 1)));
        return direction ? { type, direction, steps: count } : null;
      }
      if (type === 'dance') {
        const name = ['crab', 'brazilian', 'maze', 'dream_wings'].includes(String(item.name))
          ? String(item.name) : 'crab';
        return { type, name };
      }
      if (type === 'gesture') {
        const name = ['hello', 'bow', 'paw', 'salute'].includes(String(item.name))
          ? String(item.name) : 'hello';
        return { type, name };
      }
      if (type === 'jump' || type === 'stop') return { type };
      return null;
    }).filter(Boolean).slice(0, 12);
    if (steps.length) { plan = { steps }; break; }
  }
  return { plan, reply: stripControlCommands(reply, 'ACTION') };
}

function actionLabel(step) {
  if (step.type === 'walk') return `走${({ forward: '前', backward: '后', left: '左', right: '右' })[step.direction]} ${step.steps} 步`;
  if (step.type === 'dance') return `跳舞 · ${({ crab: '螃蟹舞', brazilian: '巴西舞', maze: '迷宫舞', dream_wings: '梦幻翅膀' })[step.name] || step.name}`;
  if (step.type === 'gesture') return ({ hello: '打招呼', bow: '鞠躬', paw: '伸爪', salute: '敬礼' })[step.name] || '手势';
  if (step.type === 'jump') return '跳跃';
  return '停止当前动作';
}

function renderActionQueue() {
  if (!debugFields.actionList) return;
  debugFields.actionList.replaceChildren(...actionQueue.map((item) => {
    const row = document.createElement('div');
    row.className = 'action-task-row ' + item.status;
    const mark = document.createElement('span');
    mark.className = 'action-task-mark';
    mark.textContent = item.status === 'done' ? '✓' : item.status === 'running' ? '›' : item.status === 'failed' ? '!' : '·';
    const text = document.createElement('span');
    text.textContent = item.label;
    row.append(mark, text);
    return row;
  }));
  const total = actionQueue.length;
  const done = actionQueue.filter((item) => item.status === 'done').length;
  const running = actionQueue.some((item) => item.status === 'running');
  const failed = actionQueue.some((item) => item.status === 'failed');
  const status = failed ? '执行失败' : running ? `执行中 · ${done + 1}/${total}` : total && done === total ? '全部完成' : '等待执行';
  setDebug({ actionStatus: status, actionProgress: (total ? Math.round(done / total * 100) : 0) + '%' });
}

async function executeActionPlan(plan, runId) {
  if (!plan?.steps?.length) return;
  actionRunId += 1;
  const localRun = actionRunId;
  actionQueue = plan.steps.map((step) => ({ step, label: actionLabel(step), status: 'pending' }));
  renderActionQueue();
  addDebugLog('动作任务已创建 · ' + actionQueue.length + ' 项');
  for (const item of actionQueue) {
    if (localRun !== actionRunId || runId !== assistantRunSequence) return;
    item.status = 'running';
    renderActionQueue();
    if (!actionEndpoint) {
      item.status = 'failed';
      renderActionQueue();
      addDebugLog('动作桥未连接 · ' + item.label);
      return;
    }
    try {
      const response = await fetch(actionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.step),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || '动作桥未响应');
      item.status = 'done';
      renderActionQueue();
    } catch (error) {
      item.status = 'failed';
      renderActionQueue();
      addDebugLog('动作失败 · ' + item.label + ' · ' + (error?.message || '连接失败'));
      return;
    }
  }
  addDebugLog('动作任务完成 · ' + actionQueue.length + ' 项');
}

function weatherKind(weather, iconCode = '') {
  const text = String(weather || '').toLowerCase();
  const code = String(iconCode || '');
  if (/(?:雷|storm|thunder)/u.test(text) || /^9/u.test(code)) return 'stormy';
  if (/(?:雪|snow|冰雹|霰)/u.test(text) || /^7/u.test(code)) return 'snowy';
  if (/(?:雨|rain|阵雨|毛毛雨|冻雨)/u.test(text) || /^3|^4/u.test(code)) return 'rainy';
  if (/(?:雾|霾|沙尘|fog|haze|dust)/u.test(text) || /^5|^6/u.test(code)) return 'foggy';
  if (/(?:阴|云|cloud|overcast)/u.test(text) || /^1|^2/u.test(code)) return 'cloudy';
  return 'sunny';
}

function weatherNumber(value, suffix = '') {
  if (!Number.isFinite(Number(value))) return '';
  const rounded = Math.round(Number(value) * 10) / 10;
  return String(rounded) + suffix;
}

function resetWeatherView() {
  weatherLocation.textContent = '正在定位';
  weatherTemperature.textContent = '--°';
  weatherCondition.textContent = '读取天气中';
  weatherDetails.replaceChildren();
  weatherUpdated.textContent = '';
  weatherIconOrb.dataset.kind = 'sunny';
}

function renderWeather(data) {
  const place = [data.city || data.province, data.district].filter(Boolean).join(' · ') || '当前位置';
  const temperature = weatherNumber(data.temperature, '°');
  const condition = data.weather || '天气信息暂缺';
  weatherLocation.textContent = place;
  weatherTemperature.textContent = temperature || '--°';
  weatherCondition.textContent = condition;
  weatherIconOrb.dataset.kind = weatherKind(condition, data.weather_icon);
  const details = [
    Number.isFinite(Number(data.feels_like)) ? '体感 ' + weatherNumber(data.feels_like, '°') : '',
    data.wind_direction || data.wind_power ? [data.wind_direction, data.wind_power].filter(Boolean).join(' ') : '',
    Number.isFinite(Number(data.humidity)) ? '湿度 ' + weatherNumber(data.humidity, '%') : '',
  ].filter(Boolean);
  weatherDetails.replaceChildren(...details.map((text) => {
    const span = document.createElement('span');
    span.textContent = text;
    return span;
  }));
  weatherUpdated.textContent = data.report_time ? '更新于 ' + data.report_time : '实时天气';
}

function enterWeatherPage(data) {
  clearTimeout(weatherExitTimer);
  clearTimeout(weatherHideTimer);
  resetWeatherView();
  renderWeather(data);
  weatherView.hidden = false;
  weatherPageActive = true;
  musicPageActive = false;
  display.classList.remove('music-mode');
  display.classList.add('weather-mode');
  mode = 'weather';
  setState('weather');
  const place = [data.city || data.province, data.district].filter(Boolean).join(' · ') || '当前位置';
  setWeatherDebug('天气已就绪', place + ' · ' + (data.weather || '天气信息暂缺') +
    (Number.isFinite(Number(data.temperature)) ? ' · ' + weatherNumber(data.temperature, '°') : ''));
  setDebug({ recognition: '天气播报中 · 持续监听唤醒词', transcript: '说「你好跳跳」即可返回表情页' });
  announce('正在播报天气 · ' + place);
}

function leaveWeatherPage(reason = '已返回表情页') {
  const wasActive = weatherPageActive || !weatherView.hidden;
  clearTimeout(weatherExitTimer);
  clearTimeout(weatherHideTimer);
  weatherPageActive = false;
  try { speechEngine?.cancel(); } catch { /* no-op */ }
  display.classList.remove('weather-mode');
  weatherHideTimer = setTimeout(() => {
    if (!weatherPageActive) weatherView.hidden = true;
  }, 520);
  mode = 'wake';
  setWeatherDebug('已退出天气', reason);
  if (wasActive) addDebugLog('天气页面已结束 · ' + reason);
  setState('idle');
  setDebug({
    recognition: permissionBlocked ? '麦克风权限受限' : (running ? '持续监听唤醒词' : '语音服务自动重连'),
    transcript: '待机 · 等待「你好跳跳」',
  });
  announce('已返回表情页');
}

function scheduleWeatherExit() {
  clearTimeout(weatherExitTimer);
  weatherExitTimer = setTimeout(() => leaveWeatherPage('天气播报完成 · 3 秒后自动返回'), 3000);
}

async function queryWeather(city = '', origin = 'voice') {
  const requestedCity = String(city || '').trim().slice(0, 80);
  const locationLabel = requestedCity || '当前位置';
  setWeatherDebug('正在查询', requestedCity
    ? '传 city=' + requestedCity
    : '未传 city · 按接口 IP 自动定位');
  setDebug({ ai: '正在获取天气', output: '查询 ' + locationLabel + ' · 等待天气接口', progress: 84 });
  addDebugLog('开始查询天气 · ' + locationLabel);
  try {
    const response = await fetch('/api/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestedCity ? { city: requestedCity } : {}),
      signal: AbortSignal.timeout(22000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '天气查询失败。');
    enterWeatherPage(data);
    setDebug({ ai: '天气数据已就绪', output: '已解析天气 · ' + (data.city || '当前位置'), progress: 100 });
    addDebugLog('天气数据已获取 · ' + (data.city || '当前位置'));
    const place = [data.city || data.province, data.district].filter(Boolean).join(' · ') || '当前位置';
    const temp = Number.isFinite(Number(data.temperature)) ? '，当前 ' + weatherNumber(data.temperature, '度') : '';
    const feels = Number.isFinite(Number(data.feels_like)) ? '，体感 ' + weatherNumber(data.feels_like, '度') : '';
    const spoken = `${place}现在${data.weather || '天气信息暂缺'}${temp}${feels}。${data.wind_direction || data.wind_power ? '风力' + [data.wind_direction, data.wind_power].filter(Boolean).join(' ') + '。' : ''}`;
    setState('synthesis');
    setDebug({ tts: '准备天气播报', ttsDetail: spoken, ttsProgress: 0 });
    const result = await speakReply(spoken);
    if (result.ok) {
      setWeatherDebug('播报完成', spoken + ' · 3 秒后返回表情页');
      setDebug({ tts: '天气播报完成', ttsDetail: '播报结束 · 3 秒后返回表情页', ttsProgress: 100 });
      scheduleWeatherExit();
    } else {
      setWeatherDebug('播报失败', result.reason + ' · 3 秒后返回表情页');
      setDebug({ tts: '天气播报失败', ttsDetail: result.reason + ' · 3 秒后返回表情页' });
      scheduleWeatherExit();
    }
    return { ok: true, data };
  } catch (error) {
    const message = error?.message || '天气查询失败。';
    setWeatherDebug('查询失败', message);
    setDebug({ ai: '天气处理失败', output: message, progress: 100 });
    addDebugLog('天气查询失败 · ' + message);
    if (origin === 'voice' && speechEngine) speakReply('抱歉，暂时无法获取天气信息。').catch(() => {});
    setState('idle');
    return { ok: false, error: message };
  }
}

function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href : '';
  } catch {
    return '';
  }
}

function parseLyrics(lrc) {
  if (typeof lrc !== 'string' || !lrc.trim()) return [];
  const entries = [];
  for (const line of lrc.split(/\r?\n/u)) {
    const match = line.match(/^\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\](.*)$/u);
    if (!match) continue;
    const fraction = match[3] ? Number('0.' + match[3]) : 0;
    const text = match[4].trim();
    if (!text) continue;
    entries.push({
      time: Number(match[1]) * 60 + Number(match[2]) + fraction,
      text,
    });
  }
  return entries.sort((left, right) => left.time - right.time);
}

function refreshMusicLyricScroll() {
  if (musicView.hidden || !musicPageActive) return;
  const textWidth = musicLyric.getBoundingClientRect().width;
  const viewportWidth = musicLyricViewport.clientWidth;
  if (!textWidth || !viewportWidth) return;

  const overflow = Math.ceil(textWidth - viewportWidth);
  const shouldScroll = overflow > 1;
  musicLyricCircle.dataset.overflow = String(shouldScroll);
  if (shouldScroll) {
    musicLyricCircle.style.setProperty('--lyric-overflow', overflow + 'px');
    musicLyricCircle.style.setProperty('--lyric-duration',
      Math.min(30, Math.max(9, overflow / 22)) + 's');
  } else {
    musicLyricCircle.style.removeProperty('--lyric-overflow');
    musicLyricCircle.style.removeProperty('--lyric-duration');
  }
}

function setVisibleLyric(text) {
  if (musicLyric.textContent === text) return;
  musicLyric.textContent = text;
  requestAnimationFrame(refreshMusicLyricScroll);
}

function updateMusicLyric() {
  if (!currentSong) return;
  if (!lyricEntries.length) {
    setVisibleLyric('暂无可用歌词 · 正在播放');
    return;
  }
  const time = musicAudio.currentTime || 0;
  let active = lyricEntries[0];
  for (const entry of lyricEntries) {
    if (entry.time > time) break;
    active = entry;
  }
  setVisibleLyric(active.text);
}

function enterMusicPage(song) {
  weatherPageActive = false;
  clearTimeout(weatherExitTimer);
  clearTimeout(weatherHideTimer);
  weatherView.hidden = true;
  display.classList.remove('weather-mode');
  currentSong = song;
  lyricEntries = parseLyrics(song.lrc);
  musicTitle.textContent = song.name || '未知歌曲';
  musicArtist.textContent = song.artist || '未知歌手';
  musicAlbum.textContent = song.album ? '专辑 · ' + song.album : '';
  setVisibleLyric(lyricEntries[0]?.text || '暂无可用歌词 · 正在播放');
  const cover = safeExternalUrl(song.pic);
  musicCover.onerror = () => {
    // Keep playback usable if an upstream image blocks the local proxy.
    const fallback = safeExternalUrl(song.pic);
    if (fallback && musicCover.src !== fallback) musicCover.src = fallback;
  };
  if (cover) musicCover.src = '/api/music/cover?url=' + encodeURIComponent(cover);
  else musicCover.removeAttribute('src');
  musicStop.textContent = '停止播放';
  musicView.hidden = false;
  musicPageActive = true;
  processing = false;
  mode = 'music';
  setState('music');
  setMusicDebug('歌曲已就绪', '已获取音频、封面和歌词 · 正在开始播放');
  setDebug({ recognition: '音乐播放中 · 持续监听唤醒词', transcript: '播放期间说「你好跳跳」即可退出' });
  musicPlayToggle.textContent = '暂停播放';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (musicPageActive) display.classList.add('music-mode');
    });
    requestAnimationFrame(refreshMusicLyricScroll);
  });
  announce('正在播放音乐 · ' + song.name);
}

function leaveMusicPage(reason = '已停止播放') {
  const wasActive = musicPageActive || !musicView.hidden;
  musicRequestSequence += 1;
  musicPageActive = false;
  mode = 'wake';
  musicAudio.pause();
  musicAudio.removeAttribute('src');
  musicAudio.load();
  display.classList.remove('music-mode');
  clearTimeout(musicHideTimer);
  musicHideTimer = setTimeout(() => {
    if (!musicPageActive) musicView.hidden = true;
  }, 520);
  musicStop.textContent = '停止播放';
  lyricEntries = [];
  currentSong = null;
  setMusicDebug('已退出音乐', reason);
  if (wasActive) addDebugLog('音乐播放已结束 · ' + reason);
  if (wasActive) setState('idle');
  setDebug({
    recognition: permissionBlocked ? '麦克风权限受限' : (running ? '持续监听唤醒词' : '语音服务自动重连'),
    transcript: '待机 · 等待「你好跳跳」',
  });
  announce('已退出音乐播放');
}

async function playMusicByQuery(query, type = 'wy', origin = 'voice') {
  const name = String(query || '').trim().slice(0, 120);
  if (!name) return { ok: false, error: '请输入歌名或歌手。' };
  const requestId = ++musicRequestSequence;
  const sourceName = musicSourceNames[type] || musicSourceNames.wy;
  setMusicDebug('正在搜索', sourceName + ' · ' + name);
  addDebugLog('开始搜索歌曲 · ' + name + ' · ' + sourceName);
  try {
    const searchResponse = await fetch('/api/music/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, page: 1, limit: 10 }),
      signal: AbortSignal.timeout(22000),
    });
    const searchData = await searchResponse.json();
    if (!searchResponse.ok) throw new Error(searchData.error || '歌曲搜索失败。');
    if (requestId !== musicRequestSequence) return { ok: false, cancelled: true };
    const first = searchData?.songs?.[0];
    if (!first?.id) throw new Error('没有找到匹配歌曲，请换个平台或关键词。');
    setMusicDebug('已找到歌曲', [first.name, first.artist].filter(Boolean).join(' · ') + ' · 正在获取播放信息');
    setDebug({ ai: '正在获取歌曲信息', output: first.name + (first.artist ? ' · ' + first.artist : ''), progress: 88 });
    const infoResponse = await fetch('/api/music/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: first.id, type: first.type || type }),
      signal: AbortSignal.timeout(22000),
    });
    const infoData = await infoResponse.json();
    if (!infoResponse.ok) throw new Error(infoData.error || '读取歌曲信息失败。');
    if (requestId !== musicRequestSequence) return { ok: false, cancelled: true };
    const song = { ...first, ...infoData.song };
    const audioUrl = safeExternalUrl(song.url);
    if (!audioUrl) throw new Error('歌曲信息中没有有效的 MP3 地址。');
    enterMusicPage(song);
    musicAudio.src = audioUrl;
    musicAudio.load();
    try {
      await musicAudio.play();
      if (requestId !== musicRequestSequence || !musicPageActive) return { ok: false, cancelled: true };
      setMusicDebug('正在播放', [song.name, song.artist].filter(Boolean).join(' · ') + ' · 持续监听唤醒词');
      setDebug({ ai: '音乐已开始播放', output: song.name + (song.artist ? ' · ' + song.artist : ''), progress: 100 });
      addDebugLog('开始播放 · ' + song.name);
      return { ok: true, song };
    } catch (error) {
      if (requestId !== musicRequestSequence || !musicPageActive) return { ok: false, cancelled: true };
      musicPlayToggle.textContent = '开始播放';
      setMusicDebug('等待开始播放', error?.name === 'NotAllowedError'
        ? '浏览器需要一次点击授权播放 · 点击眼睛区域的按钮继续'
        : '播放启动失败 · 点击按钮重试');
      setDebug({ ai: '歌曲已就绪', output: song.name + ' · 点击“开始播放”启动音频', progress: 100 });
      addDebugLog('浏览器未自动启动音频 · 等待点击播放');
      return { ok: true, song, needsGesture: true };
    }
  } catch (error) {
    if (requestId !== musicRequestSequence) return { ok: false, cancelled: true };
    const message = error?.message || '音乐播放准备失败。';
    setMusicDebug('搜索或播放失败', message);
    setDebug({ ai: '音乐处理失败', output: message, progress: 100 });
    addDebugLog('音乐处理失败 · ' + message);
    announce('音乐暂时无法播放 · ' + message);
    if (origin === 'voice' && speechEngine) {
      speakReply('抱歉，这首歌暂时无法播放。你可以换个平台或再试一次。').catch(() => {});
    }
    return { ok: false, error: message };
  }
}

function updateDebugClock() {
  debugFields.clock.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

debugPanel.addEventListener('click', event => event.stopPropagation());

const modelConfigForm = document.querySelector('#model-config-form');
debugFields.modelName.value = modelName;
debugFields.modelStatus.textContent = modelName ? '当前：' + modelName : '当前：未配置模型';
modelConfigForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const next = debugFields.modelName.value.trim().slice(0, 160);
  modelName = next || defaultModelName;
  debugFields.modelName.value = modelName;
  debugFields.modelStatus.textContent = modelName ? '当前：' + modelName : '当前：未配置模型';
  try { localStorage.setItem('tiaotiao-model-name-v2', modelName); } catch { /* storage may be disabled */ }
  setDebug({ ai: '模型名称已更新', output: modelName ? '下一次请求使用 ' + modelName : '模型未配置' });
  addDebugLog(modelName ? '会话模型切换 → ' + modelName : '模型设置已清空');
});

const backgroundConfigForm = document.querySelector('#background-config-form');
const backgroundPreset = document.querySelector('#background-preset');
const backgroundColor = document.querySelector('#background-color');
const backgroundColorStatus = document.querySelector('#background-color-status');
const manualListenButton = document.querySelector('#manual-listen');
const backgroundPresets = new Set(['#000000', '#00ff00']);
const normalizeBackgroundColor = value => {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/u.test(color) ? color : '#000000';
};
function applyBackgroundColor(value, announceChange = false) {
  const color = normalizeBackgroundColor(value);
  document.documentElement.style.setProperty('--page-background', color);
  backgroundColor.value = color;
  backgroundPreset.value = backgroundPresets.has(color) ? color : 'custom';
  backgroundColorStatus.textContent = '当前：' + color;
  try { localStorage.setItem('tiaotiao-background-color', color); } catch { /* storage may be disabled */ }
  if (announceChange) {
    setDebug({ output: '背景颜色已更新 · ' + color });
    addDebugLog('网页背景颜色已更新 · ' + color);
  }
}
let savedBackgroundColor = '#000000';
try { savedBackgroundColor = normalizeBackgroundColor(localStorage.getItem('tiaotiao-background-color')); } catch { /* storage may be disabled */ }
applyBackgroundColor(savedBackgroundColor);
backgroundPreset.addEventListener('change', () => {
  if (backgroundPreset.value !== 'custom') applyBackgroundColor(backgroundPreset.value, true);
  else backgroundColor.focus();
});
backgroundColor.addEventListener('input', () => applyBackgroundColor(backgroundColor.value, true));
backgroundConfigForm.addEventListener('submit', event => event.preventDefault());

function enterManualListening() {
  if (musicPageActive) leaveMusicPage('手动进入聆听状态');
  if (weatherPageActive) leaveWeatherPage('手动进入聆听状态');
  try { speechEngine?.cancel(); } catch { /* no-op */ }
  clearCommandTimers();
  // If an older AI or weather task is still finishing, prevent its finally
  // block from restoring the page state after this manual transition.
  if (processing) {
    interruptedAssistantRun = assistantRunSequence;
    processing = false;
  }
  mode = 'command';
  command = '';
  commandBase = '';
  commandOffset = sessionTranscript.length;
  ignoredTranscriptLength = sessionTranscript.length;
  setState('listening');
  announce('正在聆听');
  setDebug({
    recognition: permissionBlocked ? '麦克风权限受限' : '手动进入聆听状态',
    transcript: permissionBlocked ? '请允许麦克风权限后再说话' : '已跳过唤醒词 · 请直接说出指令',
    stateDetail: '手动聆听中 · 静音 ' + (SILENCE_MS / 1000).toFixed(1) + ' 秒后提交给 AI',
  });
  addDebugLog('手动进入聆听状态');
  commandTimer = setTimeout(finishCommand, 18000);
  if (enabled && !permissionBlocked && recognition && !running) scheduleRecognition(100);
}

manualListenButton.addEventListener('click', enterManualListening);

musicSearchForm.addEventListener('submit', async event => {
  event.preventDefault();
  const query = musicSearchQuery.value.trim();
  if (!query) {
    musicSearchQuery.focus();
    setMusicDebug('需要搜索词', '请输入歌曲名或歌手名');
    return;
  }
  const submitButton = musicSearchForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  await playMusicByQuery(query, musicSearchType.value, 'manual');
  submitButton.disabled = false;
});

musicPlayToggle.addEventListener('click', async () => {
  if (!musicPageActive || !currentSong) return;
  if (!musicAudio.paused) {
    musicAudio.pause();
    musicPlayToggle.textContent = '继续播放';
    setMusicDebug('已暂停', currentSong.name + ' · 点击继续播放');
    return;
  }
  try {
    await musicAudio.play();
    musicPlayToggle.textContent = '暂停播放';
    setMusicDebug('正在播放', [currentSong.name, currentSong.artist].filter(Boolean).join(' · ') + ' · 持续监听唤醒词');
  } catch (error) {
    musicPlayToggle.textContent = '开始播放';
    setMusicDebug('播放启动失败', error?.message || '点击后仍无法播放，请检查音频地址');
  }
});

musicStop.addEventListener('click', () => {
  if (musicPageActive) leaveMusicPage('手动停止播放');
});

musicAudio.addEventListener('playing', () => {
  if (!musicPageActive || !currentSong) return;
  musicPlayToggle.textContent = '暂停播放';
  musicStop.textContent = '停止';
  updateMusicDebugProgress();
});
musicAudio.addEventListener('pause', () => {
  if (!musicPageActive || !currentSong || musicAudio.ended) return;
  musicPlayToggle.textContent = '继续播放';
  updateMusicDebugProgress();
});
musicAudio.addEventListener('timeupdate', updateMusicLyric);
musicAudio.addEventListener('timeupdate', updateMusicDebugProgress);
musicAudio.addEventListener('loadedmetadata', updateMusicDebugProgress);
musicAudio.addEventListener('durationchange', updateMusicDebugProgress);
musicAudio.addEventListener('ended', () => leaveMusicPage('歌曲播放完成'));
musicAudio.addEventListener('error', () => {
  if (!musicPageActive || !currentSong) return;
  musicPlayToggle.textContent = '重试播放';
  setMusicDebug('音频加载失败', '音源可能已失效 · 说「你好跳跳」或手动换平台重试');
  addDebugLog('音频加载失败 · 可尝试其他音乐平台');
});

const previewMoods = [
  'neutral', 'happy', 'wink', 'curious', 'sleepy', 'sad', 'angry', 'surprised',
  'excited', 'shy', 'unimpressed', 'focused', 'confused', 'calm', 'question',
];
const expressionLabels = Object.fromEntries(
  [...expressionButtons.querySelectorAll('button[data-expression]')]
    .map(button => [button.dataset.expression, button.textContent.trim()]),
);

function playExpressionOnce(name) {
  if (!moods[name]) return;
  clearTimeout(manualExpressionTimer);
  manualExpressionUntil = performance.now() + 1350;
  clearTimeout(idleTimer);
  showExpression(name, 180);
  lookAt(0, 0, 220);
  addDebugLog('手动预览表情 · ' + (expressionLabels[name] || name));
  manualExpressionTimer = setTimeout(() => {
    manualExpressionUntil = 0;
    showExpression(state === 'idle' ? restingMood : state, 240);
    if (state === 'idle') idleTimer = setTimeout(idleLook, 1300);
  }, 1150);
}

expressionButtons.addEventListener('click', event => {
  const button = event.target.closest('button[data-expression]');
  if (button) playExpressionOnce(button.dataset.expression);
});

display.addEventListener('keydown', event => {
  if (previewMoods[event.key] && state === 'idle') {
    playExpressionOnce(previewMoods[event.key]);
  }
});

// Speech recognition often confuses the robot name's homophones or inserts
// punctuation between syllables. Keep the phrase short but accept the common
// variants users naturally say: 你好跳跳、你好挑挑、你好调调.
const WAKE_WORDS = /(?:你\s*[好号浩]|您\s*[好号浩]|嗨|嘿)\s*[，,。.!！?？、…]*\s*[跳挑调吊]\s*[跳挑调吊]/iu;
const SILENCE_MS = 1500;

function setVoiceResource(status, description, percent) {
  voiceResourceState = status;
  setDebug({
    voiceResource: status,
    downloadProgress: description,
    resourceProgress: percent,
  });
}

function chooseVoice() {
  if (!speechEngine) {
    setVoiceResource('此浏览器不支持语音合成', 'Web Speech API 不可用', 0);
    return null;
  }
  const voices = speechEngine.getVoices() || [];
  const exact = voices.find(voice => /Microsoft Yunxia Online \(Natural\)/i.test(voice.name));
  const yunxia = voices.find(voice => /Yunxia|云霞/i.test(voice.name));
  const chinese = voices.find(voice => /^zh-CN$/i.test(voice.lang));
  selectedVoice = exact || yunxia || chinese || null;

  if (!voices.length) {
    setVoiceResource('正在读取 Edge 语音列表', '等待 voiceschanged · 浏览器不提供下载进度', 15);
  } else if (exact || yunxia) {
    setVoiceResource('已找到 Yunxia 中文语音',
      selectedVoice.name + ' · Edge 托管语音，无可读取的下载百分比', 100);
  } else if (chinese) {
    setVoiceResource('使用中文备用语音',
      selectedVoice.name + ' · 未找到 Yunxia；无可读取的下载百分比', 100);
  } else {
    setVoiceResource('使用浏览器默认语音',
      voices.length + ' 个音色 · 未找到中文匹配项；无可读取的下载百分比', 100);
  }
  return selectedVoice;
}

function waitForVoices(timeout = 2600) {
  const initial = chooseVoice();
  if (initial || !speechEngine) return Promise.resolve(initial);
  return new Promise(resolve => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      speechEngine.removeEventListener('voiceschanged', done);
      resolve(chooseVoice());
    };
    const timer = setTimeout(done, timeout);
    speechEngine.addEventListener('voiceschanged', done);
  });
}

function setTts(status, detail, progress) {
  setDebug({ tts: status, ttsDetail: detail });
  if (progress !== undefined) updateProgress(debugFields.ttsProgress, debugFields.ttsProgressTrack, progress);
}

function synthesizeAndPlay(text, voice) {
  return new Promise(resolve => {
    if (!speechEngine || !window.SpeechSynthesisUtterance || !text) {
      resolve({ ok: false, started: false, reason: '浏览器不支持语音合成' });
      return;
    }

    let utterance;
    try {
      utterance = new SpeechSynthesisUtterance(text);
    } catch {
      resolve({ ok: false, started: false, reason: '无法创建语音合成任务' });
      return;
    }
    utterance.lang = voice?.lang || 'zh-CN';
    utterance.rate = .98;
    if (voice) utterance.voice = voice;

    let finished = false;
    let started = false;
    let hasBoundary = false;
    let lastProgress = 0;
    let startedAt = 0;
    let watchdog;
    let estimateTimer;

    const finish = result => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      clearInterval(estimateTimer);
      resolve({ ...result, started });
    };

    utterance.onstart = () => {
      if (finished) return;
      started = true;
      startedAt = performance.now();
      setState('speaking');
      announce('正在播报');
      setTts('正在播报', '语音引擎已启动 · 等待播放结束事件', 1);
      addDebugLog('语音引擎开始播放');
      const estimatedDuration = Math.max(2500, text.length * 1000 / 4.5);
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        setTts('播报超时，已停止', '超过安全时限仍未结束 · 已释放播报状态', lastProgress);
        finish({ ok: false, reason: '语音播报超时' });
        try { speechEngine.cancel(); } catch { /* no-op */ }
      }, Math.min(90000, Math.max(18000, estimatedDuration * 3 + 8000)));
      estimateTimer = setInterval(() => {
        if (finished) return;
        const elapsed = performance.now() - startedAt;
        const percent = Math.min(96, Math.max(lastProgress, elapsed / estimatedDuration * 100));
        lastProgress = percent;
        const description = hasBoundary
          ? Math.round(percent) + '% · 逐字事件停更，按时长补估'
          : '约 ' + Math.min(text.length, Math.round(text.length * percent / 100)) +
            '/' + text.length + ' 字 · 按时长估算';
        setTts('正在播报', description, percent);
      }, 450);
    };

    utterance.onboundary = event => {
      if (finished || !started || !Number.isFinite(event.charIndex)) return;
      hasBoundary = true;
      const start = Math.max(0, Math.min(text.length, event.charIndex));
      const length = Number.isFinite(event.charLength) && event.charLength > 0
        ? event.charLength : 1;
      const count = Math.min(text.length, start + length);
      lastProgress = Math.min(99, Math.max(lastProgress, count / text.length * 100));
      setTts('正在播报', count + '/' + text.length +
        ' 字 · Web Speech 逐字播放事件', lastProgress);
    };

    utterance.onend = () => {
      if (finished) return;
      setTts('播放完成', '播报自然结束 · ' + text.length + ' 字',
        100);
      finish({
        ok: true,
        reason: '播放完成',
        elapsedMs: Math.round(performance.now() - startedAt),
      });
    };

    utterance.onerror = event => {
      if (finished) return;
      const reason = event.error || '未知语音错误';
      setTts('语音播放失败', 'Web Speech 错误：' + reason, lastProgress);
      finish({ ok: false, reason });
    };

    watchdog = setTimeout(() => {
      setTts('引擎启动超时', '12 秒内没有 onstart · 已取消待处理语音', 0);
      finish({ ok: false, reason: '语音引擎启动超时' });
      try { speechEngine.cancel(); } catch { /* no-op */ }
    }, 12000);

    try {
      if (speechEngine.paused) speechEngine.resume();
      speechEngine.speak(utterance);
    } catch (error) {
      finish({ ok: false, reason: error.message || '语音任务提交失败' });
    }
  });
}

async function speakReply(text) {
  if (!speechEngine) return { ok: false, started: false, reason: '浏览器不支持语音合成' };
  const spokenText = sanitizePlainSpeech(text);
  if (!spokenText) return { ok: false, started: false, reason: '没有可播报的自然语言内容' };
  const voice = await waitForVoices();
  setTts('提交语音任务', spokenText.length + ' 字 · ' +
    (voice?.name || 'Edge 默认声音') + ' · 等待引擎确认开始', 0);
  setVoiceResource(voice ? '语音资源已就绪' : '使用浏览器默认语音',
    '语音由 Edge 管理 · Web Speech 不提供音频下载或网络百分比', 100);
  addDebugLog('语音任务已提交 · ' + spokenText.length + ' 字');

  let result = await synthesizeAndPlay(spokenText, voice);
  if (!result.ok && voice && !result.started) {
    addDebugLog('音色启动失败 · 正在切换浏览器默认声音');
    setState('synthesis');
    setTts('切换备用语音', 'Yunxia 未能启动 · 再试 Edge 默认声音', 0);
    await new Promise(resolve => setTimeout(resolve, 180));
    result = await synthesizeAndPlay(spokenText, null);
  }
  return result;
}

function clearCommandTimers() {
  clearTimeout(silenceTimer);
  clearTimeout(commandTimer);
  clearInterval(silenceProgressTimer);
}

function startWakeCommand(match) {
  clearCommandTimers();
  commandOffset = ignoredTranscriptLength + match.index + match[0].length;
  command = '';
  commandBase = '';
  mode = 'command';
  setState('listening');
  announce('正在聆听');
  setDebug({
    recognition: '已检测到唤醒词',
    transcript: '「你好跳跳」已唤醒 · 等待指令',
    stateDetail: '唤醒成功 · 请继续说话，静音后自动提交',
  });
  addDebugLog('已检测到唤醒词「你好跳跳」');
  commandTimer = setTimeout(finishCommand, 18000);
}

function scheduleRecognition(delay = 350) {
  clearTimeout(restartTimer);
  if (!enabled || !recognition || permissionBlocked || running || starting) return;
  restartTimer = setTimeout(startRecognition, delay);
}

function watchMicrophonePermission() {
  if (!navigator.permissions?.query) return;
  navigator.permissions.query({ name: 'microphone' }).then(permission => {
    permission.onchange = () => {
      if (permission.state !== 'granted' || !permissionBlocked) return;
      permissionBlocked = false;
      retryDelay = 350;
      setDebug({
        recognition: '麦克风权限已允许 · 自动重连',
        transcript: '权限已更新 · 正在恢复持续语音识别',
      });
      addDebugLog('麦克风权限已允许 · 自动恢复监听');
      scheduleRecognition(100);
    };
  }).catch(() => {
    // Permissions API support differs by browser; the recognition API still starts normally.
  });
}

function startRecognition() {
  if (!recognition || !enabled || permissionBlocked || running || starting) return;
  starting = true;
  setDebug({ recognition: '正在启动持续识别' });
  try {
    recognition.start();
  } catch (error) {
    starting = false;
    const retry = error?.name === 'InvalidStateError' ? 700 : Math.min(retryDelay * 2, 5000);
    setDebug({
      recognition: error?.name === 'InvalidStateError' ? '识别服务正在切换' : '启动失败，稍后重试',
      transcript: error?.message || 'SpeechRecognition.start() 暂时未成功',
    });
    scheduleRecognition(retry);
  }
}

function finishCommand() {
  if (mode !== 'command' || processing) return;
  clearCommandTimers();
  const text = command.trim().replace(/^[\s，,。！？!?.]+/u, '');
  if (!text) {
    mode = 'wake';
    command = '';
    commandBase = '';
    ignoredTranscriptLength = sessionTranscript.length;
    setState('idle');
    setDebug({
      recognition: running ? '持续监听唤醒词' : '语音服务自动重连',
      transcript: '未识别到指令 · 继续等待「你好跳跳」',
    });
    return;
  }
  setDebug({
    recognition: '识别完成，提交中',
    transcript: '已识别 ' + text.length + ' 字 · 静音 ' + (SILENCE_MS / 1000).toFixed(1) + ' 秒',
  });
  addDebugLog('静音检测完成 · ' + text.length + ' 字');
  askAssistant(text);
}

function updateCommand(text) {
  const next = text.trim().replace(/^[\s，,。！？!?.]+/u, '');
  if (next === command) return;
  command = next;
  setDebug({
    recognition: '识别语音内容',
    transcript: command.length + ' 字 · ' + command,
    stateDetail: '静音 ' + (SILENCE_MS / 1000).toFixed(1) + ' 秒后提交给 AI',
  });
  clearTimeout(silenceTimer);
  clearInterval(silenceProgressTimer);
  if (command) {
    silenceStartedAt = performance.now();
    silenceTimer = setTimeout(finishCommand, SILENCE_MS);
    silenceProgressTimer = setInterval(() => {
      const remaining = Math.max(0, SILENCE_MS - (performance.now() - silenceStartedAt));
      setDebug({ stateDetail: '语音静音 ' + (remaining / 1000).toFixed(1) + ' 秒 · 随后提交给 AI' });
    }, 100);
  }
}

async function askAssistant(text) {
  if (processing || !text) return;
  const runId = ++assistantRunSequence;
  processing = true;
  mode = 'processing';
  clearCommandTimers();
  ignoredTranscriptLength = sessionTranscript.length;
  setState('thinking');
  announce('正在思考');
  setDebug({
    recognition: '完整语句已提交',
    transcript: text.length + ' 字 · 等待 AI 回复',
    ai: '请求发送中',
    output: '已提交 ' + text.length + ' 字 · 连接对话模型',
    progress: 12,
    tts: '等待 AI 回复',
    ttsDetail: '尚未开始语音合成',
    ttsProgress: 0,
  });
  addDebugLog('语音文本提交给 AI · ' + text.length + ' 字');

  const requestStartedAt = performance.now();
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: text }], model: modelName }),
      signal: AbortSignal.timeout(50000),
    });
    setDebug({
      ai: '收到 HTTP 响应',
      output: 'HTTP ' + response.status + ' · ' +
        Math.round(performance.now() - requestStartedAt) + ' ms · 正在读取 JSON',
      progress: 48,
    });
    const data = await response.json();
    if (!response.ok || !data.reply) {
      throw new Error(data.error || '对话服务暂时不可用');
    }

    const rawReply = String(data.reply).trim();
    const parsedWeather = parseWeatherCommand(rawReply);
    const parsedMusic = parseMusicCommand(parsedWeather.reply);
    const parsedAction = parseActionCommand(parsedMusic.reply);
    const cleanedReply = sanitizePlainSpeech(parsedAction.reply || parsedMusic.reply || parsedWeather.reply || rawReply);
    const reply = cleanedReply || (parsedMusic.request ? '好的，正在为你准备这首歌。' :
      (parsedAction.plan ? '收到，我马上执行。' :
        (parsedWeather.request ? '好的，我来查一下天气。' : '好的。')));
    const completedAt = performance.now();
    setDebug({
      ai: '完整回复已就绪',
      output: parsedAction.plan ? reply + ' · 已解析动作任务' :
        (parsedMusic.request ? reply + ' · 已解析音乐指令' :
          (parsedWeather.request ? reply + ' · 已解析天气指令' : reply)),
      progress: 68,
    });
    addDebugLog('AI 完整回复 · ' + rawReply.length + ' 字 · ' +
      Math.round(completedAt - requestStartedAt) + ' ms');

    if (parsedWeather.request) {
      setDebug({
        ai: '准备天气查询',
        output: reply + ' · 查询 ' + (parsedWeather.request.city || '当前位置'),
        progress: 78,
      });
      await queryWeather(parsedWeather.request.city, 'voice');
      return;
    }

    setState('synthesis');
    announce('正在准备语音');
    setDebug({
      ai: '等待语音合成',
      output: reply,
      progress: 76,
      tts: '检查可用音色',
      ttsDetail: '正在读取 Yunxia 及备用中文语音',
      ttsProgress: 0,
    });
    const result = await speakReply(reply);

    if (result.ok) {
      setDebug({
        ai: '语音播报完成',
        output: reply,
        progress: 100,
        tts: '播放完成',
        ttsDetail: '自然结束 · ' + reply.length + ' 字 · ' + result.elapsedMs + ' ms',
        ttsProgress: 100,
      });
      addDebugLog('语音播放完成 · ' + result.elapsedMs + ' ms');
    } else {
      setDebug({
        ai: '回复就绪，语音失败',
        output: '语音错误：' + result.reason + ' · 回复：' + reply,
        progress: 100,
        tts: '播放失败',
        ttsDetail: result.reason + ' · 已解除播报等待',
      });
      addDebugLog('语音播报失败 · ' + result.reason);
      announce('语音播报暂时失败，仍可继续呼唤我');
    }
    if (parsedAction.plan) {
      setDebug({
        ai: '执行动作任务',
        output: reply + ' · ' + parsedAction.plan.steps.length + ' 项按顺序执行',
        progress: 78,
      });
      await executeActionPlan(parsedAction.plan, runId);
    }
    if (parsedMusic.request) {
      setDebug({
        ai: '准备音乐播放',
        output: reply + ' · 搜索「' + parsedMusic.request.query + '」',
        progress: 78,
      });
      await playMusicByQuery(parsedMusic.request.query, parsedMusic.request.type, 'voice');
    }
  } catch (error) {
    const message = error?.message || '连接失败';
    setDebug({
      ai: '对话请求失败',
      output: message,
      progress: 100,
      tts: '未开始合成',
      ttsDetail: 'AI 回复未就绪 · ' + message,
    });
    addDebugLog('AI 请求失败 · ' + message);
    announce('对话服务暂时不可用');
    console.warn('跳跳暂时无法连接对话服务');
  } finally {
    if (interruptedAssistantRun === runId) {
      interruptedAssistantRun = 0;
      processing = false;
      if (enabled && !permissionBlocked) scheduleRecognition(retryDelay);
      return;
    }
    const keepMusicPage = musicPageActive;
    const keepWeatherPage = weatherPageActive;
    processing = false;
    mode = keepMusicPage ? 'music' : (keepWeatherPage ? 'weather' : 'wake');
    command = '';
    commandBase = '';
    commandOffset = 0;
    ignoredTranscriptLength = sessionTranscript.length;
    if (keepMusicPage) {
      setState('music');
      setDebug({
        recognition: permissionBlocked ? '麦克风权限受限' : '音乐播放中 · 持续监听唤醒词',
        transcript: permissionBlocked ? 'Edge 麦克风权限受限 · 授权后自动重连' :
          '播放期间说「你好跳跳」即可退出音乐',
      });
    } else if (keepWeatherPage) {
      setState('weather');
      setDebug({
        recognition: permissionBlocked ? '麦克风权限受限' : '天气播报中 · 持续监听唤醒词',
        transcript: permissionBlocked ? 'Edge 麦克风权限受限 · 授权后自动重连' :
          '说「你好跳跳」返回表情页 · 播报结束 3 秒后自动返回',
      });
    } else {
      setState('idle');
      setDebug({
        recognition: permissionBlocked ? '麦克风权限受限' :
          (running ? '持续监听唤醒词' : '识别服务自动重连'),
        transcript: permissionBlocked ? 'Edge 麦克风权限受限 · 授权后自动重连' :
          '待机 · 等待「你好跳跳」',
      });
    }
    if (enabled && !permissionBlocked) scheduleRecognition(retryDelay);
  }
}

if (recognition) {
  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;

  recognition.onstart = () => {
    running = true;
    starting = false;
    retryDelay = 350;
    sessionTranscript = '';
    ignoredTranscriptLength = 0;
    commandBase = mode === 'command' ? command : '';
    setDebug({
      recognition: processing ? '识别在线 · AI 处理中' :
        mode === 'command' ? '持续聆听指令' :
      (musicPageActive ? '音乐播放中 · 持续监听唤醒词' :
        (weatherPageActive ? '天气播报中 · 持续监听唤醒词' : '持续监听唤醒词')),
      transcript: processing ? '忽略播报回声 · 麦克风保持开启' :
        (musicPageActive ? '播放期间说「你好跳跳」即可退出音乐' :
          (weatherPageActive ? '说「你好跳跳」返回表情页' : '待机 · 等待「你好跳跳」')),
    });
  };

  recognition.onresult = event => {
    if (!enabled) return;
    sessionTranscript = Array.from(event.results, result => {
      const alternatives = Array.from(result, alternative => alternative?.transcript || '');
      return alternatives.find(text => WAKE_WORDS.test(text)) || alternatives[0] || '';
    }).join('');

    if (processing || mode === 'processing') {
      const activePageText = sessionTranscript.slice(ignoredTranscriptLength);
      const activePageWake = (weatherPageActive || musicPageActive)
        ? WAKE_WORDS.exec(activePageText)
        : null;
      if (activePageWake) {
        if (weatherPageActive) leaveWeatherPage('检测到唤醒词「你好跳跳」');
        if (musicPageActive) leaveMusicPage('检测到唤醒词「你好跳跳」');
        // A weather request can still be finishing its speech promise when
        // the wake word arrives. Let the new command own the UI immediately;
        // the previous assistant run will exit without restoring the page.
        interruptedAssistantRun = assistantRunSequence;
        processing = false;
        startWakeCommand(activePageWake);
        updateCommand(commandBase + sessionTranscript.slice(commandOffset));
        return;
      }
      ignoredTranscriptLength = sessionTranscript.length;
      return;
    }
    retryDelay = 350;

    if (mode === 'wake' || mode === 'music' || mode === 'weather' || musicPageActive || weatherPageActive) {
      const newText = sessionTranscript.slice(ignoredTranscriptLength);
      const match = WAKE_WORDS.exec(newText);
      if (!match) {
        if (newText.trim() && !musicPageActive) setDebug({ transcript: '唤醒候选 · ' + newText.trim() });
        return;
      }
      if (weatherPageActive) leaveWeatherPage('检测到唤醒词「你好跳跳」');
      if (musicPageActive) leaveMusicPage('检测到唤醒词「你好跳跳」');
      // Leaving a media page and entering listening is one continuous wake
      // transition, so the phrase after the wake word is kept as the command.
      startWakeCommand(match);
    }

    if (mode === 'command') {
      updateCommand(commandBase + sessionTranscript.slice(commandOffset));
    }
  };

  recognition.onerror = event => {
    if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
      permissionBlocked = true;
      clearCommandTimers();
      clearTimeout(restartTimer);
      mode = musicPageActive ? 'music' : (weatherPageActive ? 'weather' : 'wake');
      const activeState = musicPageActive ? 'music' : (weatherPageActive ? 'weather' : 'idle');
      if (state !== activeState) setState(activeState);
      const detail = event.error === 'audio-capture'
        ? '未检测到麦克风设备 · 检查输入设备后刷新'
        : '请在 Edge 网站权限中允许麦克风 · 授权后自动重连';
      setDebug({
        recognition: event.error === 'audio-capture' ? '麦克风设备不可用' : '麦克风权限受限',
        transcript: musicPageActive ? detail + ' · 音乐继续播放' :
          (weatherPageActive ? detail + ' · 天气页面继续显示' : detail),
        stateDetail: musicPageActive ? '音乐仍在播放 · 等待麦克风恢复' :
          (weatherPageActive ? '天气页面仍在显示 · 等待麦克风恢复' : '等待麦克风权限 · 保持待机表情'),
      });
      addDebugLog('SpeechRecognition 错误 · ' + event.error);
      return;
    }
    if (event.error === 'network') {
      retryDelay = Math.min(retryDelay * 2, 10000);
      setDebug({
        recognition: '语音服务网络重试',
        transcript: (retryDelay / 1000).toFixed(1) + ' 秒后重新连接 SpeechRecognition',
      });
      addDebugLog('语音识别网络中断 · 自动重试');
    } else if (event.error && !['no-speech', 'aborted'].includes(event.error)) {
      setDebug({ recognition: '语音服务错误', transcript: event.error });
      addDebugLog('SpeechRecognition 错误 · ' + event.error);
    }
  };

  recognition.onend = () => {
    running = false;
    starting = false;
    if (enabled && !permissionBlocked) scheduleRecognition(retryDelay);
  };
}

display.addEventListener('click', () => {
  if (!permissionBlocked || !recognition) return;
  permissionBlocked = false;
  enabled = true;
  retryDelay = 350;
  setDebug({
    recognition: '正在重新连接麦克风',
    transcript: '重新启动持续语音识别…',
  });
  addDebugLog('手动重试麦克风连接');
  scheduleRecognition(100);
});

window.speechSynthesis?.addEventListener('voiceschanged', chooseVoice);
chooseVoice();
sizeEyesForViewport();
window.addEventListener('resize', sizeEyesForViewport, { passive: true });
if (window.ResizeObserver) {
  const debugResizeObserver = new ResizeObserver(sizeEyesForViewport);
  debugResizeObserver.observe(debugPanel);
}

// When the page is opened with ?sync=<screen-mirror-url>, publish the live SVG
// eyes directly to the copied Jumper simulator. This keeps the browser page as
// the source of truth for expressions while leaving the normal web app unchanged
// when no sync URL is present.
function startSimulatorEyeSync() {
  const endpoint = new URLSearchParams(window.location.search).get('sync');
  if (!endpoint || typeof window.fetch !== 'function') return;

  const size = 256;
  const viewSize = 180;
  const canvases = [0, 1].map(() => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
  });
  const contexts = canvases.map(canvas => canvas.getContext('2d', { willReadFrequently: true }));
  let inFlight = false;
  let lastLyricText = '';
  let previousLyricText = '';
  let lyricChangedAt = 0;

  function rgbFromCanvas(index) {
    const context = contexts[index];
    const rgba = context.getImageData(0, 0, size, size).data;
    const rgb = new Uint8Array(size * size * 3);
    for (let source = 0, target = 0; target < rgb.length; source += 4, target += 3) {
      rgb[target] = rgba[source];
      rgb[target + 1] = rgba[source + 1];
      rgb[target + 2] = rgba[source + 2];
    }
    return rgb;
  }

  function panelBackground(context, colors = ['#294b58', '#111d22', '#05090b']) {
    context.fillStyle = '#000';
    context.fillRect(0, 0, size, size);
    const gradient = context.createRadialGradient(92, 76, 8, 128, 128, 180);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(.68, colors[1]);
    gradient.addColorStop(1, colors[2]);
    context.beginPath();
    context.arc(128, 128, 122, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = 'rgba(180,236,255,.28)';
    context.lineWidth = 2;
    context.stroke();
  }

  function drawText(context, value, x, y, maxWidth, font, color = '#dff8ff') {
    const text = String(value || '').trim();
    if (!text) return;
    context.font = font;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    let shown = text;
    while (shown.length > 1 && context.measureText(shown).width > maxWidth) {
      shown = shown.slice(0, -1);
    }
    if (shown !== text) shown = shown.slice(0, -1) + '…';
    context.fillText(shown, x, y);
  }

  function renderMusicSide(index) {
    const context = contexts[index];
    panelBackground(context, index === 0
      ? ['#294b58', '#111d22', '#05090b']
      : ['#173036', '#071014', '#020405']);
    context.save();
    context.shadowColor = 'rgba(116,218,244,.30)';
    context.shadowBlur = 14;
    if (index === 0) {
      const coverUrl = musicCover.currentSrc || musicCover.src || '';
      let coverIsLocal = false;
      try { coverIsLocal = new URL(coverUrl, window.location.href).origin === window.location.origin; } catch { /* no-op */ }
      if (coverIsLocal && musicCover.complete && musicCover.naturalWidth > 0) {
        context.save();
        context.beginPath();
        context.arc(128, 128, 122, 0, Math.PI * 2);
        context.clip();
        context.translate(128, 128);
        context.rotate((performance.now() % 24000) / 24000 * Math.PI * 2);
        context.globalAlpha = .92;
        context.drawImage(musicCover, -154, -154, 308, 308);
        context.restore();
        const shade = context.createLinearGradient(0, 20, 0, 232);
        shade.addColorStop(0, 'rgba(0,0,0,.10)');
        shade.addColorStop(.48, 'rgba(0,0,0,.35)');
        shade.addColorStop(1, 'rgba(0,0,0,.84)');
        context.beginPath();
        context.arc(128, 128, 121, 0, Math.PI * 2);
        context.fillStyle = shade;
        context.fill();
        context.strokeStyle = 'rgba(180,236,255,.34)';
        context.lineWidth = 2;
        context.stroke();
      }
      drawText(context, 'NOW PLAYING', 128, 70, 190, '700 11px Consolas, monospace', '#a9e7f4');
      drawText(context, musicTitle.textContent, 128, 112, 190, '600 21px Segoe UI, sans-serif', '#effbff');
      drawText(context, musicArtist.textContent, 128, 148, 190, '15px Segoe UI, sans-serif', '#d4edf3');
      drawText(context, musicAlbum.textContent, 128, 176, 190, '12px Segoe UI, sans-serif', '#b7d2da');
      context.font = '42px Segoe UI Symbol, sans-serif';
      context.fillStyle = '#b4ecff';
      context.fillText('♫', 128, 218);
    } else {
      drawText(context, 'LYRICS', 128, 62, 190, '700 11px Consolas, monospace', '#a9e7f4');
      const lyric = musicLyric.textContent || '正在播放';
      if (lyric !== lastLyricText) {
        previousLyricText = lastLyricText;
        lastLyricText = lyric;
        lyricChangedAt = performance.now();
      }
      const progress = Math.min(1, Math.max(0, (performance.now() - lyricChangedAt) / 520));
      if (previousLyricText && progress < 1) {
        context.save();
        context.globalAlpha = 1 - progress;
        context.translate(0, -20 * progress);
        drawText(context, previousLyricText, 128, 128, 190, '600 19px Segoe UI, sans-serif', '#9acbd7');
        context.restore();
      }
      context.save();
      context.globalAlpha = previousLyricText ? progress : 1;
      context.translate(0, previousLyricText ? 20 * (1 - progress) : 0);
      drawText(context, lyric, 128, 128, 190, '600 19px Segoe UI, sans-serif', '#dff8ff');
      context.restore();
      drawText(context, '♪', 128, 194, 190, '30px Segoe UI Symbol, sans-serif', '#86d8ed');
    }
    context.restore();
    return rgbFromCanvas(index);
  }

  function drawCloud(context) {
    context.fillStyle = '#c8e9f3';
    context.beginPath();
    context.arc(105, 124, 25, Math.PI, 0);
    context.arc(137, 119, 32, Math.PI, 0);
    context.arc(164, 126, 22, Math.PI, 0);
    context.rect(80, 124, 106, 30);
    context.fill();
  }

  function drawWeatherGlyph(context, kind) {
    context.save();
    context.lineCap = 'round';
    if (kind === 'sunny') {
      context.strokeStyle = '#ffe6a0';
      context.lineWidth = 7;
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4;
        context.beginPath();
        context.moveTo(128 + Math.cos(angle) * 44, 128 + Math.sin(angle) * 44);
        context.lineTo(128 + Math.cos(angle) * 62, 128 + Math.sin(angle) * 62);
        context.stroke();
      }
      context.fillStyle = '#ffe6a0';
      context.beginPath();
      context.arc(128, 128, 28, 0, Math.PI * 2);
      context.fill();
    } else {
      drawCloud(context);
      if (kind === 'rainy') {
        context.strokeStyle = '#88dcf4';
        context.lineWidth = 5;
        for (const x of [102, 134, 166]) {
          context.beginPath(); context.moveTo(x, 166); context.lineTo(x - 9, 188); context.stroke();
        }
      } else if (kind === 'snowy') {
        context.strokeStyle = '#e2f8ff';
        context.lineWidth = 3;
        for (const x of [104, 136, 168]) {
          context.beginPath(); context.moveTo(x, 166); context.lineTo(x, 190); context.stroke();
          context.beginPath(); context.moveTo(x - 9, 178); context.lineTo(x + 9, 178); context.stroke();
        }
      } else if (kind === 'stormy') {
        context.fillStyle = '#ffe48d';
        context.beginPath(); context.moveTo(140, 155); context.lineTo(119, 190); context.lineTo(138, 190);
        context.lineTo(129, 218); context.lineTo(162, 177); context.lineTo(143, 177); context.closePath(); context.fill();
      } else if (kind === 'foggy') {
        context.strokeStyle = '#b8dce6';
        context.lineWidth = 5;
        for (const y of [170, 190, 210]) {
          context.beginPath(); context.moveTo(94, y); context.lineTo(180, y); context.stroke();
        }
      }
    }
    context.restore();
  }

  function renderWeatherIcon(context, kind) {
    const clone = weatherIcon.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '188');
    clone.setAttribute('height', '188');
    clone.setAttribute('viewBox', '0 0 160 160');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = [
      '.weather-glyph{display:none}',
      `.weather-${kind}{display:block}`,
      '.weather-sun-disc{fill:#ffe6a0}',
      '.weather-sun-rays{fill:none;stroke:#ffe6a0;stroke-width:8;stroke-linecap:round}',
      '.weather-cloud-shape{fill:#c8e9f3}',
      '.weather-rain-drops,.weather-snow-flakes{fill:none;stroke:#88dcf4;stroke-width:6;stroke-linecap:round}',
      '.weather-snow-flakes{stroke:#e2f8ff;stroke-width:4}',
      '.weather-lightning{fill:#ffe48d}',
      '.weather-fog-lines{fill:none;stroke:#b8dce6;stroke-width:6;stroke-linecap:round;opacity:.8}',
    ].join('');
    clone.insertBefore(style, clone.firstChild);
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 34, 34, 188, 188);
        URL.revokeObjectURL(url);
        resolve();
      };
      image.onerror = error => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      image.src = url;
    });
  }

  async function renderWeatherSide(index) {
    const context = contexts[index];
    panelBackground(context, index === 0
      ? ['#2a5260', '#0a161b', '#030608']
      : ['#173036', '#071014', '#020405']);
    context.save();
    context.shadowColor = 'rgba(133,221,246,.30)';
    context.shadowBlur = 14;
    if (index === 0) {
      await renderWeatherIcon(context, weatherIconOrb.dataset.kind || 'sunny');
    } else {
      drawText(context, weatherLocation.textContent, 128, 58, 190, '16px Segoe UI, sans-serif', '#9fddec');
      drawText(context, weatherTemperature.textContent, 128, 108, 190, '350 44px Segoe UI, sans-serif', '#e5f9ff');
      drawText(context, weatherCondition.textContent, 128, 158, 190, '19px Segoe UI, sans-serif', '#d2f1f8');
      drawText(context, weatherDetails.textContent, 128, 192, 190, '11px Segoe UI, sans-serif', '#8fb9c4');
      drawText(context, weatherUpdated.textContent, 128, 214, 190, '9px Segoe UI, sans-serif', '#59747d');
    }
    context.restore();
    return rgbFromCanvas(index);
  }

  function centerFor(group, fallback) {
    const transform = group?.getAttribute('transform') || '';
    const match = transform.match(/translate\(\s*([-+\d.]+)[ ,]+([-+\d.]+)\s*\).*?scale\(\s*([-+\d.]+)\s*\)/);
    if (!match) return { x: fallback, y: 200 };
    return { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) || 1 };
  }

  function renderSide(index) {
    if (display.classList.contains('music-mode')) return renderMusicSide(index);
    if (display.classList.contains('weather-mode')) return renderWeatherSide(index);
    const center = centerFor(eyeGroups[index], index === 0 ? 230 : 570);
    const clone = stage.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(size));
    clone.setAttribute('height', String(size));
    clone.setAttribute('viewBox', `${center.x - viewSize / 2} ${center.y - viewSize / 2} ${viewSize} ${viewSize}`);
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    const animationPhase = -((performance.now() / 1000) % 1);
    style.textContent = [
      '#left-eye,#right-eye{fill:none;stroke:#b4ecff;stroke-width:15;stroke-linecap:round;stroke-linejoin:round;transform-box:fill-box;transform-origin:center}',
      '#eye-effects{overflow:visible;pointer-events:none}',
      '#effect-stars,#effect-question,#effect-loading{visibility:hidden;opacity:0}',
      '#eye-stage[data-expression="wink"] #effect-stars,#eye-stage[data-expression="question"] #effect-question,#eye-stage[data-state="listening"] #effect-question,#eye-stage[data-state="thinking"] #effect-loading{visibility:visible;opacity:1}',
      '.sparkle{fill:#d9f8ff;filter:drop-shadow(0 0 4px rgba(157,233,255,.95));transform-box:fill-box;transform-origin:center}',
      '.loading-track,.loading-arc{fill:none;stroke-linecap:round}',
      '.loading-track{stroke:rgba(180,236,255,.24);stroke-width:2}',
      '.loading-arc{stroke:#d9f8ff;stroke-width:2.5;filter:drop-shadow(0 0 3px rgba(116,218,244,.9))}',
      '#effect-question path{fill:none;stroke:#c8f2ff;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}',
      '#effect-question circle{fill:#c8f2ff}',
      `.sparkle-main{animation:star-twinkle 1s ease-in-out infinite;animation-delay:${animationPhase.toFixed(3)}s}`,
      `.sparkle-small{animation:star-twinkle .8s ease-in-out infinite alternate;animation-delay:${animationPhase.toFixed(3)}s}`,
      `.sparkle-one{animation-delay:${(animationPhase - .2).toFixed(3)}s}.sparkle-two{animation-delay:${(animationPhase - .55).toFixed(3)}s}`,
      '#effect-question{transform-box:fill-box;transform-origin:center;animation:question-wiggle 1.35s ease-in-out infinite}',
      '#effect-loading{transform-box:fill-box;transform-origin:center;animation:loading-spin .9s linear infinite}',
      '@keyframes star-twinkle{0%,100%{opacity:.45;transform:scale(.78) rotate(-12deg)}50%{opacity:1;transform:scale(1.16) rotate(12deg)}}',
      '@keyframes question-wiggle{0%,100%{transform:translateX(0) rotate(-7deg)}50%{transform:translateX(2px) rotate(7deg)}}',
      '@keyframes loading-spin{to{transform:rotate(360deg)}}',
      '@keyframes idle-breathe{0%,100%{transform:scaleY(1)}48%{transform:scaleY(1.045)}}',
      '@keyframes listen-alert{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.08)}}',
      '@keyframes think-glance{0%,100%{transform:scaleY(1) translateY(0)}35%{transform:scaleY(.94) translateY(-2px)}70%{transform:scaleY(1.03) translateY(1px)}}',
      '@keyframes synth-pulse{0%,100%{transform:scaleY(.97)}50%{transform:scaleY(1.08)}}',
      '@keyframes speak-bounce{0%,100%{transform:scaleY(.98)}50%{transform:scaleY(1.06)}}',
      '#eye-stage[data-state="idle"] #left-eye{animation:idle-breathe 4.3s ease-in-out infinite}',
      '#eye-stage[data-state="idle"] #right-eye{animation:idle-breathe 4.3s ease-in-out -2.1s infinite}',
      '#eye-stage[data-state="listening"] #left-eye,#eye-stage[data-state="listening"] #right-eye{animation:listen-alert 1.25s ease-in-out infinite}',
      '#eye-stage[data-state="thinking"] #left-eye{animation:think-glance 2.8s ease-in-out infinite}',
      '#eye-stage[data-state="thinking"] #right-eye{animation:think-glance 2.8s ease-in-out -1.4s infinite}',
      '#eye-stage[data-state="synthesis"] #left-eye,#eye-stage[data-state="synthesis"] #right-eye{animation:synth-pulse .95s ease-in-out infinite}',
      '#eye-stage[data-state="speaking"] #left-eye,#eye-stage[data-state="speaking"] #right-eye{animation:speak-bounce .8s ease-in-out infinite}',
    ].join('');
    clone.insertBefore(style, clone.firstChild);
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const context = contexts[index];
        context.fillStyle = '#000';
        context.fillRect(0, 0, size, size);
        context.drawImage(image, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(rgbFromCanvas(index));
      };
      image.onerror = error => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      image.src = url;
    });
  }

  async function publish() {
    if (inFlight) return;
    inFlight = true;
    try {
      const [left, right] = await Promise.all([renderSide(0), renderSide(1)]);
      const payload = new Uint8Array(left.length + right.length);
      payload.set(left, 0);
      payload.set(right, left.length);
      await fetch(endpoint, {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: payload,
      });
    } catch (error) {
      // The simulator may start a little after the browser; retrying on the
      // next tick keeps the page responsive and self-heals once it is ready.
      if (!document.hidden) console.debug('simulator eye sync waiting:', error);
    } finally {
      inFlight = false;
    }
  }

  window.setInterval(publish, 1000 / 12);
  publish();
}

function startActionBridge() {
  const params = new URLSearchParams(window.location.search);
  let endpoint = params.get('actions');
  // Older launcher windows only carried ?sync=...; the simulator reserves the
  // immediately following loopback port for its action bridge.
  if (!endpoint) {
    try {
      const sync = new URL(params.get('sync') || '');
      if (sync.port) {
        sync.port = String(Number(sync.port) + 1);
        sync.pathname = '/actions';
        endpoint = sync.toString();
      }
    } catch { /* opened without simulator sync */ }
  }
  if (!endpoint) return;
  try {
    const url = new URL(endpoint, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    actionEndpoint = url.toString().replace(/\/$/u, '');
    setDebug({ actionStatus: '动作桥已连接', actionProgress: '0%' });
    addDebugLog('动作桥已连接 · 连续动作可执行');
  } catch {
    actionEndpoint = '';
  }
}

startActionBridge();
startSimulatorEyeSync();
setState('idle');
setDebug({
  recognition: recognition ? '自动启动中' : '浏览器不支持',
  transcript: recognition ? '待机 · 等待「你好跳跳」' : '请使用 Microsoft Edge',
  ai: '空闲',
  output: '等待唤醒词与语音指令',
  progress: 0,
  tts: speechEngine ? '待机' : '浏览器不支持',
  ttsDetail: '等待 AI 回复',
  ttsProgress: 0,
});
debugFields.log.replaceChildren(...debugMessages.map(entry => {
  const row = document.createElement('span');
  row.textContent = entry;
  return row;
}));
updateDebugClock();
setInterval(updateDebugClock, 1000);
if (!recognition) {
  setDebug({ recognition: '浏览器不支持', transcript: '请使用 Microsoft Edge' });
  addDebugLog('浏览器不支持 SpeechRecognition');
} else {
  watchMicrophonePermission();
  addDebugLog('页面加载后自动启动持续识别');
  scheduleRecognition(180);
}
display.focus({ preventScroll: true });
idleTimer = setTimeout(idleLook, 1800);
setTimeout(blink, 4000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateGazeWander(stage.dataset.expression);
    if (state === 'idle') idleLook();
  }
});

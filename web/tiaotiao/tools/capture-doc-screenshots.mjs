import { createRequire } from 'node:module';
import { accessSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const require = createRequire(import.meta.url);
const playwrightCandidates = [
  process.env.PLAYWRIGHT_MODULE,
  'playwright',
  'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
].filter(Boolean);
let chromium;
for (const candidate of playwrightCandidates) {
  try { chromium = require(candidate).chromium; break; } catch { /* try next candidate */ }
}
if (!chromium) throw new Error('Playwright was not found. Install it or set PLAYWRIGHT_MODULE to its module path.');
const edgeCandidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = edgeCandidates.find(path => {
  try { accessSync(path); return true; } catch { return false; }
});
if (!executablePath) throw new Error('Microsoft Edge executable was not found.');

const outputDir = join(root, 'docs', 'screenshots');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined });
  Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
  localStorage.setItem('tiaotiao-background-color', '#000000');
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const port = process.env.PORT || '4183';
await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

async function reset() {
  await page.evaluate(() => {
    document.querySelector('#music-view').hidden = true;
    document.querySelector('#weather-view').hidden = true;
    document.querySelector('#eye-display').classList.remove('music-mode', 'weather-mode');
    document.querySelector('#debug-panel').style.removeProperty('display');
    document.querySelector('#debug-panel').style.removeProperty('visibility');
    window.setState('idle');
    document.querySelector('#debug-recognition').textContent = '演示截图 · 未启用麦克风';
    document.querySelector('#debug-transcript').textContent = '界面样例 · 不含真实语音识别结果';
  });
  await page.waitForTimeout(450);
}

async function capture(name, setup = async () => {}) {
  if (process.env.ONLY_SCREENSHOT && process.env.ONLY_SCREENSHOT !== name) return;
  await reset();
  await setup();
  await page.waitForTimeout(650);
  await page.screenshot({ path: join(outputDir, `${name}.png`) });
}

await capture('01-idle', async () => {
  await page.evaluate(() => {
    window.setState('idle');
    window.lookAt(-10, -5, 180);
    document.querySelector('#debug-state-detail').textContent = '待机观察 · 持续监听「你好跳跳」';
    document.querySelector('#debug-recognition').textContent = '持续监听唤醒词';
    document.querySelector('#debug-transcript').textContent = '待机 · 等待「你好跳跳」';
  });
});

await capture('02-listening', async () => {
  await page.evaluate(() => {
    window.setState('listening');
    document.querySelector('#debug-recognition').textContent = '持续聆听指令';
    document.querySelector('#debug-transcript').textContent = '「你好跳跳」已唤醒 · 等待指令';
    document.querySelector('#debug-state-detail').textContent = '唤醒成功 · 静音后自动提交';
  });
});

await capture('03-thinking', async () => {
  await page.evaluate(() => {
    window.setState('thinking');
    document.querySelector('#debug-ai').textContent = '等待模型回复';
    document.querySelector('#debug-output').textContent = '已提交语音文本 · 正在处理';
    document.querySelector('#debug-progress').setAttribute('width', '56');
    document.querySelector('#debug-tts').textContent = '等待 AI 回复';
    document.querySelector('#debug-state-detail').textContent = '请求已发送 · 等待模型完整回复';
  });
});

await capture('04-wink-stars', async () => {
  await page.evaluate(() => {
    window.setState('idle');
    window.showExpression('wink', 1);
    document.querySelector('#debug-state').textContent = '手动表情预览';
    document.querySelector('#debug-state-detail').textContent = '眨眼 · 星星特效';
    document.querySelector('#debug-output').textContent = '右眼变为尖括号形状并显示闪烁星星';
  });
});

await capture('05-question', async () => {
  await page.evaluate(() => {
    window.setState('listening');
    window.showExpression('question', 1);
    document.querySelector('#debug-state').textContent = '疑问表情';
    document.querySelector('#debug-state-detail').textContent = '右眼右上角问号轻轻摇摆';
    document.querySelector('#debug-transcript').textContent = '等待进一步语音指令';
  });
});

for (const [name, label, detail] of [
  ['09-happy', '开心表情', '自然弧线 · 明亮待机'],
  ['10-excited', '兴奋表情', '睁大眼睛 · 活泼注视'],
  ['11-sleepy', '困倦表情', '眼皮下垂 · 柔和待机'],
  ['12-sad', '难过表情', '眉眼下压 · 情绪反馈'],
  ['13-angry', '生气表情', '两侧眉形变化 · 明确情绪'],
]) {
  await capture(name, async () => {
    await page.evaluate(({ label, detail }) => {
      window.setState('idle');
      window.showExpression(label === '开心表情' ? 'happy' :
        (label === '兴奋表情' ? 'excited' :
          (label === '困倦表情' ? 'sleepy' :
            (label === '难过表情' ? 'sad' : 'angry'))), 1);
      document.querySelector('#debug-state').textContent = label;
      document.querySelector('#debug-state-detail').textContent = detail;
    }, { label, detail });
  });
}

await capture('06-weather', async () => {
  await page.evaluate(() => {
    window.enterWeatherPage({
      province: '江苏省', city: '徐州', district: '云龙区', weather: '晴', weather_icon: 'sunny',
      temperature: 26, feels_like: 27, wind_direction: '东南风', wind_power: '3级', humidity: 48,
      report_time: '演示数据',
    });
    document.querySelector('#debug-weather-detail').textContent = '演示数据 · 不代表实时天气';
  });
});

await capture('07-music', async () => {
  await page.evaluate(() => {
    window.enterMusicPage({
      id: 'demo', type: 'wy', name: '星际来信', artist: '跳跳推荐', album: '夜间漫游',
      pic: '', url: '', lrc: '[00:00.000]沿着星光向前走',
    });
    document.querySelector('#debug-music-detail').textContent = '界面示例 · 未连接真实音源';
  });
});

await capture('08-debug-panel', async () => {
  await page.evaluate(() => {
    window.setState('synthesis');
    document.querySelector('#debug-state').textContent = '准备语音';
    document.querySelector('#debug-state-detail').textContent = '回复已收到 · 正在准备语音引擎';
    document.querySelector('#debug-recognition').textContent = '识别在线 · AI 处理中';
    document.querySelector('#debug-transcript').textContent = '已识别 12 字 · 查询天气';
    document.querySelector('#debug-ai').textContent = '语音合成准备';
    document.querySelector('#debug-output').textContent = '自然语言回复已清理';
    document.querySelector('#debug-progress').setAttribute('width', '82');
    document.querySelector('#debug-tts').textContent = '检查可用音色';
    document.querySelector('#debug-tts-detail').textContent = '正在读取中文语音';
    document.querySelector('#debug-tts-progress').setAttribute('width', '35');
    document.querySelector('#debug-voice-resource').textContent = '语音资源已就绪';
    document.querySelector('#debug-download-progress').textContent = 'Edge 管理 · 100%';
    document.querySelector('#debug-resource-progress').setAttribute('width', '100');
    document.querySelector('#debug-music-status').textContent = '待机';
    document.querySelector('#debug-weather-status').textContent = '待机';
    document.querySelector('#debug-model-name').value = '';
    document.querySelector('#debug-model-status').textContent = '当前：未配置模型';
  });
});

await capture('14-background-green', async () => {
  await page.selectOption('#background-preset', '#00ff00');
  await page.evaluate(() => {
    window.showExpression('happy', 1);
    document.querySelector('#debug-state').textContent = '背景颜色预览';
    document.querySelector('#debug-state-detail').textContent = '荧光绿 · #00ff00';
  });
});

await page.setViewportSize({ width: 390, height: 844 });
await page.selectOption('#background-preset', '#000000');
await page.waitForTimeout(300);
await reset();
await page.evaluate(() => {
  document.querySelector('#debug-state-detail').textContent = '窄屏响应式排版';
  document.querySelector('#debug-recognition').textContent = '演示截图 · 未启用麦克风';
});
await page.waitForTimeout(500);
await page.screenshot({ path: join(outputDir, '15-mobile-layout.png') });

await browser.close();
if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log(JSON.stringify({ outputDir, files: 15 }));

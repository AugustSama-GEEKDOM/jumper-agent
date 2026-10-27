import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ffmpegPath = 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const outputPath = 'C:/Users/Administrator/Desktop/跳跳眼睛表情演示_1080p60.mp4';
const tempDir = join(root, '.video-render');

await rm(tempDir, { recursive: true, force: true });
await mkdir(tempDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/155.0.4283.62/msedge.exe',
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling'],
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
await context.addInitScript(() => {
  Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined });
  Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

await page.evaluate(() => {
  const panel = document.querySelector('#debug-panel');
  if (panel) {
    panel.style.setProperty('display', 'none', 'important');
    panel.style.setProperty('visibility', 'hidden', 'important');
  }
  document.querySelectorAll('#music-view, #weather-view').forEach(element => {
    element.hidden = true;
    element.style.setProperty('display', 'none', 'important');
  });
  const stage = document.querySelector('#eye-stage');
  stage.style.setProperty('inset', '0', 'important');
  stage.style.setProperty('width', '100%', 'important');
  stage.style.setProperty('height', '100%', 'important');
  stage.setAttribute('viewBox', '0 0 1920 1080');
  const groups = document.querySelectorAll('.eye-group');
  groups[0].setAttribute('transform', 'translate(565 540) scale(4.1)');
  groups[1].setAttribute('transform', 'translate(1355 540) scale(4.1)');
  document.querySelector('#eye-effects').setAttribute('transform', 'translate(1400 345) scale(3.4)');
  window.lookAt(0, 0, 10);
});

const client = await context.newCDPSession(page);
const capturedFrames = [];
client.on('Page.screencastFrame', event => {
  client.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
  const timestamp = Number.isFinite(event.metadata?.timestamp)
    ? event.metadata.timestamp
    : Date.now() / 1000;
  capturedFrames.push({ timestamp, buffer: Buffer.from(event.data, 'base64') });
});
await client.send('Page.startScreencast', {
  format: 'png',
  quality: 100,
  maxWidth: 1920,
  maxHeight: 1080,
  everyNthFrame: 1,
});

const sequence = [
  ['happy', 2100], ['curious', 2000], ['wink', 2300], ['surprised', 1900],
  ['listening', 2500], ['thinking', 3100], ['synthesis', 1800], ['speaking', 2400],
  ['question', 2400], ['shy', 1900], ['sleepy', 2100], ['sad', 1800],
  ['angry', 1800], ['excited', 2100], ['calm', 2300], ['idle', 2100],
];
for (const [expression, duration] of sequence) {
  await page.evaluate(name => window.setState(name), expression);
  await page.waitForTimeout(duration);
}
await page.waitForTimeout(500);

await client.send('Page.stopScreencast').catch(() => {});
await page.waitForTimeout(100);

const totalDurationMs = sequence.reduce((total, [, duration]) => total + duration, 0) + 500;
const expectedFrameCount = Math.round(totalDurationMs / 1000 * 60);
if (!capturedFrames.length) throw new Error('No screencast frames were captured.');

// Screencast is event driven and can deliver fewer than 60 frames per second.
// Resample the captured animation by the browser timestamps so each output
// frame represents exactly 1/60 second and the full demo duration is retained.
const firstTimestamp = capturedFrames[0].timestamp;
let sourceIndex = 0;
let latest = capturedFrames[0].buffer;
const ffmpeg = spawn(ffmpegPath, [
  '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-vcodec', 'png', '-framerate', '60', '-i', '-',
  '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', outputPath,
], { stdio: ['pipe', 'ignore', 'pipe'] });
let ffmpegError = '';
ffmpeg.stderr.on('data', chunk => { ffmpegError += chunk.toString(); });
const ffmpegExit = new Promise((resolve, reject) => {
  ffmpeg.once('error', reject);
  ffmpeg.once('close', (code, signal) => resolve({ code, signal }));
});
for (let frameNumber = 0; frameNumber < expectedFrameCount; frameNumber += 1) {
  const deadline = firstTimestamp + frameNumber / 60;
  while (sourceIndex + 1 < capturedFrames.length && capturedFrames[sourceIndex + 1].timestamp <= deadline) {
    sourceIndex += 1;
    latest = capturedFrames[sourceIndex].buffer;
  }
  ffmpeg.stdin.write(latest);
}
ffmpeg.stdin.end();
const result = await ffmpegExit;
await context.close();
await browser.close();

if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
if (result.code !== 0) throw new Error(`ffmpeg exited with ${result.code}: ${ffmpegError}`);
console.log(JSON.stringify({ outputPath, capturedFrames: capturedFrames.length, outputFrames: expectedFrameCount, ffmpeg: result }));

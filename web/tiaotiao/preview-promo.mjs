import { chromium } from 'file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/155.0.4283.62/msedge.exe', args: ['--disable-gpu','--force-device-scale-factor=1'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file:///C:/Users/Administrator/Documents/ChatGPT/display/promo.html');
await page.waitForFunction(() => window.promoReady === true);
for (const t of [1.0, 5.0, 9.2, 13.2, 17.4, 20.0, 22.2, 25.4, 28.9]) {
  await page.evaluate(t => window.renderAt(t), t);
  await page.screenshot({ path: `preview-${String(t).replace('.', '_')}.png` });
}
console.log(await page.evaluate(() => ({ready: window.promoReady, body: document.body.innerText.slice(0,100), size: [document.documentElement.scrollWidth, document.documentElement.scrollHeight]})));
await browser.close();

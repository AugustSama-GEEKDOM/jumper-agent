import { chromium } from 'file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/155.0.4283.62/msedge.exe', args: ['--disable-gpu','--force-device-scale-factor=1'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file:///C:/Users/Administrator/Documents/ChatGPT/display/promo.html');
await page.waitForFunction(() => window.promoReady === true);
const checks = [
  [1.2, ['.opening h1','.opening-seal']],
  [5.2, ['#hero-eyes-presence','.presence-copy','.listen-status']],
  [9.2, ['.weather-disc','.weather-right','.weather-caption']],
  [13.2, ['#music-disc','.music-info','.music-needle']],
  [17.4, ['#robot','.action-copy','.reply-chip']],
  [20.0, ['#robot','.action-copy','.reply-chip']],
  [22.2, ['.agent-core','.agent-copy','.prompt-card','.agent-results']],
  [25.4, ['#hero-eyes-emotion','.emotion-copy','.emotion-word']],
  [28.9, ['#hero-eyes-final','.finale-copy','.finale-footer']]
];
for (const [t, selectors] of checks) {
  await page.evaluate(t => window.renderAt(t), t);
  const report = await page.evaluate(({selectors}) => {
    const out = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel); const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      out[sel] = {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),opacity:cs.opacity,display:cs.display,overflow:[r.left<0,r.top<0,r.right>1920,r.bottom>1080]};
    }
    return out;
  }, {selectors});
  console.log(`\nTIME ${t}`); console.log(JSON.stringify(report,null,2));
}
await browser.close();

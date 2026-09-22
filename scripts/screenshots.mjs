// Full-page screenshots of the built dist/ at 375, 768 and 1440px, plus overflow + no-JS checks.
// Run: npm run build && npm run screenshots
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { start } from './serve.mjs';

const PORT = 4173;
const server = await start(PORT);
const url = `http://127.0.0.1:${PORT}/`;
await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch();
for (const width of [375, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // scroll through the page so lazy images load before the full-page capture
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto'; // the page uses smooth scrolling; capture needs instant jumps
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  // smallest tap target among links/buttons (mobile only matters, but report always)
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('a, button')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      // a "stretched link" (::after covering its card) has the whole card as tap target, so measure that instead
      .map(({ el, r }) => (getComputedStyle(el, '::after').position === 'absolute' && el.closest('.relative') ? { el, r: el.closest('.relative').getBoundingClientRect() } : { el, r }))
      .filter(({ el, r }) => el.id !== 'skip-link' && r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44))
      .map(({ el, r }) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
  );
  await page.screenshot({ path: `screenshots/home-${width}.png`, fullPage: true });
  if (width < 1024) {
    await page.click('#nav-toggle');
    await page.screenshot({ path: `screenshots/home-${width}-menu.png`, fullPage: false });
    await page.keyboard.press('Escape');
  }
  console.log(`${width}px: scrollWidth ${overflow.scrollWidth} / innerWidth ${overflow.innerWidth} ${overflow.scrollWidth > overflow.innerWidth ? 'OVERFLOW!' : 'ok'}; console errors: ${errors.length}${errors.length ? ' ' + errors.join(' | ') : ''}`);
  if (small.length) console.log(`  targets < 44px: ${small.join('; ')}`);
  await ctx.close();
}

// No-JS check: is primary content visible on first paint without JavaScript?
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
const visible = await page.evaluate(() =>
  ['h1', '#advies h2', '#aanpak h2', '#assessments h2', '#voor-wie h2', '#over-hb h2', '#inzichten h2', '#contact h2', 'img[fetchpriority="high"]']
    .map((sel) => { const el = document.querySelector(sel); const cs = el && getComputedStyle(el); return `${sel}: ${el && cs.visibility === 'visible' && cs.opacity !== '0' && cs.display !== 'none' ? 'visible' : 'MISSING'}`; })
);
console.log('no-JS:', visible.join(', '));
await page.screenshot({ path: 'screenshots/home-1440-nojs.png', fullPage: false });
await ctx.close();

await browser.close();
server.close();

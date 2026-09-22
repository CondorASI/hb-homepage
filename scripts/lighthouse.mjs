// Lighthouse (mobile + desktop) against the built dist/, using the full Chromium that Playwright installed.
// Run: npm run build && node scripts/lighthouse.mjs [output-prefix]
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { start } from './serve.mjs';

const PORT = 4174;
const DEBUG_PORT = 9333;
const out = process.argv[2] ?? 'lighthouse';
const server = await start(PORT);
const url = `http://127.0.0.1:${PORT}/`;

// headless: false + --headless=new selects the full Chromium binary (the headless shell lacks APIs Lighthouse needs)
const browser = await chromium.launch({ headless: false, args: ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`] });

for (const preset of ['mobile', 'desktop']) {
  const result = await lighthouse(
    url,
    { port: DEBUG_PORT, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] },
    preset === 'desktop' ? desktopConfig : undefined,
  );
  writeFileSync(`${out}-${preset}.json`, result.report);
  const c = result.lhr.categories;
  console.log(`${preset}: perf ${Math.round(c.performance.score * 100)} a11y ${Math.round(c.accessibility.score * 100)} bp ${Math.round(c['best-practices'].score * 100)} seo ${Math.round(c.seo.score * 100)}`);
  const failing = Object.values(result.lhr.audits).filter((a) => a.score !== null && a.score < 1 && !['informative', 'notApplicable', 'manual'].includes(a.scoreDisplayMode));
  for (const a of failing) console.log(`  [${preset}] ${a.id} (${a.score}) ${a.displayValue ?? ''}`);
}
await browser.close();
server.close();

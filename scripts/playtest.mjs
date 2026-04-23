#!/usr/bin/env node
// Auto-playtest a generated game via Playwright.
// Usage: node scripts/playtest.mjs <game-name>
// Loads games/<name>/index.html in headless Chromium, takes screenshot,
// captures console errors, clicks random UI elements, reports issues.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const name = process.argv[2];
if (!name) {
  console.error('usage: playtest.mjs <game-name>');
  process.exit(1);
}
const gameDir = join(ROOT, 'games', name);
const htmlPath = join(gameDir, 'index.html');
if (!existsSync(htmlPath)) {
  console.error(`not found: ${htmlPath}`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 420, height: 800 } });
const page = await ctx.newPage();

const errors = [];
const warnings = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  if (msg.type() === 'warning') warnings.push(`console.warn: ${msg.text()}`);
});

await page.goto(`file://${htmlPath}`);
await page.waitForLoadState('networkidle').catch(() => {});

// Random interaction pass — click up to 5 clickable elements.
const clickables = await page.$$(
  'button, [role="button"], .tile, canvas, input[type=submit]',
);
const toClick = clickables.slice(0, 5);
for (const el of toClick) {
  try {
    await el.click({ timeout: 1500, trial: false });
    await page.waitForTimeout(300);
  } catch {}
}

const shotPath = join(gameDir, 'playtest.png');
await page.screenshot({ path: shotPath, fullPage: false });

const title = await page.title();
const bodyText = (await page.locator('body').innerText()).slice(0, 200);

await browser.close();

console.log(JSON.stringify({
  game: name,
  title,
  bodySnippet: bodyText,
  errors,
  warnings,
  screenshot: shotPath,
  verdict: errors.length === 0 ? 'PASS' : 'FAIL',
}, null, 2));

process.exit(errors.length === 0 ? 0 : 1);

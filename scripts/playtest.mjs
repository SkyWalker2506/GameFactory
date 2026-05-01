#!/usr/bin/env node
// Auto-playtest a generated game via Playwright.
// Usage: node scripts/playtest.mjs <game-name>
// Loads games/<name>/index.html headless, captures console + FPS + memory,
// clicks up to 5 interactive elements, screenshots, writes playtest-report.json.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const gameName = process.argv[2];
if (!gameName) {
  console.error('usage: playtest.mjs <game-name>');
  process.exit(1);
}

const gameDir = join(ROOT, 'games', gameName);
const htmlPath = join(gameDir, 'index.html');
const screenshotPath = join(gameDir, 'playtest.png');
const reportPath = join(gameDir, 'playtest-report.json');

if (!existsSync(htmlPath)) {
  console.error(`not found: ${htmlPath}`);
  process.exit(1);
}

let title = 'Unknown';
let bodySnippet = '';
try {
  const htmlContent = readFileSync(htmlPath, 'utf8');
  const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) title = titleMatch[1];
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) bodySnippet = bodyMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 200);
} catch {}

const errors = [];
const warnings = [];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 420, height: 800 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error') errors.push({ type: 'console.error', message: msg.text() });
    if (type === 'warning') warnings.push({ type: 'console.warn', message: msg.text() });
  });
  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', message: err.message });
  });

  try {
    await page.goto(`file://${htmlPath}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
  } catch (e) {
    errors.push({ type: 'pageerror', message: e.message });
  }

  await page.evaluate(() => {
    window.__fpsSamples = [];
    let last = performance.now();
    function loop(now) {
      window.__fpsSamples.push(1000 / (now - last));
      last = now;
      window.__rAFId = requestAnimationFrame(loop);
    }
    window.__rAFId = requestAnimationFrame(loop);
  });

  await page.waitForTimeout(3000);

  const fpsDataRaw = await page.evaluate(() => {
    cancelAnimationFrame(window.__rAFId);
    return window.__fpsSamples || [];
  });
  // Drop first 5 samples to skip initialization spikes
  const fpsData = fpsDataRaw.slice(5);

  const mem = await page.evaluate(() => {
    return window.performance && window.performance.memory && window.performance.memory.usedJSHeapSize
      ? parseFloat((window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2))
      : null;
  });

  let avg = null;
  let min = null;
  if (fpsData.length > 0) {
    avg = parseFloat((fpsData.reduce((a, b) => a + b, 0) / fpsData.length).toFixed(1));
    min = parseFloat(Math.min(...fpsData).toFixed(1));
  }

  const interactions = [];
  const handles = await page.$$('button, canvas, [role="button"], .tile, input[type=submit]');
  const targetHandles = handles.slice(0, 5);
  for (const el of targetHandles) {
    const tag = await el.evaluate((e) => {
      const cls = e.className && typeof e.className === 'string' ? e.className.split(' ')[0] : '';
      return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (cls ? '.' + cls : '');
    });
    try {
      await el.click({ timeout: 800, force: true });
      await page.waitForTimeout(200);
      interactions.push({ selector: tag, ok: true });
    } catch {
      interactions.push({ selector: tag, ok: false });
    }
  }

  await page.screenshot({ path: screenshotPath, fullPage: false });
  await browser.close();

  const isPass = errors.length === 0 && (avg === null || avg >= 30);
  const verdict = isPass ? 'PASS' : 'FAIL';

  const report = {
    game: gameName,
    ts: new Date().toISOString(),
    title,
    bodySnippet,
    errors,
    warnings,
    fps: {
      samples: fpsData.map((v) => parseFloat(v.toFixed(1))),
      avg,
      min,
    },
    memory: {
      usedMB: mem,
      limitMB: 4096,
    },
    viewport: { w: 420, h: 800 },
    interactions,
    screenshot: screenshotPath,
    verdict,
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(isPass ? 0 : 1);
}

run().catch((err) => {
  console.error('Playtest harness failed:', err);
  process.exit(1);
});

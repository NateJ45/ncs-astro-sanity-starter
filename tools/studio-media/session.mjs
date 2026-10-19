// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// A local Studio to film and photograph (PORTS.md card 137)
// =============================================================================
// Shared by tools/guide-shots/capture.mjs and tools/tutorial-videos/record.mjs.
// It finds or starts the dev server, opens the Studio in Playwright's Chromium
// (light, 1280 wide by default), covers the account avatar and the editor's
// name, refuses every write to Sanity unless asked, and plays steps (click,
// type, wait, a highlight ring, a visible cursor) from a script file.
//
// Where it points: `base`, default http://localhost:4321/kit-harness/studio,
// the real Studio signed in as a pretend administrator (card 128). Reads of a
// public dataset work there; a private one needs the dev server's .env read
// token and the real /studio (sign in once in the opened window).
//
// One run at a time: runLock() takes tools/.studio-media.lock (git-ignored).
// Wrap the whole command in the machine's build lock too when other agents
// may be building (docs/agent/studio-kit.md, "Pictures and videos").
// =============================================================================

import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_COVER_NAMES, DEFAULT_COVER_SELECTORS } from '../../scripts/lib/studio-media.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_BASE = 'http://localhost:4321/kit-harness/studio';

/** Hold tools/.studio-media.lock while fn runs. A lock older than 30 minutes is stale. */
export async function runLock(fn) {
  const lock = join(ROOT, 'tools', '.studio-media.lock');
  try {
    if (Date.now() - statSync(lock).mtimeMs > 30 * 60 * 1000)
      rmSync(lock, { recursive: true, force: true });
  } catch {
    /* no lock yet */
  }
  try {
    mkdirSync(lock);
  } catch {
    console.error(
      'Another capture or recording is running (tools/.studio-media.lock). Wait for it, or delete the folder if it is stale.',
    );
    process.exit(75);
  }
  writeFileSync(
    join(lock, 'owner.json'),
    JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
  );
  const release = () => rmSync(lock, { recursive: true, force: true });
  process.on('SIGINT', () => {
    release();
    process.exit(130);
  });
  try {
    return await fn();
  } finally {
    release();
  }
}

async function reachable(url) {
  try {
    const r = await fetch(url, { redirect: 'manual' });
    return r.status < 500;
  } catch {
    return false;
  }
}

/**
 * The dev server: reuse one already on `base`'s port, or with `serve` start
 * `astro dev` and stop it afterwards. Returns { stop }.
 */
export async function devServer(base, { serve = false } = {}) {
  const origin = new URL(base).origin;
  if (await reachable(origin)) return { stop: () => {} };
  if (!serve) {
    console.error(
      `Nothing answers on ${origin}. Start the dev server (npm run dev) or pass --serve.`,
    );
    process.exit(69);
  }
  const port = new URL(base).port || '4321';
  const bin = join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const child = spawn(process.execPath, [bin, 'dev', '--port', port], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  const until = Date.now() + 180_000;
  while (Date.now() < until) {
    if (await reachable(base)) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const stop = () => {
    try {
      if (process.platform === 'win32')
        execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      else child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  };
  return { stop };
}

/** The script that covers avatars and names, as a page init script (runs before Sanity). */
function coverScript(selectors, names) {
  const css = `${selectors.join(',')}{visibility:hidden!important}`;
  return `(() => {
    const css = ${JSON.stringify(css)};
    const names = ${JSON.stringify(names)};
    const add = () => {
      if (!document.head) return requestAnimationFrame(add);
      const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    };
    add();
    const swap = (node) => {
      const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode(); t; t = w.nextNode()) {
        for (const n of names) {
          if (t.nodeValue && t.nodeValue.includes(n)) t.nodeValue = t.nodeValue.split(n).join('Editor');
          const first = n.split(' ')[0];
          if (first && t.nodeValue && new RegExp('\\\\b' + first + '\\\\b').test(t.nodeValue)) {
            t.nodeValue = t.nodeValue.replace(new RegExp('\\\\b' + first + '\\\\b', 'g'), 'there');
          }
        }
      }
    };
    new MutationObserver((list) => list.forEach((m) => {
      if (m.type === 'characterData') swap(m.target.parentNode || m.target);
      m.addedNodes.forEach((n) => swap(n));
    })).observe(document, { subtree: true, childList: true, characterData: true });
  })();`;
}

/** The visible cursor and the highlight ring, drawn over the page for videos. */
const CURSOR_SCRIPT = `(() => {
  const ready = () => {
    if (!document.body) return requestAnimationFrame(ready);
    const c = document.createElement('div');
    c.id = '__tut-cursor';
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:30px;z-index:2147483647;pointer-events:none;transition:transform .45s cubic-bezier(.3,.7,.3,1);transform:translate(640px,360px)';
    c.innerHTML = '<svg width="22" height="30" viewBox="0 0 26 34"><path d="M2 2 L2 26 L8 20.5 L12.5 31 L16.5 29.3 L12 19 L20 19 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
  };
  ready();
  window.__tutMove = (x, y) => { const c = document.getElementById('__tut-cursor'); if (c) c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  window.__tutRing = (r, ms) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:3px solid #c2410c;border-radius:10px;box-shadow:0 0 0 4px rgba(255,255,255,.85)';
    Object.assign(d.style, { left: r.x - 6 + 'px', top: r.y - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
    document.body.appendChild(d);
    setTimeout(() => d.remove(), ms);
  };
})();`;

/**
 * Chromium on the Studio. `video` records to that folder (Playwright's webm).
 * `quiet` marks the kit's welcome, tours and What's new as seen, so they do not
 * cover the screen (pass false to film them).
 */
export async function openStudio({
  base = DEFAULT_BASE,
  viewport = { width: 1280, height: 800 },
  cover = {},
  allowWrites = false,
  video,
  quiet = true,
  cursor = false,
} = {}) {
  let chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    ({ chromium } = await import('playwright'));
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    ...(video ? { recordVideo: { dir: video, size: viewport } } : {}),
  });
  const selectors = [...DEFAULT_COVER_SELECTORS, ...(cover.selectors ?? [])];
  const names = [...DEFAULT_COVER_NAMES, ...(cover.names ?? [])];
  await context.addInitScript({ content: coverScript(selectors, names) });
  if (cursor) await context.addInitScript({ content: CURSOR_SCRIPT });
  if (quiet) {
    await context.addInitScript({
      content: `try { localStorage.setItem('ncs-studio-kit:quiet', '1'); } catch {}`,
    });
  }
  if (!allowWrites) {
    // Never change the dataset from a recording: refuse mutations and actions.
    await context.route(/\.sanity\.io\/.*\/data\/(mutate|actions)\//, (route) => route.abort());
    await context.route(/\.sanity\.io\/.*\/assets\/(images|files)\//, (route) =>
      route.request().method() === 'GET' ? route.continue() : route.abort(),
    );
  }
  const page = await context.newPage();
  // Open a Studio path. The real /studio is hash-routed (base ending in '#'), so
  // a deep link loads directly. The harness uses browser history and its page
  // only exists at the root (trailingSlash 'always'), so load the root once and
  // then move inside the app, as a click on a tool tab would.
  const hashed = base.includes('#');
  const root = hashed ? base : base.replace(/\/?$/, '/');
  const basePath = hashed ? '' : new URL(root).pathname.replace(/\/$/, '');
  const go = async (path = '/') => {
    const p = path.startsWith('/') ? path : `/${path}`;
    if (hashed) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
    } else {
      if (!page.url().startsWith(new URL(root).origin + basePath)) {
        await page.goto(root, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 40_000 }).catch(() => {});
      }
      if (p !== '/' || new URL(page.url()).pathname !== basePath + '/') {
        await page.evaluate(
          (to) => {
            history.pushState(null, '', to);
            dispatchEvent(new PopStateEvent('popstate'));
          },
          basePath + (p === '/' ? '/' : p),
        );
      }
    }
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  };
  return { browser, context, page, go };
}

/** A step's target: CSS, or 'text:Words' for the first visible element with those words. */
export function locate(page, target) {
  if (target.startsWith('text:')) return page.getByText(target.slice(5), { exact: false }).first();
  if (target.startsWith('role:')) {
    const [role, name] = target.slice(5).split('|');
    return page.getByRole(role, name ? { name } : {}).first();
  }
  return page.locator(target).first();
}

async function moveCursor(page, loc) {
  const box = await loc.boundingBox();
  if (!box) return;
  await page.evaluate(
    ([x, y]) => window.__tutMove?.(x, y),
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  await page.waitForTimeout(500);
}

/**
 * Play one step. `onCaption(text)` is called when a caption starts. A click with
 * `fake: true` is drawn as a ring only (use it for Publish: writes are refused anyway).
 */
export async function playStep(page, go, step, { onCaption = () => {}, cursor = false } = {}) {
  const caption = step.do === 'caption' ? step.text : step.caption;
  if (caption) onCaption(caption);
  const t = step.target ? locate(page, step.target) : null;
  switch (step.do) {
    case 'goto':
      await go(step.path);
      break;
    case 'waitFor':
      await t.waitFor({ state: 'visible', timeout: step.timeout ?? 20_000 });
      break;
    case 'scroll':
      await t.scrollIntoViewIfNeeded();
      break;
    case 'hover':
      if (cursor) await moveCursor(page, t);
      await t.hover();
      break;
    case 'click':
      if (cursor) await moveCursor(page, t);
      if (step.fake) {
        const box = await t.boundingBox();
        if (box) await page.evaluate(([b]) => window.__tutRing?.(b, 900), [box]);
      } else {
        await t.click();
      }
      break;
    case 'type':
      if (cursor) await moveCursor(page, t);
      await t.click();
      await page.keyboard.type(step.text, { delay: step.delay ?? 45 });
      break;
    case 'press':
      await page.keyboard.press(step.key);
      break;
    case 'ring': {
      if (cursor) await moveCursor(page, t);
      const box = await t.boundingBox();
      if (box)
        await page.evaluate(([b, ms]) => window.__tutRing?.(b, ms), [box, step.hold ?? 1600]);
      break;
    }
    case 'wait':
    case 'caption':
      break;
  }
  const pause = step.do === 'wait' ? step.ms : (step.ms ?? (caption ? 1800 : 500));
  if (pause) await page.waitForTimeout(pause);
}

/** Is ffmpeg on PATH? */
export function hasFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

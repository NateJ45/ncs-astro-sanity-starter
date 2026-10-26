// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The stale-Studio guard (PORTS.md card 179): which errors count, when it
// reloads and when it asks, and that a second error never reloads twice.
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOOP_WINDOW_MS,
  RELOAD_DELAY_MS,
  RELOAD_KEY,
  decideRecovery,
  installStaleChunkGuard,
  isStaleChunkError,
  type StaleChunkGuardEnv,
} from './studio-stale-chunk.ts';

describe('isStaleChunkError', () => {
  it('matches each browser and a missing CSS chunk', () => {
    for (const m of [
      'Failed to fetch dynamically imported module: https://x.dev/_astro/Unsplash.B1c2.js',
      'error loading dynamically imported module: https://x.dev/_astro/a.js',
      'Importing a module script failed.',
      'Unable to preload CSS for /_astro/a.css',
    ]) {
      assert.equal(isStaleChunkError(new TypeError(m)), true, m);
      assert.equal(isStaleChunkError(m), true, m);
    }
  });
  it('ignores other errors and odd values', () => {
    for (const v of [
      new Error('Network request failed'),
      'boom',
      null,
      undefined,
      42,
      {},
      { message: 7 },
    ]) {
      assert.equal(isStaleChunkError(v), false, String(v));
    }
  });
});

describe('decideRecovery', () => {
  const now = 1_000_000;
  it('reloads when there is no earlier reload', () => {
    assert.equal(decideRecovery(null, now), 'reload');
    assert.equal(decideRecovery('not a number', now), 'reload');
    assert.equal(decideRecovery(String(now + 5000), now), 'reload');
  });
  it('asks instead inside the loop window, reloads after it', () => {
    assert.equal(decideRecovery(String(now - 1000), now), 'prompt');
    assert.equal(decideRecovery(String(now - LOOP_WINDOW_MS + 1), now), 'prompt');
    assert.equal(decideRecovery(String(now - LOOP_WINDOW_MS), now), 'reload');
  });
});

function fakeEnv(stored: string | null = null, opts: { storageThrows?: boolean } = {}) {
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  const store = new Map<string, string>();
  if (stored !== null) store.set(RELOAD_KEY, stored);
  const log = {
    reloads: 0,
    shown: [] as string[],
    timers: [] as number[],
    button: null as null | (() => void),
  };
  let pending: (() => void) | null = null;
  const env: StaleChunkGuardEnv = {
    on: (type, fn) => {
      (listeners[type] ??= []).push(fn);
    },
    getItem: (k) => {
      if (opts.storageThrows) throw new Error('blocked');
      return store.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (opts.storageThrows) throw new Error('blocked');
      store.set(k, v);
    },
    now: () => 5_000_000,
    later: (fn, ms) => {
      log.timers.push(ms);
      pending = fn;
    },
    reload: () => {
      log.reloads++;
    },
    show: (mode, onReload) => {
      log.shown.push(mode);
      log.button = onReload;
    },
  };
  const fire = (type: string, e: unknown) => listeners[type]?.forEach((fn) => fn(e));
  const runTimer = () => pending?.();
  return { env, fire, runTimer, log, store };
}

const stale = new TypeError(
  'Failed to fetch dynamically imported module: https://x.dev/_astro/a.js',
);

describe('installStaleChunkGuard', () => {
  it('listens to all three window events', () => {
    const types: string[] = [];
    const { env } = fakeEnv();
    installStaleChunkGuard({ ...env, on: (t) => types.push(t) });
    assert.deepEqual(types.sort(), ['error', 'unhandledrejection', 'vite:preloadError']);
  });

  it('on a stale file: shows the notice, reloads once after the delay, records when', () => {
    const { env, fire, runTimer, log, store } = fakeEnv();
    installStaleChunkGuard(env);
    fire('vite:preloadError', { payload: stale });
    fire('unhandledrejection', { reason: stale }); // the same failure, seen twice
    assert.deepEqual(log.shown, ['reloading']);
    assert.deepEqual(log.timers, [RELOAD_DELAY_MS]);
    assert.equal(log.reloads, 0);
    runTimer();
    assert.equal(log.reloads, 1);
    assert.equal(store.get(RELOAD_KEY), '5000000');
  });

  it('a second stale error soon after a reload prompts and never reloads by itself', () => {
    const { env, fire, log } = fakeEnv(String(5_000_000 - 10_000));
    installStaleChunkGuard(env);
    fire('error', { error: stale });
    assert.deepEqual(log.shown, ['prompt']);
    assert.deepEqual(log.timers, []);
    assert.equal(log.reloads, 0);
    log.button?.(); // the editor presses Reload
    assert.equal(log.reloads, 1);
  });

  it('ignores errors that are not a missing file', () => {
    const { env, fire, log } = fakeEnv();
    installStaleChunkGuard(env);
    fire('error', { error: new Error('Cannot read properties of undefined') });
    fire('unhandledrejection', { reason: 'nope' });
    assert.deepEqual(log.shown, []);
  });

  it('still reloads when storage is blocked', () => {
    const { env, fire, runTimer, log } = fakeEnv(null, { storageThrows: true });
    installStaleChunkGuard(env);
    fire('vite:preloadError', { payload: stale });
    runTimer();
    assert.equal(log.reloads, 1);
  });

  it('the Studio boot page installs it', () => {
    const page = readFileSync(new URL('../pages/studio/index.astro', import.meta.url), 'utf8');
    assert.match(page, /installStaleChunkGuard\(browserGuardEnv\(\)\)/);
  });
});

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// An open Studio that outlives a deploy reloads itself (PORTS.md card 179)
// =============================================================================
// THE PROBLEM. The Studio loads most of its code lazily: a field's picker, an
// input type, a tool, each a hashed file under /_astro/ fetched the first time
// it is needed. Cloudflare Workers static assets keep only the CURRENT build's
// files, so after a deploy (every merge, and every Studio publish through the
// webhook) a Studio tab opened earlier asks for a file that no longer exists.
// Chrome's words for it: "Failed to fetch dynamically imported module". Sanity
// catches that at the desk level ("Import error ... Reloading now") but a
// field's own error boundary does not, so the editor saw a raw red "Unhandled
// Runtime Error" inside the image field until they reloaded by hand.
//
// THE FIX. The boot page (src/pages/studio/index.astro) calls
// installStaleChunkGuard(browserGuardEnv()) once. Every lazy import in the
// build goes through Vite's preload helper, which fires `vite:preloadError` on
// window when the import fails; window `unhandledrejection` and `error` are
// watched too, for anything that skips the helper. On the first stale-file
// error the guard shows a plain notice ("The Studio was updated. Reloading to
// carry on.") and reloads after RELOAD_DELAY_MS. If the page already reloaded
// for this reason within LOOP_WINDOW_MS (a file genuinely missing from the
// new build, say), it does not reload again: the notice stays with a Reload
// button instead, so a broken deploy can never spin the tab.
//
// EDITS ARE SAFE. Sanity writes every change to the draft on the server as the
// editor types (operationEvents.ts in sanity 6.19: patches auto-commit on a
// 1000 ms throttle, leading and trailing), so the reload delay of 2.5 s lets
// the last keystroke reach the server first. Nothing lives only in the tab.
//
// WHY NOT KEEP THE OLD FILES. Workers static assets replace the whole asset
// set on every `wrangler deploy`; a previous version's files are not served by
// the new one. Keeping them would mean carrying the last build's /_astro/
// files into each new dist (a CI cache), which grows without bound and still
// misses a tab two deploys old. Reloading is what Sanity itself does.
//
// Pure apart from browserGuardEnv(), so src/lib/studio-stale-chunk.test.ts
// drives the guard in bare Node with a fake window.
// =============================================================================

/** sessionStorage key: when this tab last reloaded for a stale file (ms). */
export const RELOAD_KEY = 'ncs:studio:staleChunkReloadAt';
/** A second stale-file error this soon after a reload prompts instead. */
export const LOOP_WINDOW_MS = 60_000;
/** Time for Sanity's 1 s auto-commit to send the last edit before reloading. */
export const RELOAD_DELAY_MS = 2_500;

/** The words the editor sees (American English, no em-dashes). */
export const STALE_CHUNK_WORDS = {
  reloading: 'The Studio was updated. Reloading to carry on.',
  prompt: 'The Studio was updated. Reload to carry on.',
  saved: 'Your edits are saved as you type.',
  button: 'Reload',
} as const;

// What each browser says when a lazily loaded file is missing, plus Vite's own
// message for a missing stylesheet. Matched case-insensitively anywhere in the
// message (Sanity's isImportError() uses the same first three).
const STALE_CHUNK_MESSAGES = [
  'failed to fetch dynamically imported module', // Chromium
  'error loading dynamically imported module', // Firefox
  'importing a module script failed', // Safari
  'unable to preload css', // Vite, a missing CSS chunk
];

/** True when an error (or its message) says a lazily loaded file is missing. */
export function isStaleChunkError(error: unknown): boolean {
  let message = '';
  if (typeof error === 'string') message = error;
  else if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === 'string') message = m;
  }
  if (!message) return false;
  const lower = message.toLowerCase();
  return STALE_CHUNK_MESSAGES.some((m) => lower.includes(m));
}

/**
 * Reload, or ask? 'reload' unless this tab already reloaded for a stale file
 * less than LOOP_WINDOW_MS ago. A missing, unreadable or future timestamp
 * counts as no earlier reload.
 */
export function decideRecovery(
  lastReloadAt: string | null,
  now: number,
  windowMs: number = LOOP_WINDOW_MS,
): 'reload' | 'prompt' {
  const last = lastReloadAt === null ? NaN : Number(lastReloadAt);
  if (!Number.isFinite(last) || last > now) return 'reload';
  return now - last < windowMs ? 'prompt' : 'reload';
}

/** Everything the guard touches, so a test can stand in for the browser. */
export interface StaleChunkGuardEnv {
  /** Subscribe to a window event; the listener gets the raw event. */
  on: (
    type: 'vite:preloadError' | 'unhandledrejection' | 'error',
    fn: (e: unknown) => void,
  ) => void;
  /** sessionStorage get/set; may throw (storage blocked), the guard copes. */
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  now: () => number;
  later: (fn: () => void, ms: number) => void;
  reload: () => void;
  /** Draw the notice; `onReload` is wired to its button. */
  show: (mode: 'reloading' | 'prompt', onReload: () => void) => void;
}

/** The error an event carries: Vite's payload, a rejection reason or an ErrorEvent's error. */
function errorOf(e: unknown): unknown {
  if (!e || typeof e !== 'object') return e;
  const ev = e as { payload?: unknown; reason?: unknown; error?: unknown; message?: unknown };
  return ev.payload ?? ev.reason ?? ev.error ?? ev.message;
}

/**
 * Watch for stale-file errors and recover once per page. Returns nothing; all
 * effects go through `env`.
 */
export function installStaleChunkGuard(env: StaleChunkGuardEnv): void {
  let handled = false;
  const doReload = () => {
    try {
      env.setItem(RELOAD_KEY, String(env.now()));
    } catch {
      /* Storage blocked: the reload still happens; the loop guard is lost. */
    }
    env.reload();
  };
  const onError = (e: unknown) => {
    if (handled || !isStaleChunkError(errorOf(e))) return;
    handled = true;
    let last: string | null = null;
    try {
      last = env.getItem(RELOAD_KEY);
    } catch {
      /* Storage blocked: treat as no earlier reload. */
    }
    if (decideRecovery(last, env.now()) === 'prompt') {
      env.show('prompt', doReload);
      return;
    }
    env.show('reloading', doReload);
    env.later(doReload, RELOAD_DELAY_MS);
  };
  env.on('vite:preloadError', onError);
  env.on('unhandledrejection', onError);
  env.on('error', onError);
}

/** The real browser behind the guard: window events, sessionStorage, a small notice. */
export function browserGuardEnv(): StaleChunkGuardEnv {
  return {
    on: (type, fn) => window.addEventListener(type, fn as EventListener),
    getItem: (key) => window.sessionStorage.getItem(key),
    setItem: (key, value) => window.sessionStorage.setItem(key, value),
    now: () => Date.now(),
    later: (fn, ms) => {
      window.setTimeout(fn, ms);
    },
    reload: () => window.location.reload(),
    show: (mode, onReload) => {
      document.getElementById('ncs-stale-chunk')?.remove();
      const box = document.createElement('div');
      box.id = 'ncs-stale-chunk';
      box.setAttribute('role', 'alert');
      box.setAttribute('data-mode', mode);
      // Inline styles: this must draw even when the Studio's own CSS is the
      // thing that failed to load. Sits above Sanity's dialogs and toasts.
      box.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:max(16px, env(safe-area-inset-bottom))',
        'transform:translateX(-50%)',
        'z-index:2147483647',
        'box-sizing:border-box',
        'width:min(480px, calc(100vw - 32px))',
        'display:flex',
        'flex-wrap:wrap',
        'align-items:center',
        'gap:8px 16px',
        'padding:14px 16px',
        'border-radius:8px',
        'background:#1f2933',
        'color:#fff',
        'font:15px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif',
        'box-shadow:0 6px 24px rgba(0,0,0,.25)',
      ].join(';');
      const text = document.createElement('div');
      text.style.cssText = 'flex:1 1 220px';
      const line = document.createElement('strong');
      line.textContent = STALE_CHUNK_WORDS[mode];
      const saved = document.createElement('div');
      saved.textContent = STALE_CHUNK_WORDS.saved;
      saved.style.cssText = 'opacity:.8;font-size:13px';
      text.append(line, saved);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = STALE_CHUNK_WORDS.button;
      button.style.cssText =
        'min-height:44px;padding:0 18px;border:0;border-radius:6px;background:#fff;color:#1f2933;font:inherit;font-weight:600;cursor:pointer';
      button.addEventListener('click', onReload);
      box.append(text, button);
      document.body.append(box);
    },
  };
}

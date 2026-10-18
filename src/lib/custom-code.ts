// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Custom code: the safe-by-default box for pasted widgets (PORTS.md card 121)
// =============================================================================
// An editor can paste HTML, CSS and JavaScript (a countdown, a sign-up gadget,
// a map, something an AI wrote) into the "Custom code or embed" block. The
// Studio is embedded at /studio on the SAME origin as the site, so code pasted
// straight into the page could read the Studio's session token from
// localStorage while an editor is signed in, or rewrite the page around it.
//
// So by default the code runs inside an iframe built from `srcdoc` with a
// sandbox that does NOT include allow-same-origin. The browser gives that
// document an opaque origin ("null"): it cannot touch the site's cookies,
// localStorage or DOM, and `parent.document` throws. The pure pieces live here
// so they can be unit-tested (src/lib/custom-code.test.ts):
//
//   buildFrameDocument()   the srcdoc: base stylesheet in the site's fonts and
//                          light colours, <base target="_blank">, reduced
//                          motion honoured, and a tiny script that posts the
//                          document's height to the parent.
//   isFrameHeightMessage() the parent's check on what it receives.
//   clampFrameHeight()     the parent never trusts the number as given.
//   codeWarnings()         the Studio's "this reaches outside its box" warning.
//   hasOnPageCode() etc.   what the Checkup rules look for.
//
// The opt-out ("Runs directly on the page") keeps the old set:html behaviour
// for trusted provider snippets. The trust model, in full:
// docs/agent/custom-code.md.
// =============================================================================

/** The sandbox for pasted code. Never add allow-same-origin or allow-top-navigation. */
export const FRAME_SANDBOX = [
  'allow-scripts',
  'allow-forms',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-modals',
].join(' ');

/** The one message shape the parent accepts from a frame. */
export const FRAME_MESSAGE_TYPE = 'ncs-custom-code-height';

/** Heights outside this range are clamped (a runaway widget cannot make a 1km page). */
export const FRAME_MIN_HEIGHT = 40;
export const FRAME_MAX_HEIGHT = 5000;

/** The look a frame inherits from the site. Values come from brand/brand.config.json. */
export interface FrameTheme {
  /** @font-face rules for the site's fonts (studioFonts.css, inlined by Vite). */
  fontCss?: string;
  /** Prefix for root-relative font URLs, e.g. "https://example.org". */
  assetOrigin?: string;
  background?: string;
  foreground?: string;
  primary?: string;
  primaryForeground?: string;
  link?: string;
  border?: string;
  mutedForeground?: string;
  radius?: string;
  fontDisplay?: string;
  fontBody?: string;
}

/** A CSS value from config, with anything that could end the declaration removed. */
export function cssValue(value: string | undefined, fallback: string): string {
  const v = typeof value === 'string' ? value.replace(/[<>{};]/g, '').trim() : '';
  return v || fallback;
}

/** Keep a stylesheet from closing its own <style> element early. */
export function safeStyleText(css: string): string {
  return css.replace(/<\/(style)/gi, '<\\/$1');
}

/** `url(/_astro/x.woff2)` becomes `url(https://site/_astro/x.woff2)`; other URLs are left alone. */
export function absolutizeCssUrls(css: string, origin?: string): string {
  if (!origin) return css;
  const base = origin.replace(/\/+$/, '');
  return css.replace(/url\(\s*(['"]?)\/(?!\/)/g, (_m, quote: string) => `url(${quote}${base}/`);
}

/**
 * The script that runs first inside every frame. It measures the document and
 * posts `{ type, height }` to the parent whenever the height changes. It reads
 * nothing and accepts nothing; the parent decides what to do with the number.
 */
export const RESIZE_SCRIPT = `(function () {
  var last = -1;
  function measure() {
    var root = document.documentElement;
    var h = Math.ceil(root.getBoundingClientRect().height);
    if (h === last || !isFinite(h)) return;
    last = h;
    try { parent.postMessage({ type: ${JSON.stringify(FRAME_MESSAGE_TYPE)}, height: h }, '*'); } catch (e) {}
  }
  if (typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    document.addEventListener('DOMContentLoaded', function () { if (document.body) ro.observe(document.body); });
  }
  document.addEventListener('DOMContentLoaded', measure);
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  // The parent's listener is a deferred module script and may not be in place
  // for the first post: say it again a little later, even if nothing changed.
  function again() { last = -1; measure(); }
  setTimeout(again, 600);
  setTimeout(again, 2000);
})();`;

/** The base stylesheet: the site's fonts and light colours, quiet defaults, reduced motion. */
export function frameBaseCss(theme: FrameTheme = {}): string {
  const bg = cssValue(theme.background, '#ffffff');
  const fg = cssValue(theme.foreground, '#1f2328');
  const primary = cssValue(theme.primary, fg);
  const primaryFg = cssValue(theme.primaryForeground, bg);
  const link = cssValue(theme.link, primary);
  const border = cssValue(theme.border, '#e5e7eb');
  const muted = cssValue(theme.mutedForeground, fg);
  const radius = cssValue(theme.radius, '0.5rem');
  const body = cssValue(theme.fontBody, 'system-ui, -apple-system, sans-serif');
  const display = cssValue(theme.fontDisplay, body);
  return `:root {
  color-scheme: light;
  --background: ${bg};
  --foreground: ${fg};
  --primary: ${primary};
  --primary-foreground: ${primaryFg};
  --link: ${link};
  --border: ${border};
  --muted-foreground: ${muted};
  --radius: ${radius};
  --font-display: ${display};
  --font-body: ${body};
}
html { height: auto; -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  display: flow-root;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-wrap: break-word;
}
h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); line-height: 1.2; margin: 0 0 0.5em; }
p { margin: 0 0 1em; }
a { color: var(--link); }
img, video, iframe, canvas, svg { max-width: 100%; }
img, video { height: auto; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}`;
}

/**
 * The whole srcdoc for one frame. `code` goes into <body> exactly as pasted:
 * Astro escapes the srcdoc attribute, and the browser un-escapes it, so the
 * frame receives the editor's bytes unchanged. A pasted full document
 * (<!doctype html><html><head>...) still works: the parser folds the extra
 * html/head/body tags into the ones already open.
 */
export function buildFrameDocument(code: string, theme: FrameTheme = {}): string {
  const fonts = theme.fontCss
    ? safeStyleText(absolutizeCssUrls(theme.fontCss, theme.assetOrigin))
    : '';
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<base target="_blank">',
    fonts ? `<style data-frame="fonts">${fonts}</style>` : '',
    `<style data-frame="base">${safeStyleText(frameBaseCss(theme))}</style>`,
    `<script data-frame="resize">${RESIZE_SCRIPT}</script>`,
    '</head>',
    '<body>',
    code,
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}

export interface FrameHeightMessage {
  type: typeof FRAME_MESSAGE_TYPE;
  height: number;
}

/** True only for `{ type: FRAME_MESSAGE_TYPE, height: <finite number> }` and nothing else. */
export function isFrameHeightMessage(data: unknown): data is FrameHeightMessage {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  const keys = Object.keys(d);
  if (keys.length !== 2 || !keys.includes('type') || !keys.includes('height')) return false;
  return d.type === FRAME_MESSAGE_TYPE && typeof d.height === 'number' && Number.isFinite(d.height);
}

/** The height the parent will actually set, in whole pixels. */
export function clampFrameHeight(
  height: number,
  min = FRAME_MIN_HEIGHT,
  max = FRAME_MAX_HEIGHT,
): number {
  if (!Number.isFinite(height)) return min;
  return Math.min(max, Math.max(min, Math.ceil(height)));
}

/** Patterns that try to reach outside the box. Blocked in the box; risky on the page. */
const REACHING_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: 'document.cookie', re: /document\s*\.\s*cookie/i },
  { label: 'localStorage', re: /\blocalStorage\b/ },
  { label: 'top.location', re: /\btop\s*\.\s*location\b/ },
  { label: 'parent.', re: /\bparent\s*\.\s*[A-Za-z_$]/ },
];

/** Which reaching-out patterns the code contains, in a fixed order. */
export function codeWarnings(code: unknown): string[] {
  if (typeof code !== 'string' || !code) return [];
  return REACHING_PATTERNS.filter((p) => p.re.test(code)).map((p) => p.label);
}

/** The Studio's warning text for a code field, or true when there is nothing to say. */
export function codeWarningMessage(code: unknown, runsOnPage: boolean): string | true {
  const found = codeWarnings(code);
  if (!found.length) return true;
  const list = found.join(', ');
  return runsOnPage
    ? `This code uses ${list} and runs directly on the page, so it can read what the website and a signed-in editor can. Only keep it if you trust where it came from.`
    : `This code uses ${list}. Inside its own box that is blocked, so the widget may not work as written. Ask for a version that does not need it, or see the "Runs directly on the page" switch.`;
}

/** Routes where site-wide extra code never runs: the Studio, the draft preview, the API. */
export function isSiteCodeRoute(pathname: string): boolean {
  return !/^\/(studio|preview|api)(\/|$)/.test(pathname);
}

/** Does this value hold an embed block switched to run directly on the page? Returns the paths. */
export function onPageCodePaths(value: unknown): string[][] {
  const out: string[][] = [];
  const go = (v: unknown, path: string[]) => {
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        const key =
          item && typeof item === 'object' && typeof (item as { _key?: unknown })._key === 'string'
            ? `[_key=="${(item as { _key: string })._key}"]`
            : `[${i}]`;
        go(item, [...path, key]);
      });
      return;
    }
    if (!v || typeof v !== 'object') return;
    const obj = v as Record<string, unknown>;
    if (
      obj.runsOnPage === true &&
      typeof obj.embedCode === 'string' &&
      obj.embedCode.trim() &&
      !(typeof obj.embedUrl === 'string' && obj.embedUrl.trim())
    ) {
      out.push(path);
    }
    for (const [k, inner] of Object.entries(obj)) {
      if (k.startsWith('_')) continue;
      go(inner, [...path, k]);
    }
  };
  go(value, []);
  return out;
}

/** The site-wide code fields on Site settings that hold something. */
export const SITE_CODE_FIELDS = ['headCode', 'bodyEndCode'] as const;

export function siteCodeFieldsInUse(doc: Record<string, unknown>): string[] {
  return SITE_CODE_FIELDS.filter((f) => {
    const v = doc[f];
    return typeof v === 'string' && v.trim().length > 0;
  });
}

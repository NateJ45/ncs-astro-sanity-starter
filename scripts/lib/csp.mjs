// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// csp.mjs - the pieces of the site's script-src policy (PORTS.md card 153)
// =============================================================================
// Pure helpers for scripts/build-csp.mjs, tested in csp.test.mjs. They read
// built HTML and answer: which inline scripts run (hashed), which external
// script origins load, and which inline event handlers exist.
//
// Why build time and not Astro's own `security.csp`: Astro's CSP does not
// support the <ClientRouter /> this site navigates with. The router runs the
// NEXT page's inline scripts under the FIRST page's policy, so the policy has
// to allow every inline script on every page: one site-wide list of hashes,
// sent as a header (public/_headers), recomputed by every build.
import { createHash } from 'node:crypto';

/** sha256 source expression for a script's exact text. */
export const hashSource = (text) =>
  `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** Undo the HTML attribute escaping Astro writes into srcdoc="...". */
export const decodeAttr = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// Script types the browser executes. JSON-LD, JSON data islands and templates
// never run, so CSP never looks at them.
const RUNS = /^(module|text\/javascript|application\/javascript)$/i;

/**
 * Everything script-related in one HTML document, including the documents
 * inside srcdoc iframes (the Custom code block): an srcdoc frame inherits the
 * embedding page's policy, so its scripts must be allowed by it too.
 */
export function scanHtml(html) {
  const inline = new Set();
  const origins = new Set();
  const handlers = new Set();
  const visit = (doc) => {
    for (const m of doc.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = m[1];
      const src = /\bsrc\s*=\s*["']?([^"' >]+)/i.exec(attrs)?.[1];
      if (src) {
        const url = src.startsWith('//') ? `https:${src}` : src;
        if (/^https?:/i.test(url)) origins.add(new URL(url).origin);
        continue;
      }
      const type = /\btype\s*=\s*["']?([^"' >]+)/i.exec(attrs)?.[1];
      if (type && !RUNS.test(type)) continue;
      inline.add(m[2]);
    }
    // on*="..." attributes, read the way the browser hashes them (the decoded value).
    for (const m of doc.matchAll(/<[a-z][^>]*?\son[a-z]+\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
      handlers.add(decodeAttr(m[2] ?? m[3] ?? ''));
    }
    for (const m of doc.matchAll(/\ssrcdoc\s*=\s*"([^"]*)"/gi)) visit(decodeAttr(m[1]));
  };
  visit(html);
  return { inline, origins, handlers };
}

/**
 * The script-src value. 'self' covers the /_astro bundles and Pagefind;
 * 'wasm-unsafe-eval' lets Pagefind start its WebAssembly (it allows wasm
 * compilation only, never eval of JavaScript). 'unsafe-inline' comes last as the
 * old-browser fallback Lighthouse asks for. `extraOrigins` are origins
 * our own code adds at runtime and so never appear in the HTML (GA4).
 */
export function scriptSrc({ inline, origins, handlers }, extraOrigins = []) {
  const parts = ["'self'", "'wasm-unsafe-eval'"];
  for (const o of [...new Set([...origins, ...extraOrigins])].sort()) parts.push(o);
  // Inline handlers need 'unsafe-hashes' plus their hashes; no public page has one today.
  if (handlers.size) parts.push("'unsafe-hashes'");
  for (const h of [...new Set([...inline, ...handlers].map(hashSource))].sort()) parts.push(h);
  // Ignored by every browser that understands hashes (the spec says so); only a browser too old
  // for hashes reads it, and would otherwise run none of the inline scripts.
  parts.push("'unsafe-inline'");
  return parts.join(' ');
}

/**
 * The embed-provider ids a built page carries (PORTS.md card 172). The Custom
 * code or embed block writes data-embed-provider="<id>" on the wrapper of code
 * from a service in src/lib/embed-providers.ts; build-csp.mjs looks each id up
 * there and adds that service's script origins. An id the registry does not know
 * adds nothing, so a marker typed into pasted code names no origin of its own.
 */
export function embedProviderIds(html) {
  const ids = new Set();
  for (const m of String(html).matchAll(/\sdata-embed-provider\s*=\s*"([a-z0-9-]+)"/g)) {
    ids.add(m[1]);
  }
  return ids;
}

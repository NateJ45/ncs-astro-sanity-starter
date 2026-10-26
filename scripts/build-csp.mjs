// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// build-csp.mjs - write the public pages' script policy into _headers (PORTS.md card 153)
// =============================================================================
// Runs straight after `astro build` (package.json "build"), so CI, Lighthouse,
// `npm run preview` and deploy all ship the same policy. It reads every built
// page in dist/client (the Studio's own pages excepted: /studio/* detaches the
// policy in public/_headers) and rewrites the /* rule's Content-Security-Policy
// line in dist/client/_headers from
//     frame-ancestors 'self'
// to
//     frame-ancestors 'self'; object-src 'none'; base-uri 'self'; script-src <list>
// where <list> is 'self', 'wasm-unsafe-eval' (Pagefind), the external script
// origins the pages load, and a sha256 hash of every inline script on every page
// (scripts/lib/csp.mjs says why it is one site-wide list).
//
// Only script-src, object-src and base-uri are restricted, never default-src:
// images, frames (YouTube, maps, booking widgets), styles, fonts and fetches
// carry on exactly as before, so a new embed cannot break silently.
// What CAN break: a script that pasted code (Custom code block, Site settings'
// page code) ADDS at runtime from an origin that is not in the HTML. If one
// appears, list its origin in scripts/csp-origins.json (the site's own file, not
// PORTABLE: a JSON array of origin strings). docs/agent/deployment.md ("Security headers").
//
// Known embed services (PORTS.md card 172): a widget from the Custom code or
// embed block's registry (src/lib/embed-providers.ts) often loads more of itself
// at runtime from a sibling host. The block marks such code with
// data-embed-provider="<id>"; this script reads those ids off the built pages
// and adds that service's script origins, only to a build where a page uses it.
// The registry is a TypeScript file, so it is imported only when a page carries
// a marker (package.json runs this script with --experimental-strip-types for
// Node 22.12 to 22.17), and a site without the registry is never asked for it.
//
// Fails the build if the line it replaces is missing, so the policy can never
// quietly fall back to none.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { embedProviderIds, scanHtml, scriptSrc } from './lib/csp.mjs';

const ROOT = 'dist/client';
const HEADERS = path.join(ROOT, '_headers');
const PLACEHOLDER = "  Content-Security-Policy: frame-ancestors 'self'";
const SITE_ORIGINS = 'scripts/csp-origins.json';

// Origins the family's own code adds at runtime, so they never appear as a <script src>.
// GA4 (GoogleAnalytics.astro) builds its tag in JS; included only when a page carries it.
const RUNTIME_ORIGINS = [
  { origin: 'https://www.googletagmanager.com', when: 'googletagmanager.com/gtag/js' },
];

// The site's own runtime origins (optional file, always allowed when present).
const siteOrigins = fs.existsSync(SITE_ORIGINS)
  ? JSON.parse(fs.readFileSync(SITE_ORIGINS, 'utf8'))
  : [];
if (
  !Array.isArray(siteOrigins) ||
  siteOrigins.some((o) => typeof o !== 'string' || !/^https:\/\/[^/\s]+$/.test(o))
) {
  console.error(
    `[csp] ${SITE_ORIGINS} must be a JSON array of origins like "https://widget.example.com".`,
  );
  process.exit(1);
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return p === path.join(ROOT, 'studio') ? [] : walk(p);
    return e.name.endsWith('.html') ? [p] : [];
  });

const pages = walk(ROOT);
const all = { inline: new Set(), origins: new Set(), handlers: new Set() };
const embedIds = new Set();
for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const found = scanHtml(html);
  for (const k of Object.keys(all)) for (const v of found[k]) all[k].add(v);
  for (const id of embedProviderIds(html)) embedIds.add(id);
}

// The script origins of the known embed services the pages use (see the header).
const EMBED_REGISTRY = 'src/lib/embed-providers.ts';
let embedOrigins = [];
let embedNames = [];
if (embedIds.size && fs.existsSync(EMBED_REGISTRY)) {
  const { providerById, providerCspOrigins } = await import(
    pathToFileURL(path.resolve(EMBED_REGISTRY)).href
  );
  const providers = [...embedIds].map((id) => providerById(id)).filter(Boolean);
  embedNames = providers.map((p) => p.name);
  embedOrigins = [...new Set(providers.flatMap((p) => providerCspOrigins(p)))];
}

const inlineText = [...all.inline].join('\n');
const extra = [
  ...RUNTIME_ORIGINS.filter((r) => inlineText.includes(r.when)).map((r) => r.origin),
  ...siteOrigins,
  ...embedOrigins,
];
const policy = `frame-ancestors 'self'; object-src 'none'; base-uri 'self'; script-src ${scriptSrc(all, extra)}`;

const headers = fs.readFileSync(HEADERS, 'utf8');
const lines = headers.split(/\r?\n/);
const at = lines.indexOf(PLACEHOLDER);
if (at === -1) {
  console.error(
    `[csp] ${HEADERS} has no line "${PLACEHOLDER.trim()}" under /* to replace. Not shipping without a policy.`,
  );
  process.exit(1);
}
lines[at] = `  Content-Security-Policy: ${policy}`;
// Cloudflare rejects a _headers line over 2,000 characters, and the deploy then
// fails (card 159). Every inline script adds a 54-byte hash, so the usual cause is
// Vite inlining small processed scripts: vite.build.assetsInlineLimit: 0 in
// astro.config.mjs ships them as files. Fail here, not at deploy; warn near it.
const LINE_LIMIT = 2000;
const lineLength = lines[at].length;
if (lineLength > LINE_LIMIT) {
  console.error(
    `[csp] The Content-Security-Policy line is ${lineLength} characters; Cloudflare's _headers limit is ${LINE_LIMIT}. ` +
      `Check vite.build.assetsInlineLimit is 0 and look for new inline scripts.` +
      (embedNames.length ? ` Embed services adding origins: ${embedNames.join(', ')}.` : ''),
  );
  process.exit(1);
}
if (lineLength > LINE_LIMIT - 100) {
  console.warn(
    `[csp] The Content-Security-Policy line is ${lineLength} of ${LINE_LIMIT} characters.`,
  );
}
fs.writeFileSync(HEADERS, lines.join('\n'));
console.log(
  `[csp] script-src written: ${pages.length} pages, ${all.inline.size} inline scripts, ` +
    `${all.origins.size + extra.length} external origins, ${all.handlers.size} inline handlers ` +
    `(${Buffer.byteLength(policy)} bytes)` +
    (embedNames.length ? `; embed services: ${embedNames.join(', ')}` : ''),
);

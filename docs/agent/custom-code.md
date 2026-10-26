# Custom code: the trust model (security note)

PORTS.md card 121. Read this before touching `src/lib/custom-code.ts`, `src/components/CustomCodeFrame.astro`, the
`embedSection` schema, Site settings' "Code on every page", or `public/_headers`.

## Why it matters

The Studio is embedded at `/studio` on the **same origin** as the public site. While an editor is signed in, the Studio
keeps their Sanity session token in that origin's `localStorage`. Anything that runs as script on a page of the site
can read it, and with it act as that editor (publish, delete, invite). It can also read cookies and rewrite the page.

Editors are now invited to paste code: a countdown, a sign-up gadget, a map, a calculator, often written by an AI. That
code is not reviewed by a developer. So pasted code must not run with the site's privileges unless someone has decided,
on purpose, that it should.

## The three ways code reaches a page

| Path                                                    | Where it runs                                                                     | Can read the site's storage, cookies, DOM? | Who uses it                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| Custom code block, default                              | `srcdoc` iframe, sandbox **without** `allow-same-origin` (opaque origin, "null")  | **No**                                     | Anything pasted: AI widgets, small snippets              |
| Custom code block, "Runs directly on the page" on       | The page itself (`set:html`), the old behaviour                                   | Yes                                        | A trusted provider's snippet that will not work in a box |
| Site settings, "Code on every page" (head, end of body) | Every public page (`set:html` in BaseLayout), never `/studio`, `/preview`, `/api` | Yes                                        | A trusted analytics, verification or chat snippet        |
| Embed URL (unchanged)                                   | A provider's page in an iframe (`allow-same-origin` with the PROVIDER's origin)   | No (it is another origin)                  | Calendly, Cal.com, Tally, Google Forms                   |

The second and third rows are the opt-outs. Each is off or empty by default, carries a caution in its Studio
description, and is listed by the Checkup ("Code that runs directly on the page", "Code on every page") for as long as
it is in use.

## The box, in detail

- **Sandbox** (`FRAME_SANDBOX`): `allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals`.
  Never add `allow-same-origin` (with `allow-scripts` it lets the frame remove its own sandbox) and never any
  `allow-top-navigation*` (the frame could send the visitor elsewhere). A unit test fails if either appears.
- **What is blocked**: `parent.document` throws, `localStorage`/`sessionStorage`/`indexedDB` throw, `document.cookie`
  throws. `tests/custom-code.spec.ts` proves it in a real browser against a secret the page stores first.
- **What still works**: scripts, forms (a widget can POST to a form service), `alert`/`confirm`, links and pop-ups (they
  open in a new tab, unsandboxed, via `<base target="_blank">` and `allow-popups-to-escape-sandbox`), external scripts
  and images the widget loads itself.
- **What does not work, by design**: anything that needs to remember between visits (no storage), read the visitor's
  login, or change the page around it. The Studio warns (a warning, not an error) when code mentions
  `document.cookie`, `localStorage`, `top.location` or `parent.`.
- **Height**: a script injected first into the srcdoc posts `{ type: 'ncs-custom-code-height', height }` to the parent
  on load and on resize. The parent accepts a message only when `event.source` is one of its custom-code frames'
  `contentWindow`, `event.origin` is `"null"`, and the data is exactly that two-key shape with a finite number; then it
  clamps the height to 40 to 5000 px. The frame itself listens to nothing.
- **Look**: the srcdoc carries a base stylesheet in the site's fonts and **light** colours from
  `brand/brand.config.json` (`palette.light`, `fonts.*.familyValue`, `radius`) and the font files from
  `src/sanity/studioFonts.css` (inlined by Vite with `?inline`, the same list apply-brand writes for the Studio). The
  widget can use `--background`, `--foreground`, `--primary`, `--link`, `--border`, `--muted-foreground`, `--radius`,
  `--font-display` and `--font-body`. It cannot style anything outside its box. In dark mode the frame sits on a light
  panel, because pasted widgets nearly always hard-code dark text. Reduced motion is honoured inside the frame.
- **Fonts and CORS**: the font URLs stay root-relative and resolve against the embedding page (an srcdoc document's
  base URL is its parent's), so they load from whichever host serves the page. A font fetch from an opaque origin is a
  CORS request, so `public/_headers` sends `Access-Control-Allow-Origin: *` on `/_astro/*` (with the immutable cache
  line, trap 2 in that file). Under `npm run dev` or a plain static server there is no such header and the frame falls
  back to system fonts; `npm run preview` (wrangler dev) shows the real thing.

## Site-wide code

`headCode` and `bodyEndCode` on Site settings are fetched by their own query (`getSiteCode()` in `src/lib/queries.ts`),
not by `SITE_SETTINGS_PROJECTION`, because that projection also feeds the preview shell. BaseLayout renders them only
when `isSiteCodeRoute(pathname)` is true. The Studio (`/studio`, its own page) and the preview (`PreviewLayout`) do not
use BaseLayout at all; the route guard keeps that true if one ever does.

With View Transitions (`<ClientRouter />`) a script in this code runs on the first page load, and inline scripts may
run again on later navigations. A snippet that must act on every page change should listen for `astro:page-load`.

## Preview and stega

`embedCode` and `runsOnPage` are in `NON_STEGA_FIELDS` (rule 8b): code is not prose, and invisible stega markers must
not be appended to it. The boxed frame renders in Presentation exactly as on the live site.

## Changing any of this

Do not loosen the sandbox, do not move the site-wide code into the shared projection, and do not render pasted code
with `set:html` anywhere except the two opt-outs above. If a provider genuinely needs the page, that is what the switch
is for, and the Checkup keeps it visible.

## Paste-and-go and the provider registry (PORTS.md card 172)

The block has one paste box at the top (`src/sanity/components/EmbedPasteInput.tsx`, PORTABLE). A
link, or code that is only an iframe, goes into `embedUrl`; other code into `embedCode`, with
`runsOnPage` switched on when every script in it comes from a known service. Nothing new is
stored: `src/lib/embed-providers.ts` (PORTABLE) works the plan out again in the Studio and on every
build (rule 15), and `EmbedSection.astro` renders from it.

- **The registry** (`EMBED_PROVIDERS`): YouTube, Vimeo, Facebook video, Google Maps, Google
  Calendar, Google Forms, Spotify, Apple Podcasts, Church Trac, Planning Center, Tithe.ly,
  Givelify, Subsplash, SignUpGenius, Calendly. Each has hosts, a size (16:9 for video, a fixed
  height for players, maps and forms) and, where it hands out script code, its script hosts.
  Share links are turned into embeddable ones (a YouTube watch link into
  `youtube-nocookie.com/embed/...`, a Spotify episode into its player, a Calendar `?cid=` into
  `embed?src=`). A link that cannot be framed (a `maps.app.goo.gl` share link, a Facebook page,
  a Form's edit link) is an error on the field with what to paste instead, and the site shows
  nothing for it. A known service's frame also gets `allow-popups-to-escape-sandbox` and its
  `allow` list (payment, fullscreen). The Height choice hides when the service sets the size.
  The church services cost a site that never pastes them nothing.
- **The guard rail.** With "Runs directly on the page" on, code still goes in its box unless
  every `<script src>` belongs to a known service or to the site's
  `site.embeds.approvedScriptOrigins` (`src/data/site.ts`, empty by default), and inline scripts
  or `on*` handlers only ride along with such a script. The Studio says who must approve it. An
  unknown LINK still works, framed in the sandboxed iframe. To approve a service for every site,
  add it to the registry in the starter with a test; for one site's one-off widget, add its origin
  to `approvedScriptOrigins`. The styleguide's own probes pass `trustedCode` to `SectionRenderer`
  (repo-written code only, never Sanity content).
- **Per-site words.** `EMBED_WORDS` in `src/sanity/schemaTypes/sections.ts` names who approves
  ("your web designer") and the services the empty block suggests; it goes to
  `makeEmbedPasteInput()` and `describePlan()`.
- **CSP**: a known service's code (boxed or on the page) carries `data-embed-provider="<id>"` on
  its wrapper. `scripts/build-csp.mjs` reads those ids from the built pages and adds that
  service's script hosts and their subdomains to `script-src`, only when a page uses the service
  (`docs/agent/deployment.md`, "Security headers"). A marker typed into pasted code by hand names
  no origin of its own: only registry ids count. Tests: `src/lib/embed-providers.test.ts`,
  `scripts/lib/csp.test.mjs`, `tests/embed-guard.spec.ts`.
- **Not verified against real snippets**: the script hosts for Givelify, Subsplash and
  SignUpGenius are each service's main domain. If a real snippet loads from elsewhere, the
  Studio says "not known" and the fix is a registry line.

## The script policy (PORTS.md card 153)

An `srcdoc` frame inherits the page's Content-Security-Policy, and the public pages send a
`script-src` (docs/agent/deployment.md, "Security headers"). The build hashes every inline script it
finds inside a Custom code frame and allows every `<script src>` origin in it, so pasted code that
was published before the build runs as before. A script the pasted code ADDS at runtime from a
different origin is blocked: list that origin in `scripts/csp-origins.json`.
Pasted code reaches the live site only through a rebuild, which recomputes the policy.

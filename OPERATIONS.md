# NCS Astro + Sanity Starter — Operations Playbook

Tactical reference for common tasks. `CLAUDE.md` is the architecture and design reference; this file is the "how do I actually do X" guide.

If you are a future Claude session and you can only read one doc, read `CLAUDE.md`. This file is the second one to open when you need to do something specific (deploy, patch, audit, regenerate).

---

## Deploy

The site is `output: 'static'` + `@astrojs/cloudflare` adapter. Two paths:

### Auto-deploy via GitHub → Cloudflare

This is the normal path. Cloudflare watches `main` on GitHub.

```bash
git add -A
git commit -m "..."
git push origin main
```

Cloudflare detects the push, runs `npm run build` in their CI, and deploys the resulting `dist/` to the Worker. Takes about 1 to 2 minutes. Watch in the Cloudflare dashboard under Workers → [your-worker-name] → Deployments.

**Verify a deploy landed:**

```bash
# Wait until a specific marker is in the live HTML, then continue
until curl -s "https://your-worker.workers.dev/?cb=$(date +%s)" | grep -q 'SOMETHING_FROM_THIS_BUILD'; do sleep 5; done
echo "deploy live"
```

Use `until ! grep -q '...'` (with the bang) when waiting for something to be **removed** from the HTML — `until grep -qv` doesn't do what it looks like.

### Manual deploy

```bash
npm run deploy
# = npm run build && wrangler deploy
```

Only needed if you're testing a config change locally before committing, or if the auto-deploy webhook is broken.

### Sanity → Cloudflare deploy hook

The site is fully prerendered, so a Sanity content edit doesn't change the live HTML until a rebuild. A Sanity webhook is configured and hits a Cloudflare deploy hook. The flow:

1. Editor publishes a document in Sanity Studio
2. Sanity POSTs to the Cloudflare deploy hook
3. Cloudflare rebuilds + deploys in about 1 to 2 minutes
4. New content is live

If a content change isn't appearing on the live site after a few minutes:
- Check the webhook fired (Sanity Studio → Manage → API → Webhooks)
- Check the Cloudflare deploy hook is configured (Workers → Settings → Triggers → Deploy hooks)
- Try a manual `git push` to force a rebuild

### Rebuild webhook filter (recommended)

The webhook lives at manage.sanity.io → API → Webhooks. The recommended GROQ filter is a deny-list:

```
!(_id in path("drafts.**")) && !(_type in ["media.tag", "sanity.imageAsset", "sanity.fileAsset", "sanity.assetSourceData"])
```

This filter skips rebuilds triggered by draft saves and internal Sanity asset-management events (tagging an uploaded photo, rotating an image, etc.), which don't affect live HTML. New content types are covered automatically because the filter excludes only the named system types and lets everything else through. The old hand-maintained allow-list approach (explicitly listing every `_type` that should trigger a rebuild) silently dropped new types until a developer remembered to add them. The deny-list is safer: add a new schema type and it triggers rebuilds out of the box.

If the webhook currently has no filter or uses an allow-list, replace the filter with the deny-list above and save. No other webhook config changes are needed.

### Phased launch: turning sections on and off

The site has a section visibility system that lets you launch now and finish sections later, without leaving half-built pages on the live site.

**How to turn a section off:**

1. Open the Studio and click "Site Settings" in the left sidebar.
2. Click the "Section visibility" tab at the top of the document.
3. Find the toggle for the section you want to hide.
4. Flip it off.
5. Click the blue Publish button.
6. The site rebuilds in about 1 to 3 minutes. Once live, the section disappears from the menu, footer, homepage, and its own page redirects visitors to the home page instead.

**Important notes:**
- An unset toggle is the same as ON. You only see a change when you explicitly flip something to off and publish.
- Turning a section off does not delete or unpublish any content. All drafts and published documents are untouched. Turn the toggle back on and everything reappears after the next rebuild.
- Core pages (Home, About, Services, FAQ, Contact, Journal, Privacy, 404) are not toggleable and are always live.
- Detail pages for a toggled-off section (like `/portfolio/[slug]`) also disappear. The build skips generating those pages entirely, so they 404 cleanly.

**Why this is useful:** lets you launch the site while a section is still being built, without pressure to finish everything at once.

### Scheduled publishing

Sanity supports scheduling a document to go live at a future date and time.

**How to schedule a publish:**

1. Open the document you want to schedule.
2. Click the small arrow (chevron) to the right of the blue Publish button in the bottom bar.
3. Choose "Schedule publish" from the menu.
4. Pick the date and time. Times are local to your browser.
5. Click "Schedule." The document moves to a "Scheduled" state.

The live site rebuilds automatically when the scheduled publish fires. You can see, edit, or cancel scheduled items by going back to that document before the time fires.

**Note:** as of May 2026, the `@sanity/scheduled-publishing` plugin is incompatible with this Studio's React 19 dependency. Use the built-in document actions scheduling path above until the plugin is updated.

### Field comments

Sanity Studio includes a built-in Comments feature (the speech-bubble icon that appears next to field labels when you hover). Available by default in Sanity v5, no plugin or config needed.

**How to use it:**

1. Hover over any field label in a document.
2. Click the speech-bubble icon.
3. Type a question or note and click Submit.

Comments stay attached to the specific field until resolved. Comments do not affect published content in any way.

### Studio deploy

Studio code (schemas, structure, plugins) deploys separately from the site:

```bash
npm run studio:deploy
# = npm --prefix studio run deploy
```

Run this after any change in `studio/schemaTypes/`, `studio/structure.ts`, or `studio/sanity.config.ts` — otherwise the hosted Studio doesn't see the new schema fields.

Always run `npm run typegen` after schema changes so `src/lib/sanity.types.ts` is fresh, then commit.

### Critical: run studio:deploy after every schema change

If you add or rename a field in a schema file and forget to run `npm run studio:deploy`, the hosted Studio will show "unknown fields" warnings next to the new data, and editors will see a prompt offering to "Remove field." **Do NOT click "Remove field" in Studio.** That action deletes the actual Sanity document data for every document that has that field populated. It cannot be undone without a dataset restore.

The correct sequence after any schema edit:

1. Edit the schema file in `studio/schemaTypes/`.
2. `npm run typegen` to regenerate `src/lib/sanity.types.ts`.
3. `npm run studio:deploy` to push the schema update to the hosted Studio.
4. Commit + push.

The site build can run any time after step 1. The Studio deploy (step 3) is what clears the "unknown fields" warning.

---

## Seed placeholder content

Seed scripts bootstrap document types with placeholder content for a fresh dataset. The reusable scripts in `scripts/` cover the core content types. Modules may include their own seed scripts documented in `docs/modules/`.

All seed scripts should be idempotent. Prefer `setIfMissing` (only fills empty fields) so existing editor customizations are not overwritten. Use `createOrReplace` only for canonical guide/reference content that should always match the seed file.

See the "Patch Sanity content programmatically" section below for the client setup pattern to copy.

**Important: seeded content is placeholder.** Before launch, replace all fabricated content (example press items, placeholder pricing, dummy affiliate URLs, sample guide PDFs) with real content.

---

## Routes inventory

Core routes that ship with the starter:

| Path | Notes |
|---|---|
| `/` | Home |
| `/about` | About |
| `/services` | Services listing |
| `/faq` | FAQ grouped by category |
| `/contact` | Contact form + Calendly + post-inquiry roadmap |
| `/journal` | Journal/blog index |
| `/journal/[slug]` | Post detail |
| `/privacy` | Privacy policy |
| `/404` | Custom 404 |
| `/sitemap-index.xml` | Auto-generated by @astrojs/sitemap |

Additional routes are added by opt-in modules under `modules/`. See `docs/modules/` for which routes each module adds.

---

## Before launch checklist

The items below apply to any project built on this starter. Replace the angle-bracketed placeholders with project-specific values.

**Wire identity:**
- [ ] `src/data/site.ts` — set real `name`, `domain`, `url`, `storageKeyPrefix`, `themeStorageKey`, `brandColors`
- [ ] `src/styles/globals.css` — replace placeholder palette tokens and font imports with the project's brand
- [ ] Replace logo files in `src/assets/` with the real logo variants; regenerate with `node scripts/generate-logo-variants.mjs`
- [ ] Regenerate `public/og-default.png` via `npm run og` after updating brand inputs in `scripts/generate-og-default.mjs`
- [ ] Replace `public/favicon.svg` with the project's favicon

**Wire Sanity:**
- [ ] Create Sanity project; set `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET` in `.env` and Cloudflare → Workers → Variables
- [ ] Set `SANITY_API_READ_TOKEN` (scoped read token from Sanity Manage → API → Tokens)
- [ ] Set `SANITY_API_WRITE_TOKEN` in `.env` locally for running seed/patch scripts
- [ ] Run `npm run studio:deploy` to publish the Studio
- [ ] Configure the Sanity → Cloudflare rebuild webhook with the deny-list filter (see above)

**Wire external services:**
- [ ] Web3Forms: create a form, set the access key in the contact form component
- [ ] Calendly: set `PUBLIC_CALENDLY_URL` env var to the real booking URL
- [ ] Cloudflare Web Analytics: create a site, add the token to `wrangler.jsonc`

**Seed + populate content:**
- [ ] Run applicable seed scripts for a fresh dataset
- [ ] Replace all placeholder/sample content with real content before launch
- [ ] Toggle off any modules that are not yet ready (via Site Settings → Section visibility in Studio)

**Pre-flight validation:**
- [ ] Lighthouse: Performance 95+, Accessibility 100, Best Practices 100, SEO 100 on the deployed Cloudflare URL
- [ ] Contact form test submission reaches the correct inbox
- [ ] All external links open in a new tab with correct `rel` attributes
- [ ] Sitemap submitted to Google Search Console

---

## Patch Sanity content programmatically

For one-off content updates (backfilling new fields, fixing typos across many docs), write a script in `scripts/`. Pattern:

```js
import { createClient } from '@sanity/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf-8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; }),
);

const client = createClient({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: env.PUBLIC_SANITY_API_VERSION ?? '2026-05-01',
  useCdn: false,
  token: env.SANITY_API_WRITE_TOKEN,
});

// ... your patch logic ...
```

Then `node scripts/your-script.mjs`.

**Idempotency.** Always make patch scripts re-runnable. Use `setIfMissing` (only fills empty fields) or check the current value before writing.

**Portable Text blocks** need `_key` (use `randomUUID()`), `_type: 'block'`, `style` (e.g. `'normal'`, `'h2'`), `markDefs: []`, and `children` with their own `_key`.

**Key gotcha when editing page copy:** most page singleton fields already have Sanity content, so changing a code fallback in an Astro page does NOT change the live site — the Sanity value wins. To change displayed copy on a populated field you must patch Sanity. Only genuinely-empty fields render their code fallback.

**Annotation cleanup:** Sanity Canvas (AI-assisted drafting) sometimes lets prefix annotations like `[NEW per audit, softer framing] …` or `[TODO: fill in …]` slip into published content. `scripts/strip-editor-annotations.mjs` scans every doc for these patterns:

```bash
node scripts/strip-editor-annotations.mjs           # dry-run (default)
node scripts/strip-editor-annotations.mjs --apply   # actually patch
```

Re-run after large Canvas batches.

---

## Run Lighthouse / performance audits

If a regression is suspected:

```bash
# Build locally to check bundle sizes
npm run build
# Astro logs every chunk + image emit in the build output.

# Quick diff between branches
git diff main HEAD -- src/components src/pages
```

For end-to-end Lighthouse runs against the deployed site, use Chrome DevTools' bundled Lighthouse or the chrome-devtools MCP. The MCP path:

```
mcp__plugin_chrome-devtools-mcp_chrome-devtools__navigate_page → URL
mcp__plugin_chrome-devtools-mcp_chrome-devtools__emulate → viewport "360x640x1.875,mobile,touch" + colorScheme light
mcp__plugin_chrome-devtools-mcp_chrome-devtools__lighthouse_audit → device "mobile"
```

Note: the MCP lighthouse_audit only returns Accessibility / BP / SEO / Agentic. For Performance metrics use `performance_start_trace` which gives LCP / CLS / breakdown.

**Always test on the workers.dev URL,** not the live production domain until DNS is cut over.

### Common diagnostic findings (most are unscored)

| Lighthouse flag | What it's actually saying | Fix |
|---|---|---|
| "Reduce unused JavaScript" | React + Astro runtime has unreachable error-handling branches | Unavoidable without Preact swap. Accept. |
| "Improve image delivery — Est savings X KiB" | Loaded files are slightly bigger than display needs | Tighten srcset breakpoints if X > 100 KiB. Otherwise theoretical. |
| "Avoid long main-thread tasks (78 ms found)" | Radix Sheet hydration on `MobileNav` | Fires after LCP/FCP. Real-user INP is fine. Accept. |
| "Render-blocking SanityImage.css (18 KiB)" | The whole Tailwind output is chunked under that name | Extracting critical CSS is high effort for marginal LCP benefit at current scores. Skip. |
| "Uses third-party cookies (sanitySession)" | Sanity CDN sets a session cookie | `crossorigin="anonymous"` BREAKS Sanity images. Skip. |
| "No CSP" | Astro 6's `security.csp` would satisfy this | DON'T enable — ClientRouter's runtime inline scripts get blocked. See CLAUDE.md → Stack → Astro config don'ts. |

---

## Regenerate logos

Source files live in `src/assets/`. To regenerate from a source image:

```bash
# 1. Build new variants from a source JPG
node scripts/generate-logo-variants.mjs
# OR with a specific source file:
node scripts/generate-logo-variants.mjs your-logo.jpg

# 2. Optimize before Astro picks them up
node scripts/optimize-logo-files.mjs
```

The PNGs land in `src/assets/` (NOT `public/`) so Astro's `<Image>` / `getImage()` pipeline can emit content-hashed WebPs. `Header.astro` and `Footer.astro` read these via `getImage()`.

**Don't move them back to `public/`** — Astro can't touch `public/` files and you'd lose the WebP conversion + content-hashing.

---

## Common Sanity tasks

### Add a new field to a page singleton

1. Edit `studio/schemaTypes/<page>.ts` — add `defineField(...)`.
2. `npm run typegen` (runs schema-extract + sanity typegen).
3. Add the field to the GROQ projection in `src/lib/queries.ts`.
4. Use the field in the corresponding Astro page with a sensible fallback.
5. Write a backfill script in `scripts/` to set the value on the existing production doc (use `setIfMissing` so future editor changes aren't clobbered).
6. `npm run studio:deploy` to push the new field to the hosted Studio.
7. Commit + push.

---

## Common gotchas (the ones that have bitten at least once)

| Symptom | Cause | Fix |
|---|---|---|
| Theme reverts to light after clicking a nav link | View Transitions reset html className on swap | The anti-FOUC script in BaseLayout listens for `astro:after-swap` and re-applies. Don't remove that listener. |
| Footer logo renders broken / empty | Footer is below first paint, head script ran before footer img existed in DOM | Same anti-FOUC script has a `DOMContentLoaded` listener for exactly this. Don't remove. |
| Sanity image broken with CORS error | `crossorigin="anonymous"` was added to a `<img>` pointing at `cdn.sanity.io` | Remove the `crossorigin` attribute. Sanity CDN doesn't send Access-Control-Allow-Origin headers. |
| Inline scripts blocked, theme/Lenis/polish all break | Someone enabled `security.csp` in `astro.config.mjs` | Remove the config block. See CLAUDE.md → Stack → Astro config don'ts. |
| Logo renders squished | width/height attributes on the `<img>` don't match the actual file dimensions | Make sure `<Image width={X} height={Y}>` uses dimensions matching the source's intrinsic aspect ratio. |
| `text-link` className override on white BG doesn't work | Tailwind v4 sorts utilities alphabetically; `text-link` beats `text-bg` later in the cascade | Add a component prop (like `CtaLink`'s `onDark`) instead of trying to override via className. |
| Eyebrow text fails Lighthouse contrast on light mode | `text-foreground/65` on light backgrounds = ~3.6:1 (fails AA) | Bump to `text-foreground/80` (~5.4:1, passes). Don't add new `/65` instances on muted/background surfaces. |
| TOC sidebar empty on a long-form post | No h2/h3/h4 in the body | Add headings in Sanity. `extractHeadings()` only sees those three levels. |
| Playwright `fullPage` screenshot is mostly blank | `[data-reveal]` elements start at `opacity: 0` until the IntersectionObserver fires | `page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-visible')))` before screenshot. |
| Build fails on fresh clone with Sanity query errors | `PUBLIC_SANITY_PROJECT_ID` is not set | Expected — `sanityFetch` returns fallbacks when unconfigured. Set the env var to connect a real project. |
| Image optimizer path mismatch after adapter upgrade | `@astrojs/cloudflare` upgraded past `13.5.5` | Revert to exactly `13.5.5`. See CLAUDE.md gotcha #8. |
| Featured section shows wrong item as the hero | Falling back to date-based default | Toggle `featured: true` on the item to pin. Sections sort `featured desc, publishedAt desc`. |

---

## Useful one-liners

```bash
# Find every <img> in the codebase
# (Sanity-sourced imgs are handled by SanityImage.astro; local ones use Astro <Image>)
grep -rn '<img' src/

# Find every client: directive (Astro hydration audit)
grep -rn 'client:' src/

# Check what's actually deployed on the workers URL
curl -s "https://your-worker.workers.dev/?cb=$(date +%s)" | grep -oE 'SOMETHING_TO_LOOK_FOR'
```

---

## When something feels wrong

1. **Check the deployed workers URL first**, not localhost — the bug might already be fixed and just hasn't been redeployed.
2. **Open Chrome DevTools and check Console + Network** — most of the "weird" bugs in this codebase have been either CSP violations, CORS issues, or theme/View Transitions interaction. All show up loudly in DevTools.
3. **Read CLAUDE.md → relevant section** before changing anything. The non-obvious fixes are documented; reverting them tends to re-break the same bugs.
4. **Run `npm run build` locally** — Astro's build output catches a lot (missing imports, schema mismatches, image-pipeline errors).
5. **Diff against the last known-good commit** — `git log --oneline -20` then `git diff <hash>..HEAD -- src/path`.

---

*See `CLAUDE.md` for the full architecture reference.*

# New Project Setup Runbook

Read `CLAUDE.md` first, then follow this guide in order. Each step lists the
exact commands and files to touch. Complete all steps before launch.

This runbook is the single entry point for adapting the starter to a new client
site. The Foundation-vs-Safe-to-edit taxonomy in `CLAUDE.md` tells you which
files are safe to change freely and which require a planned session. Read that
section before touching anything in the "Foundation" list.

---

## Step 1 -- Clone the template and install dependencies

```powershell
git clone https://github.com/your-org/ncs-astro-sanity-starter my-new-site
cd my-new-site
npm install
npm --prefix studio install
```

The build works with no Sanity project configured. `sanityFetch` returns empty
fallbacks and every page renders its empty-state content. You can run
`npm run build` immediately after install to confirm the baseline compiles.

---

## Step 2 -- Point Sanity

**a) Create or choose a Sanity project**

Go to [sanity.io/manage](https://sanity.io/manage) and create a new project
(or choose an existing one). Copy the project ID.

**b) Set the env vars**

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in:

```
PUBLIC_SANITY_PROJECT_ID=your-project-id
PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=<Viewer token from manage.sanity.io -> API -> Tokens>
SANITY_API_WRITE_TOKEN=<Editor token -- only needed for seed scripts>
SANITY_STUDIO_PROJECT_ID=your-project-id
SANITY_STUDIO_DATASET=production
SANITY_STUDIO_PREVIEW_URL=https://your-worker-name.your-account.workers.dev
```

`PUBLIC_SANITY_DATASET` defaults to `production`; leave it unless you have a
reason to use a different dataset.

**c) Deploy the Studio once**

```powershell
npm run studio:deploy
```

You will be prompted to log in to Sanity on first run. The Studio deploys to
`https://your-project-id.sanity.studio`. Share that URL with the content editor.

Invite the editor at [manage.sanity.io](https://manage.sanity.io) under the
project -> Members tab. The editor does NOT need a development environment;
they work entirely through the Studio URL.

**Reminder (from CLAUDE.md rule #1):** run `npm run studio:deploy` after every
schema change going forward. Never click "Remove field" in Studio -- it deletes
document data permanently.

---

## Step 3 -- Set identity and domain

**a) Fill `src/data/site.ts`**

Replace every placeholder value: `name`, `studio`, `domain`, `url`,
`storageKeyPrefix`, `themeStorageKey`, and the `brandColors` mirrors (keep
these in sync with the palette tokens you set in Step 4).

**b) Set `astro.config.mjs` `site`**

Locate the `site:` key in `astro.config.mjs` and set it to the production URL
(e.g. `https://example.com`). This drives the sitemap and canonical tags.

**c) Set `wrangler.jsonc` `name`**

Locate the `"name"` field at the top of `wrangler.jsonc` and set it to the
Worker name (e.g. `my-new-site`). This is the subdomain under
`your-account.workers.dev` and becomes your custom domain route if you add one
in the Cloudflare dashboard.

---

## Step 4 -- Nail the design (the seam)

The starter ships a neutral Slate/Ink/Paper palette. Re-skinning requires
changing only these files. See `docs/agent/theme-and-color.md` for the full
token map and `docs/agent/design-tokens.md` for typography and spacing tokens.

**a) Palette tokens in `src/styles/globals.css`**

Edit the `@theme` block: replace the `--color-primary`, `--color-ink`,
`--color-paper`, and all other palette hex values with the client's brand
colors.

Then update `--tint-rgb` in both `:root` and `.dark` to the bare RGB triplet
of the new primary color (e.g. `88, 101, 119`). This token drives all the
polish-layer overlays (`surface-warm`, `img-tint`, paper-grain).

Also update the shadcn semantic overrides in `:root` and `.dark` so
`bg-primary`, `text-foreground`, `bg-background`, etc. resolve to the new
palette. Keep the token structure; only change the values.

**b) Fonts**

The default typefaces are Libre Baskerville (display) and Inter (body).
To swap them:

1. Remove the existing `@fontsource` imports at the top of `globals.css`
   (there are three lines to remove):
   ```css
   @import "@fontsource/libre-baskerville/400.css";
   @import "@fontsource/libre-baskerville/700.css";
   @import "@fontsource-variable/inter";
   ```
2. Install your chosen font package, then add its import(s) in place:
   ```powershell
   npm install @fontsource/playfair-display
   ```
   Then in `globals.css`, add the import (regular `@fontsource` packages use
   a weight path; `@fontsource-variable` packages import the package root):
   ```css
   @import "@fontsource/playfair-display/400.css";
   @import "@fontsource/playfair-display/700.css";
   ```
3. Update `--font-display` and `--font-body` in the `@theme` block to match.

The script accent is opt-in and OFF by default. To enable it:
1. Install a `@fontsource` calligraphic package (e.g.
   `npm install @fontsource/great-vibes` then
   `@import "@fontsource/great-vibes/400.css"` in `globals.css`).
2. Update `--font-script` in the `@theme` block to name that face first.
   Components using the `font-script` utility will then render the accent.

**c) Mirror brand colors in `src/data/site.ts`**

Update the `brandColors` object to match what you set in `globals.css`. These
values are used by the OG generator and any scripts that need colors outside CSS.

**d) Logo, favicon, and OG image**

1. Drop `logo-light.*` and `logo-dark.*` into `src/assets/` (the Header and
   Footer import them via Astro's `getImage()`).
2. Replace `public/favicon.svg`.
3. Edit the inputs block in `scripts/generate-og-default.mjs` (brand colors,
   tagline, wordmark).
4. Regenerate the default OG image:
   ```powershell
   npm run og
   ```
5. Generate per-page OG variants (also generates logo variants used in email
   signatures and social profiles):
   ```powershell
   npm run og:pages
   ```

Commit `public/og-default.png` -- it is a real asset served to visitors.

---

## Step 5 -- Voice

Fill in `docs/brand/voice.md` with the client's specific tone, vocabulary
rules, and banned words. This file is what an AI agent reads when writing or
editing site copy for this project. The `CLAUDE.md` Communication style section
is the always-on baseline; `voice.md` layers the client's specifics on top.

---

## Step 6 -- Replace placeholder copy

Walk the core pages and swap all "Studio Starter" placeholder text for real
copy. Files to review:

- `src/pages/index.astro` -- hero headline, tagline, section subheads
- `src/pages/about.astro` -- bio, story copy
- `src/pages/services.astro` -- service names and descriptions (will also come
  from Sanity once content is seeded, but static fallbacks still need to read
  correctly)
- `src/pages/faq.astro` -- any hardcoded FAQ fallbacks
- `src/pages/contact.astro` -- contact section copy
- `src/pages/privacy.astro` -- legal copy if using the static fallback

No em-dashes in site copy. Use commas, colons, or restructure the sentence.

---

## Step 7 -- Enable modules

Review `docs/modules/README.md` for the full module index and presets. Enable
only what this client needs.

For each module you want to activate:

1. Open its enable doc (`docs/modules/<name>.md`).
2. Follow all numbered steps in order:
   - Step 1: copy schemas into `studio/schemaTypes/`.
   - Step 2: register schemas in `studio/schemaTypes/index.ts`.
   - Step 3: register in `studio/structure.ts`.
   - Step 4: copy app files with `Copy-Item`.
   - **Step 4b: add the module's query functions to `src/lib/queries.ts`.**
     This step is easy to miss -- the core starter does not include module
     queries, so they must be added manually from the module's enable doc.
   - Step 5+: add nav entries, sectionVisibility flags, and any module-specific
     config.
3. Run `npm run typegen` and `npm run studio:deploy` after adding schemas.

---

## Step 8 -- Seed content

**Core pages:**

Once `PUBLIC_SANITY_PROJECT_ID` and `SANITY_API_WRITE_TOKEN` are set in `.env`,
run the core seed script to populate the core Sanity pages with neutral
placeholder content:

```powershell
node scripts/seed-core.mjs
```

This creates the `siteSettings`, `homePage`, `aboutPage`, `servicesPage`,
`faqPage`, `contactPage`, and `privacyPage` singletons in your Sanity dataset
so the Studio has documents to edit immediately. Replace the placeholder text
with real copy in Studio or directly in the page files.

**Module seeds:**

Each enabled module that ships a `seed.mjs` has its seeding instructions in its
enable doc. Run any module seeds after running `seed-core.mjs`.

---

## Step 9 -- Verify

```powershell
npm run build
```

Then run the dev server:

```powershell
npm run dev
```

Check every core page in both light and dark mode at both mobile (~375px) and
desktop (~1280px):

- Home, About, Services, FAQ, Contact, Journal index, Journal post, Privacy, 404
- Every enabled module's routes

Run Lighthouse on the key pages (Home, Services, Contact). Targets:
100/100/100/100 on desktop. If a score drops, find the cause before launch.

See `CLAUDE.md` Visual verification workflow for the full checklist.

---

## Step 10 -- Deploy

**a) Build and deploy**

```powershell
npm run deploy
```

This runs `npm run build` (which runs `typegen` then `astro build`) followed by
`wrangler deploy`. On first deploy you may be prompted to log in to Cloudflare.

**b) Wire the publish webhook**

In Cloudflare:
- Go to Workers & Pages -> your Worker -> Settings -> Variables
- Add the same env vars from `.env` as Secret bindings (especially
  `SANITY_API_READ_TOKEN`; the `PUBLIC_*` vars can be plain)

In Sanity:
- Go to manage.sanity.io -> your project -> API -> GROQ-powered Webhooks
- Create a webhook that triggers a Cloudflare Workers deploy on document
  publish events. This ensures a Sanity edit goes live after the next rebuild.
  See `docs/agent/deployment.md` for the webhook payload and filter details.

**c) Pre-launch checklist**

Run through `docs/bootstrap/setup-checklist.md` before DNS cutover.

---

## What NOT to casually edit

Before making changes to any "Foundation" file, read the Foundation-vs-Safe-to-edit
taxonomy in `CLAUDE.md`. Key files to route through a planned session:

- `src/styles/globals.css` beyond the design-seam tokens (polish-layer utilities,
  shadcn overrides, base resets)
- `src/layouts/BaseLayout.astro` (anti-FOUC script, scroll wiring, Lenis init)
- `src/lib/sanity.ts` (the `isSanityUnconfigured` guard is load-bearing)
- `studio/schemaTypes/*.ts` (field changes can break existing Sanity content)
- `src/lib/queries.ts` and `src/lib/sanity.types.ts`
- `astro.config.mjs`, `wrangler.jsonc`, `package.json`
- `public/_headers` (security headers)

The `src/components/ui/` shadcn primitives are also Foundation: if you
reinstall via `npx shadcn add`, reapply the customizations documented in
`CLAUDE.md` (notably the `accordion.tsx` changes).

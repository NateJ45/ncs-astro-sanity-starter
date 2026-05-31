# Pre-Launch Checklist

Work through this checklist before DNS cutover. Every item should be checked
off or explicitly deferred with a reason.

---

## Environment and secrets

- [ ] `.env` contains real values for `PUBLIC_SANITY_PROJECT_ID` and
      `PUBLIC_SANITY_DATASET`
- [ ] `SANITY_API_READ_TOKEN` set in `.env` locally and as a Secret in
      Cloudflare (Workers -> Settings -> Variables)
- [ ] `SANITY_API_WRITE_TOKEN` set in `.env` locally (not needed in Cloudflare;
      never expose as a public var)
- [ ] `PUBLIC_WEB3FORMS_KEY` set (contact form works; test it)
- [ ] `PUBLIC_CALENDLY_URL` set if the discovery call embed is used
- [ ] `PUBLIC_CF_ANALYTICS_TOKEN` set if Cloudflare Web Analytics is wanted
- [ ] `PUBLIC_NEWSLETTER_FORM_ACTION` set (or `formActionUrl` set in Studio
      siteSettings -> Newsletter) if the newsletter module is enabled
- [ ] `SANITY_STUDIO_PREVIEW_URL` set to the production Workers URL
- [ ] No placeholder values remain in `src/data/site.ts` (`name`, `domain`,
      `url`, `storageKeyPrefix`, `themeStorageKey`, `brandColors`)
- [ ] No placeholder values remain in `astro.config.mjs` (`site:` key)
- [ ] `wrangler.jsonc` `"name"` field set to the Worker name for this project

---

## Sanity project

- [ ] Sanity project created at manage.sanity.io
- [ ] Content editor invited at manage.sanity.io -> project -> Members
- [ ] Studio deployed (`npm run studio:deploy`) with the final schema
- [ ] Studio URL shared with the editor and confirmed accessible
- [ ] Core content seeded (`node scripts/seed-core.mjs`) and real copy in
      place (no "Studio Starter" placeholders visible in Studio or on pages)
- [ ] All enabled modules seeded (run each module's `seed.mjs` if present)
- [ ] `typegen` run after the final schema state (`npm run typegen`)
- [ ] `studio:deploy` run after the final schema state

---

## Modules

- [ ] `docs/modules/README.md` reviewed; only needed modules enabled
- [ ] Each enabled module's full enable guide followed (Steps 1-end)
- [ ] Step 4b completed for each enabled module (query functions in
      `src/lib/queries.ts`)
- [ ] `sectionVisibility` flags confirmed in Studio siteSettings for each
      enabled module
- [ ] All enabled module routes load without errors

---

## Design and content

- [ ] Logo files (`logo-light.*`, `logo-dark.*`) in `src/assets/`, not
      placeholder assets
- [ ] `public/favicon.svg` replaced with real favicon
- [ ] `public/og-default.png` regenerated (`npm run og`) with real brand colors
      and tagline
- [ ] Per-page OG variants generated if needed (`npm run og:pages`)
- [ ] No "Studio Starter" text visible anywhere in the built site
- [ ] No em-dashes in any site copy (commas, colons, or restructured sentences
      used instead)
- [ ] `docs/brand/voice.md` filled in with the client's tone and vocabulary

---

## Domain, Worker, and routing

- [ ] `astro.config.mjs` `site:` set to the production URL (including `https://`)
- [ ] `wrangler.jsonc` `"name"` matches the intended Worker name
- [ ] Custom domain added in Cloudflare Workers -> Triggers (if not using the
      default `.workers.dev` subdomain)
- [ ] DNS cutover plan documented (TTL lowered, rollback path identified)

---

## Crawlers and discoverability

- [ ] `public/robots.txt` references the correct sitemap URL (the production
      domain, not `example.com`)
- [ ] `public/llms.txt` updated if major pages changed or new modules added
      (AI/LLM crawler index)
- [ ] Sitemap generates correctly after build (visit `/sitemap-index.xml` on
      the deployed site or preview)
- [ ] No pages that should be private are accidentally included in the sitemap

---

## Analytics

- [ ] Cloudflare Web Analytics token set (`PUBLIC_CF_ANALYTICS_TOKEN`) if
      cookieless analytics are wanted; omit token to skip the beacon entirely
- [ ] Confirmed no additional cookie consent banner is needed (Cloudflare Web
      Analytics is cookieless)

---

## Quality

- [ ] `npm run build` completes with zero errors
- [ ] Dev server confirms all core pages render correctly in both light and dark
      mode at mobile (~375px) and desktop (~1280px)
- [ ] Every enabled module's routes verified in both themes and both viewports
- [ ] Lighthouse 100/100/100/100 on desktop for the key pages (Home, Services,
      Contact at minimum)
- [ ] Contact form tested end-to-end (submission reaches the inbox)
- [ ] Calendly embed tested (loads and is interactive) if `PUBLIC_CALENDLY_URL`
      is set

---

## Rebuild and publish pipeline

- [ ] Sanity publish webhook created (manage.sanity.io -> project -> API ->
      GROQ-powered Webhooks) pointing at the Cloudflare deploy hook
- [ ] Webhook tested: publish a document in Studio, confirm a deploy fires and
      the change appears on the live site after the build completes
- [ ] Team briefed on the rebuild model: edits go live after a rebuild, not
      instantly on save

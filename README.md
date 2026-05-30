# Reid Design LLC — Site

Astro + Sanity + Cloudflare Workers marketing site for Reid Design LLC, a Plainfield, Indiana interior design studio run by Staci Perkins.

Full architecture reference: `CLAUDE.md`. Operational playbook: `OPERATIONS.md`. Migration planning docs: `migration-docs/`.

---

## Stack

- **Astro 6** (static output) + TypeScript strict mode
- **Sanity v5** headless CMS (schemas in `studio/schemaTypes/`, Studio at `studio.reiddesignllc.com`)
- **Tailwind 4** via `@tailwindcss/vite` (brand tokens in `src/styles/globals.css`, no `tailwind.config`)
- **React 19** islands for interactive components (nav drawer, contact form, quiz, calculator, galleries)
- **Cloudflare Workers** for hosting via `wrangler deploy`; GitHub pushes to `main` auto-deploy via Cloudflare's CI

---

## Pages

| Route | Description |
|---|---|
| `/` | Home |
| `/about` | About Staci |
| `/process` | How it works |
| `/services` | Service tiers and pricing |
| `/faq` | FAQ grouped by category |
| `/contact` | Contact form + Calendly embed |
| `/portfolio` | Project grid with Room x Style filter chips |
| `/portfolio/[slug]` | Project detail (before/after slider, gallery, TOC, featured-in-journal) |
| `/portfolio/before-after` | All projects with before/after pairs |
| `/journal` | Blog/journal index |
| `/journal/[slug]` | Journal post detail |
| `/e-design` | Productized E-Design offering |
| `/shop` | Affiliate "Shop My Favorites" (FTC disclosure) |
| `/gift-certificates` | Gift certificate info |
| `/quiz` | Multi-step style archetype quiz |
| `/calculator` | Budget estimate calculator |
| `/resources` | Resources hub (links to tools, guides, FAQ, journal) |
| `/guides` | Lead-magnet index |
| `/guides/[slug]` | Lead-magnet landing + gated download |
| `/press` | Press coverage + logo strip |
| `/privacy` | Privacy policy |
| `/404` | Custom 404 |

---

## Features

- All content editable in Sanity Studio by Staci, including an editable in-Studio "Start Here" guide and business notes (`studioGuide` + `studioNotes` singletons; Brand Kit stays code-driven)
- Grouped dropdown nav: Services (Services, E-Design, Process, Gift Certificates) and Resources (Style Quiz, Cost Calculator, Guides, FAQ, Journal)
- Email capture: newsletter signup, lead-magnet gated downloads, style quiz email gate, budget calculator optional email
- Contact form via Web3Forms with autoresponder, post-inquiry roadmap, Calendly embed
- Affiliate shop with FTC disclosure
- Press strip ("As Seen In") on home, about, and press pages
- Before/after slider on project pages and `/portfolio/before-after`
- Full-viewport home hero with a soft pulsing scroll cue
- Phone number and availability status surfaced site-wide from Sanity (tap-to-call in the header, footer, mobile menu, and contact page)
- Project pages auto-surface journal posts that reference them ("Featured in the journal")
- About page "off the clock" personal section (currently reading/listening, rapid-fire Q&A, favorite local spots, beyond design), each module self-hiding when empty
- Style quiz with archetype results and service recommendations
- Budget calculator with room/scope/add-on estimate ranges
- Pinyon Script section-heading accents, editor-controlled via Sanity
- Three-state dark/light/system theme toggle (no FOUC)
- Cloudflare Web Analytics (cookieless, no consent banner needed)
- `robots.txt` (allow-all + sitemap) and `llms.txt` (AI crawler index) in `public/`
- `@astrojs/sitemap` auto-generates sitemap for all routes

---

## Local dev

```bash
npm install
npm run dev          # Astro dev server at localhost:4321
npm run studio:dev   # Sanity Studio at localhost:3333
```

Copy `.env.example` to `.env` and fill in Sanity + Web3Forms + Cloudflare values.

---

## Deploy

Auto-deploy: push to `main`. Cloudflare builds and deploys in ~1-2 minutes.

Manual deploy:

```bash
npm run build
npm run deploy   # = wrangler deploy
```

After any Sanity schema change, also run:

```bash
npm run typegen        # regenerate src/lib/sanity.types.ts
npm run studio:deploy  # push updated schema to hosted Studio
```

See `OPERATIONS.md` for the full playbook including the before-DNS-cutover checklist.

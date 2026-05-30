# Deployment

> Cloudflare Workers build model, the Sanity -> live-site rebuild model, environment variables, security headers, and privacy/analytics.

## Deployment

- Production: pushes to `main` trigger a Cloudflare Workers build that serves `reiddesignllc.com`.
- Previews: any other branch gets its own preview URL via Cloudflare Workers.
- Build command: `npm run build`. Output directory: `dist`.
- `output: 'static'` in `astro.config.mjs` prerenders every page to HTML at build time. The `@astrojs/cloudflare` adapter stays installed so individual pages can opt into server rendering later via `export const prerender = false` in that page's frontmatter, but for a content-rich marketing site it's effectively inert.

### Cloudflare Workers vs Pages note

As of early 2026, Cloudflare merged Pages into Workers. Pages is in maintenance mode; Workers gets all new investment. New Astro projects should use Workers via the `@astrojs/cloudflare` adapter and `wrangler deploy`. The NCS portfolio template still references Pages because it predates the merger; Reid Design uses Workers from day one.

### Sanity → live site rebuild model (READ THIS BEFORE CHANGING CONTENT EXPECTATIONS)

The site is `output: 'static'` — every page is **pre-rendered to HTML at build time, not fetched at runtime**. Practical implication: when Staci edits a field in Sanity and clicks Publish, **the change does NOT appear on the live site until the site rebuilds**. The Sanity dataset updates instantly, but the live HTML is whatever was generated at the last build.

There are two ways the site rebuilds:
1. **`git push origin main`** → Cloudflare detects the push → triggers `npm run build` → site updates in ~1-3 min.
2. **Cloudflare deploy hook** → an HTTP POST to a private Cloudflare URL triggers the same build.

Without a webhook, every Sanity edit waits until the next code push. That's not a sustainable editor experience for Staci.

**Status:** the webhook IS set up and live as of May 27, 2026. Cloudflare coalesces back-to-back triggers into a single build when they arrive during an in-progress build, so bulk asset uploads don't actually produce dozens of builds — typically 2-3.

**Recommended GROQ filter (deny-list):** apply this at manage.sanity.io → API → Webhooks → "Rebuild live site". It skips draft saves and internal Sanity asset-management events, and covers new content types automatically:

```
!(_id in path("drafts.**")) && !(_type in ["media.tag", "sanity.imageAsset", "sanity.fileAsset", "sanity.assetSourceData"])
```

The old allow-list approach (listing every `_type` that should trigger a rebuild) silently dropped new types until a developer remembered to add them. The deny-list is safer. See OPERATIONS.md for the full note.

**The setup pattern (for reference / if it ever needs to be re-created):**

1. **Create the Cloudflare deploy hook** at Cloudflare dashboard → Workers & Pages → reid-design-site → Settings → Build hooks. Name it `Sanity content publish`, branch `main`. Copy the generated URL (looks like `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/<token>`).

2. **Create the Sanity webhook** at manage.sanity.io → project → API → Webhooks. Name it `Rebuild live site`, dataset `production`, trigger on Create + Update + Delete, HTTP method POST, paste the Cloudflare URL. Apply the deny-list GROQ filter above.

3. **Test:** edit `siteSettings.tagline` → publish → watch Cloudflare's Deployments tab → new build kicks off within ~10 seconds → live in ~1-3 min total.

**Trade-offs to know:**
- Every publish triggers a full ~45 second build. Reasonable for a marketing site. If Staci batch-edits 20 testimonials, save the publish click until the end to consolidate one build instead of 20.
- There's always a 1-3 minute delay between publish and live render. Acceptable for an interior design portfolio; would NOT be for breaking news.
- Cloudflare's free tier covers 500 builds/month — well clear of expected publish cadence.
- If we ever want near-instant updates, the alternative is moving to Incremental Static Regeneration or runtime-fetching from Sanity for specific pages. Both are larger architecture changes; the webhook is the right answer for now.

### Environment variables

Set in Cloudflare → **Workers & Pages → Reid Design → Settings → Variables** (Build section):

- `PUBLIC_SANITY_PROJECT_ID` — Sanity project ID from manage.sanity.io.
- `PUBLIC_SANITY_DATASET` — `production`.
- `PUBLIC_SANITY_API_VERSION` — pinned ISO date like `2026-05-01`. Bump deliberately.
- `SANITY_API_READ_TOKEN` — only if any page needs to read draft content (typically not, since published content is publicly readable). Mark as Secret.
- `PUBLIC_WEB3FORMS_KEY` — contact form access key from [web3forms.com](https://web3forms.com/). Without it the contact form falls back to a no-op action and shows an inline notice.
- `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics token. Without it the analytics beacon doesn't render.
- `PUBLIC_CALENDLY_URL` — Staci's public Calendly URL.
- `PUBLIC_NEWSLETTER_FORM_ACTION` — optional. Build-time override for the ESP form-action endpoint, for environments where the URL can't live in Sanity (e.g. staging). `siteSettings.newsletter.formActionUrl` takes precedence; the newsletter only renders at all when `siteSettings.newsletter.enabled` is true.
- `NEWSLETTER_API_KEY` — optional, server-side only (never a `PUBLIC_` var). Only needed if you add a Cloudflare Worker route that proxies subscribe calls server-side. The current `subscribeEmail()` helper posts directly to the ESP form-action / Web3Forms and does not need it.

All documented in `.env.example`; copy to `.env` and fill in real values for local dev.

### Security headers

`public/_headers` ships with the deploy. Five site-wide headers Cloudflare applies to every route:

- `Strict-Transport-Security` (HSTS, one year, includeSubDomains)
- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`

Content-Security-Policy is intentionally not included; doing it right requires testing because of the Sanity CDN, the Web3Forms POST endpoint, the Calendly embed, and the Cloudflare Analytics beacon.

### Privacy and analytics

The site is effectively zero-cookie. No consent banner is mounted — `ConsentNotice.tsx` was removed as unnecessary: the newsletter posts via `fetch` (no vendor script), analytics is cookieless Cloudflare, and a US-based local business with no ad tracking does not need a cookie-consent banner. The current, accurate posture:

- **Cloudflare Web Analytics** uses no cookies and stores no personal data.
- **No Google Analytics, no Facebook/Meta Pixel, no LinkedIn Insight Tag.** No ad-tracking or retargeting pixels. If you ever add one, design a full consent management platform in BEFORE adding the tracker — don't bolt it on.
- **Sanity client** reads public published content, no auth cookies.
- **Web3Forms** contact-form submissions go server-side via `fetch`; no cookies set. The contact form also triggers a Web3Forms autoresponder (visitor confirmation email) when that's enabled on the access key.
- **Email capture:** `subscribeEmail()` posts to the ESP form-action URL in `siteSettings.newsletter.formActionUrl` (ConvertKit / MailerLite / Kit), falling back to Web3Forms when unset. The ESP may set its own cookies on subscribe.

**`/privacy` page:** a real privacy policy ships, driven by the `privacyPage` singleton with a plain-voice static fallback (covers what's collected, what doesn't happen, unsubscribe, data requests). Linked from the footer on every page and from every capture form's consent note. This is the privacy surface for the site — no consent banner needed alongside it.

# Reid Design LLC — Migration Plan

**From:** Squarespace 7.1 at reiddesignllc.com
**To:** Astro 6 + Sanity v5 + Cloudflare Workers
**Goals:** Zero visible downtime. No lost SEO. Email keeps working. Form submissions keep working. Staci edits content in Sanity by the end.

---

## Pre-flight: things to settle before any work starts

These are decisions or asset checks that block stages downstream. Get them out of the way first.

| Decision | Default to use unless overridden | Why |
|---|---|---|
| Where is reiddesignllc.com currently registered? | Confirm with Staci (likely Squarespace) | If on Squarespace, we transfer it out to Cloudflare Registrar (or any other registrar) before cutover. Free transfer. |
| Email host for owner@example.com | **Cloudflare Email Routing** (free, forwards to Staci's Gmail) | Squarespace email costs money. Cloudflare Email Routing is free and just forwards. Staci sends from Gmail with the owner@example.com identity. |
| Form submission handler | **Web3Forms** (free tier, 250 submissions/month) | Matches the pattern already in use on Nathan's NCS portfolio. Zero infrastructure to maintain, no Worker code, works cleanly with static Astro deploys. Submissions email straight to Staci. |
| Scheduling tool for the discovery call | **Cal.com** (free, open-source) or **Calendly** (free tier) | Per Nathan's earlier call. Cal.com is the free-tier-friendly modern option. Staci picks the one she'll actually keep updated. |
| Sanity plan tier | **Free tier** (3 users, unlimited content, suitable for a freelance business) | Upgrade later only if Staci wants more editors or hits API limits. |
| Cloudflare plan | **Free tier** | Workers Free covers static asset hosting + 100k requests/day. More than Reid Design needs. |
| Staging URL during build | `staging.reiddesignllc.com` (subdomain) | Lets Staci preview the real site in context. DNS for the subdomain points at Cloudflare while the apex stays on Squarespace. |

**Asset checks:**
- Squarespace login confirmed and working (Staci or Nathan)
- Cloudflare account exists or gets created
- Sanity account exists or gets created
- DNS access to reiddesignllc.com confirmed
- Google Search Console access for reiddesignllc.com confirmed
- Google Business Profile access confirmed (for service area updates post-launch)

---

## Stage 1: Foundation build (no live risk)

**Goal:** Build the new site end-to-end on local development. Nothing touches production.
**Duration estimate:** 2 to 3 weeks of focused work
**Risk to live site:** None

**Order of operations:**
1. Create Sanity project. Implement all 14 content type schemas from `02-sanity-schemas.md`.
2. Create Astro 6 project. Set up Sanity client integration. Generate TypeScript types via Sanity TypeGen.
3. Build the design system in code: CSS custom properties matching the brand palette, typography setup, component library (buttons, cards, sections).
4. Build page templates for all 6 pages, pulling from Sanity.
5. Build the form component (client-side) and the Worker that receives submissions.
6. Add the Calendly/Cal.com embed.
7. Local QA against the strategy and audit docs.

**Staci checkpoint:** Around the midpoint, show her the design system coming together (probably a screenshot or a quick screen share). Confirm the look feels right before too much investment.

**Deliverable into Stage 2:** A working Astro site that builds locally, pulls from Sanity, and renders all 6 pages.

---

## Stage 2: Content loading (no live risk)

**Goal:** Move content from the Squarespace site into Sanity, plus author the new content the audit identified.
**Duration estimate:** 1 to 2 weeks (depends on Staci's content availability)
**Risk to live site:** None

**Order of operations:**
1. Extract existing content from Squarespace per `04-content-extraction.md` (next deliverable). This is Phase 3 work, executed during this stage.
2. Load extracted content into Sanity via the Studio or import scripts.
3. Author new content the audit called out:
   - Plainfield-first homepage eyebrow
   - Tightened service-card micro-copy
   - Reframed Builder & Realtor section (aspirational, not claim)
   - About credentials line (Staci writes raw, Claude tightens)
   - New FAQ items (good fit, experience, what to prepare)
   - Contact form pre-submit note
4. Get photo assets in place:
   - Staci's headshot (confirm current quality or shoot new)
   - 1 to 2 case study projects with photos, story, and ideally before/after
   - Hero background image
5. Staci spends 30 minutes in the Sanity Studio editing one document end-to-end. Catch any editor experience issues before launch.

**Staci checkpoint:** End of Stage 2, show her the new site (still on staging URL) populated with her real content. This is the moment for "this doesn't feel right" feedback before we cut over.

**Deliverable into Stage 3:** Sanity populated with launch content. Astro site building cleanly with that content.

---

## Stage 3: Staging deployment (no live risk)

**Goal:** Get the new site running at a real URL (`staging.reiddesignllc.com`) where Staci, Nathan, and any friends-and-family reviewers can hammer on it.
**Duration estimate:** 1 week of staging plus iteration
**Risk to live site:** None (live site untouched)

**Order of operations:**
1. Connect Astro project to GitHub. Set up Cloudflare Workers deployment via `wrangler`.
2. Add `staging.reiddesignllc.com` as a custom domain on the Cloudflare Worker. Point a DNS record at it from wherever DNS currently lives (Squarespace DNS panel if domain is still registered there).
3. Test on staging:
   - Every page renders correctly on desktop and mobile
   - All links work (no 404s)
   - Form submission actually delivers an email to Staci
   - Calendly/Cal.com link opens the right calendar
   - SSL works (Cloudflare auto-provisions)
   - Lighthouse scores look reasonable
   - Sanity edits propagate (no cache issues)
4. Run through the new site as a first-time visitor would. Specifically: can a homeowner in Carmel find the consultation price within 30 seconds of landing?
5. Submit the staging URL for a casual review to one or two trusted people (Nathan, Staci, maybe a friend who fits the ideal client profile).

**Staci checkpoint:** Final approval to cut over. She needs to actively say "yes, ship it" before we touch DNS.

**Deliverable into Stage 4:** Approved staging site, ready to become the production site.

---

## Stage 4: DNS cutover (the one risky day)

**Goal:** Switch reiddesignllc.com from Squarespace to Cloudflare with zero downtime visible to visitors.
**Duration estimate:** Same-day execution, plan for a 2 to 4 hour window
**Risk to live site:** This is the day. Plan carefully.

**Pre-cutover checklist (run through 24 hours before):**
- [ ] Sanity content is locked (no edits during cutover)
- [ ] Cloudflare Worker has the production build deployed
- [ ] Cloudflare Email Routing is configured but not yet active (forwarding rules ready)
- [ ] Form submission Worker is tested with a real submission
- [ ] DNS TTLs on Squarespace are lowered to 5 minutes (do this 24 hours in advance so propagation is fast on cutover day)
- [ ] Backup: full Squarespace site export downloaded (Settings → Advanced → Import / Export → Export). Saved to workspace folder.
- [ ] Backup: screenshots of every page in case we need to reference the old layout
- [ ] Squarespace contact form historical submissions exported

**Cutover order (the actual day):**

| Step | Action | Watch for |
|---|---|---|
| 1 | Lower DNS TTL one more time if needed | TTL should be 60-300 seconds |
| 2 | Change A and CNAME records at the DNS host to point at Cloudflare Worker | Records propagate in minutes, not hours, because TTL is low |
| 3 | Activate Cloudflare Email Routing on the apex domain. Configure forwarding: owner@example.com → Staci's personal Gmail | Test by sending an email to owner@example.com from a different account |
| 4 | Verify SSL is active on the new site (Cloudflare auto-provisions, usually within minutes) | Browser shows the padlock |
| 5 | Test every page in production | All 6 pages load |
| 6 | Submit the new site's sitemap to Google Search Console | New sitemap recognized |
| 7 | Update Google Business Profile if any service area or contact details changed | Plainfield-first listing |
| 8 | Test contact form end-to-end with a real submission | Email arrives in Staci's Gmail |
| 9 | Test Calendly/Cal.com link | Booking page loads |

**Rollback plan:**
If something breaks badly within the first hour, repoint DNS back at Squarespace. Because TTL is low, this rolls back in minutes. Squarespace site is still there (don't cancel anything yet).

**Staci checkpoint:** During cutover, Staci is reachable by text in case decisions need to happen fast.

---

## Stage 5: Post-cutover monitoring and Squarespace cancellation

**Goal:** Validate the new site is working in the wild, then cleanly end the Squarespace subscription.
**Duration estimate:** 2 weeks of monitoring, then cancellation
**Risk:** Low, but watch for SEO surprises

**Week 1 (immediately after cutover):**
- Watch Google Search Console for any crawl errors or indexing changes
- Monitor form submissions (are they arriving?)
- Watch the Sanity Studio for any editor issues Staci runs into
- Set up 301 redirects from any Squarespace-specific URL patterns that don't match the new site (probably none, since the new site can match the old URL structure exactly)
- Check that the owner@example.com email is forwarding cleanly

**Week 2:**
- Review traffic in Cloudflare analytics or Google Analytics (whichever Staci is using). Compare against the prior month to make sure traffic is steady.
- Final smoke test of all forms and the scheduling link
- Confirm with Staci that she's been able to make at least one edit in Sanity without help

**End of Week 2: cancel Squarespace.**
- Export anything remaining from Squarespace one last time (just in case)
- Cancel the Squarespace plan ($276/yr stops)
- Save the cancellation confirmation
- Note: Squarespace will likely retain the data for 30 days post-cancellation, so cancellation isn't immediately destructive

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DNS propagation takes longer than expected | Low | Medium | Lower TTL 24 hours in advance |
| New site has a bug not caught in staging | Medium | Medium | Staging period is exactly for this. Have a 30-min DNS rollback plan ready. |
| Form submissions fail silently | Medium | High | Test with a real submission in production immediately after cutover. Cloudflare Worker logs catch failures. |
| Email forwarding misses an inbound message | Low | High | Test from multiple senders. Keep Squarespace forwarding active for 30 days as backup if possible. |
| Google deindexes during transition | Low | High | URL structure stays the same. Submit new sitemap immediately. Monitor Search Console weekly. |
| Staci finds editing in Sanity too hard | Medium | Medium | Stage 2 checkpoint where she edits a real document catches this before launch. Schema design prioritizes editor comfort. |
| Squarespace cancellation deletes data we still need | Low | High | Full export downloaded before cutover. Don't cancel until Week 2 monitoring is clean. |
| Cloudflare Worker free tier exceeded | Very low | Low | Reid Design's traffic is small. If exceeded later, upgrade is $5/month. |

---

## Timeline summary

| Stage | Duration | Cumulative |
|---|---|---|
| Pre-flight decisions | Few days | Week 0 |
| Stage 1: Foundation build | 2 to 3 weeks | Weeks 1 to 3 |
| Stage 2: Content loading | 1 to 2 weeks (overlaps with end of Stage 1) | Weeks 3 to 4 |
| Stage 3: Staging deployment | 1 week | Week 5 |
| Stage 4: DNS cutover | 1 day | Week 6 |
| Stage 5: Monitor + Squarespace cancel | 2 weeks | Weeks 6 to 8 |

**Total: roughly 6 to 8 weeks from kickoff to Squarespace cancellation, depending on Staci's content and review availability.**

---

## What Staci pays for during the migration

| Service | Cost | When |
|---|---|---|
| Squarespace Core Plan | $276/yr (already paying) | Until end of Week 2 post-cutover, then cancel |
| Cloudflare Workers | Free | Throughout |
| Cloudflare Email Routing | Free | Starting at cutover |
| Sanity Free tier | Free | Starting at Stage 1 |
| Cal.com or Calendly | Free | Starting at Stage 2 |
| Web3Forms | Free tier (250/mo) | Starting at Stage 3 |
| Domain registration | ~$20/yr at Cloudflare Registrar (cheaper than Squarespace) | Optional transfer post-cutover |

**Steady-state cost after cancellation: $0/month plus ~$20/year for the domain.** Down from $276/yr on Squarespace.

---

## Open items requiring decisions or input

All five items are confirmed as of May 26, 2026:

1. **Domain registrar:** Squarespace. The domain needs to be transferred (or DNS pointed externally) as part of Stage 4. Transferring to Cloudflare Registrar at-cost is the cleanest long-term move, but DNS can also be pointed at Cloudflare while the domain stays registered at Squarespace as a no-transfer fallback.
2. **Scheduling tool:** Calendly. Staci sets up the account and shares the public booking link, which becomes `contactPage.schedulingLink` in Sanity.
3. **Cutover window:** Saturday morning is approved. Trade-off accepted: lower midweek-visitor risk, both Nathan and Staci available to monitor, two-day buffer before normal-week traffic resumes if anything needs attention.
4. **Analytics:** Cloudflare Analytics (free, privacy-friendly, no cookie banner needed). No Google Analytics. Staci loses some of the depth Google would provide but gains a simpler setup with no third-party tracker on the site.
5. **DNS access:** Nathan and Staci both have keys to the Squarespace domain panel.

---

*Last updated: May 26, 2026*

# Start Here Guide Refresh (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh Staci's in-Studio "How the website works" guide so it covers every current feature and walks her through the remaining one-time setups, and bring the agent markdown docs current with today's changes.

**Architecture:** Content-only edits. New how-tos and tips are added to the `studioGuide` content object in `scripts/seed-studio-guide.mjs`, then the script is re-run (`createOrReplace`) to push the refreshed panel live. No schema change, no `studio:deploy`, no Studio component change. Separately, a verification-and-gap-fill pass over the agent markdown.

**Tech Stack:** Sanity write client (`@sanity/client`) via the existing seed script; plain-text content fields; markdown docs.

**Reference spec:** `docs/superpowers/specs/2026-05-30-start-here-guide-refresh-design.md`

**Voice rules for ALL editor-facing copy** (the how-tos and tips): warm, plain-spoken, like a smart friend who happens to be a designer. Say things plainly. NO em-dashes anywhere in this copy (the studio voice rule). No "Photo of" filler. Match the tone of the existing how-tos in `seed-studio-guide.mjs`. Keep steps short and imperative.

**Testing note:** No unit-test harness applies. Verification is: the seed script runs clean, the `studioGuide` singleton read back shows the new content, and a human read for voice + accuracy. The setup steps (Task 3) are confirmed against current signup flows via web research at build time.

---

## File map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `scripts/seed-studio-guide.mjs` | Add feature how-tos (Task 2) and setup how-tos + tips (Task 3) to the `studioGuideDoc` content |
| Modify | `docs/agent/changelog.md` | Gap-fill: em-dash-rule entry (Task 1) |
| Modify | `CLAUDE.md` | Gap-fill: add HeroBackground / confirm StatsRow/StatsCounter in the component list (Task 1) |
| Modify | other `docs/agent/*.md` | Only if a gap is found (Task 1) |

---

### Task 1: Agent MD verification and gap-fill

**Files:**
- Modify: `docs/agent/changelog.md`
- Modify: `CLAUDE.md`
- Modify: other `docs/agent/*.md` only if a real gap is found

- [ ] **Step 1: Verify today's features are documented**

Confirm these are already covered (they were updated inline today; do NOT rewrite if accurate): FinalCTA background image (`sanity.md`, `components.md`, `changelog.md`), hero slideshow (`polish-layer.md`, `components.md`, `sanity.md`, `changelog.md`). Read the relevant sections; note any that are missing or wrong.

- [ ] **Step 2: Fix the known gaps**

a. `docs/agent/changelog.md`: if the CLAUDE.md em-dash-rule scoping (to public-facing copy only) is not mentioned in the current `*Last updated*` entry, add a short sentence to it (before the `Earlier:` marker): "The no-em-dash rule was scoped to public-facing site copy only; code comments, commit messages, plans, and specs are now exempt." (Match the changelog's running-paragraph style.)

b. `CLAUDE.md`: in the component lists (the "Foundation, edit with care" Astro wrappers list and/or the React-islands list), confirm `HeroBackground.astro`, `StatsRow.astro`, and `StatsCounter.tsx` are present. Add any that are missing, in the same style as the surrounding entries (one short clause each).

- [ ] **Step 3: Scan for other stale references**

Grep the agent docs for anything today's features made stale (for example, a claim that "the hero renders a single image"). Fix only real inaccuracies; do not churn accurate docs.

- [ ] **Step 4: Commit**

```bash
git add docs/agent/changelog.md CLAUDE.md
git commit -m "docs: gap-fill agent docs for today's changes (em-dash rule, HeroBackground)"
```

(Add any other `docs/agent/*.md` files to the `git add` if Step 3 changed them.)

---

### Task 2: Add feature how-tos to the Start Here guide

**Files:**
- Modify: `scripts/seed-studio-guide.mjs`

The `studioGuideDoc.howTos` array currently has 10 entries (`_key` `h1`..`h10`), each `{ _key, _type: 'howTo', title, steps: [...] }`. Add five new entries with `_key`s `h11`..`h15`. Keep the existing 10 (review them in Step 2).

- [ ] **Step 1: Add the five feature how-tos**

Append these to the `howTos` array (write the `steps` in the studio voice, short and imperative, no em-dashes). Titles and the substance each must cover:

1. `h11` - **"Set up a home page slideshow (or a single hero photo)"**: open Pages then Home; find the "Hero images" field; one photo shows a single still hero (same as before); add two or more photos and they cross-fade as a slideshow with a gentle zoom; drag to reorder; the first photo is the one that loads first; Publish.
2. `h12` - **"Add a background photo behind a page's closing call to action"**: the "Final CTA background image" field on Home, About, Services, Process, FAQ, E-Design, and Journal; pick a photo and the site automatically darkens it so the headline and button stay readable; leave it empty for the plain charcoal panel; Publish.
3. `h13` - **"Show your numbers on the About page"**: the About page "Stats" field; add up to four (a number, an optional suffix like a plus sign or k, and a label such as "Rooms designed"); the row stays hidden until you add at least one; Publish.
4. `h14` - **"Fill in your About 'off the clock' section"**: the About `personal` fields (currently list, rapid fire, favorite local spots, beyond design, and a candid photo); the whole section stays hidden until you add a headline; fill in what you like and leave the rest blank; Publish.
5. `h15` - **"Add a handwritten accent word to a heading"**: the optional script-accent fields on the hero and section headings and the Final CTA; type one word that appears in the heading exactly as written and it renders in the handwritten Pinyon Script font; use it sparingly, one per heading; leave blank to skip.

- [ ] **Step 2: Quick accuracy review of existing content**

Re-read the existing 10 how-tos and the 4 `studioMap` rows. Fix anything that has drifted (for example, a renamed Studio area). Make only real corrections.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-studio-guide.mjs
git commit -m "content: add Start Here how-tos for slideshow, Final CTA bg, stats, personal, script accents"
```

---

### Task 3: Add the "Finish setting up your site" guide

**Files:**
- Modify: `scripts/seed-studio-guide.mjs`

- [ ] **Step 1: Research current setup flows**

Web-search the current (2026) signup and setup flow for each, capturing the real steps Staci would follow:
- **Web3Forms** (`web3forms.com`): how to get a free access key (it is email-based, no account required in the classic flow). Confirm the current flow.
- **Sender** (`sender.net`): how to create a free account and a signup form, and where the form/embed or integration details are found.
- **Calendly** (`calendly.com`): how to create a free account and a 20-minute one-on-one event type and copy its link.

Keep the steps to what Staci actually does, ending each with what she hands Nathan.

- [ ] **Step 2: Add an intro tip**

Add a `tip` object `{ _key: 't8', _type: 'tip', tone: 'primary', heading: 'Before you go live: a few one-time setups', body: '...' }` (the tip shape uses `heading` + `body`, matching the existing tips `t1`..`t7`). The `body` explains: these are one-time account setups; some need a key or link that she sends to Nathan to connect; the technical launch items (domain, deploy) are Nathan's job and nothing for her to worry about.

- [ ] **Step 3: Add the setup how-tos**

Append setup how-tos to the `howTos` array (`_key`s `h16`..`h21`), titles prefixed "Setup:" so they read as a group, steps from the research in Step 1, voice rules apply, each ending with the Nathan hand-off:

1. `h16` - **"Setup: Connect your contact form email (Web3Forms)"** - the steps to get the access key, ending "send the access key to Nathan and he will connect it." Note that until it is connected the contact form cannot deliver messages.
2. `h17` - **"Setup: Turn on newsletter signups (Sender)"** - create the Sender account and a signup form/list, copy the form action URL or integration detail, "send it to Nathan and he will wire it into the signup boxes."
3. `h18` - **"Setup: Set up your discovery-call booking (Calendly)"** - create the Calendly 20-minute event, copy the link, "give the link to Nathan to set (it lives in the site config)."
4. `h19` - **"Setup: Add your Google reviews link"** - get the Google Business profile / reviews URL, paste it into Site Settings (drives the "Read more on Google" link and the reviews note), Publish.
5. `h20` - **"Setup: Add your Instagram and Facebook"** - paste the social URLs into Site Settings, Publish.
6. `h21` - **"Setup: Replace the placeholder content before launch"** - swap the `[SAMPLE]` projects, the seeded testimonials, and any placeholder photos for the real thing; mention the sample projects are clearly labeled.

- [ ] **Step 4: Add the Nathan-only tip**

Add a `tip` object `{ _key: 't9', _type: 'tip', tone: 'default', heading: 'What Nathan handles (so you do not have to)', body: '...' }` (same `heading` + `body` shape). The `body` lists domain and DNS cutover, environment keys, deploying the site, and analytics, and reassures her these are handled and not her job.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-studio-guide.mjs
git commit -m "content: add Finish-setting-up-your-site walkthrough to the Start Here guide"
```

---

### Task 4: Seed and verify

**Files:** none (data write + verification)

- [ ] **Step 1: Run the seed**

Run: `node scripts/seed-studio-guide.mjs`
Expected: prints `[ok] seeded studioGuide` and `[ok] seeded studioNotes`. This overwrites the live `studioGuide` singleton with the refreshed content.
If it prints the env error, the `.env` lacks `SANITY_API_WRITE_TOKEN`; report it, do not hardcode anything.

- [ ] **Step 2: Verify the content landed**

Read the singleton back (a small `client.fetch('*[_type=="studioGuide"][0]{ "howToCount": count(howTos), "tipCount": count(tips) }')`, or open `npm run studio:dev` and view the Start Here panel). Confirm the new how-tos (`h11`..`h21`) and tips (`t8`, `t9`) are present.

- [ ] **Step 3: Voice + accuracy read**

Read every new how-to and tip. Confirm: no em-dashes, studio voice, steps are accurate (especially the researched Web3Forms / Sender / Calendly steps), and each setup how-to ends with the Nathan hand-off.

- [ ] **Step 4: Fix and re-seed if needed**

If Step 3 finds issues, fix `scripts/seed-studio-guide.mjs`, commit, and re-run the seed.

---

## Done criteria

- The agent docs reflect today's changes (Task 1).
- `studioGuide` content has the five feature how-tos and the setup cluster (six how-tos plus two tips), all in the studio voice with no em-dashes.
- The seed ran and the refreshed panel is live.
- All script/doc changes committed.

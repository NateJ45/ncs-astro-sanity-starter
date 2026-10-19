# Hidden pages, private pages and the link checks (PORTS.md card 122)

Three things an editor can do to keep a page quiet or tidy, and how each is built. This is also the security
note for password pages.

## Hidden: "Hide this page from Google and the menus"

`page.hideFromSearch` (the field name is older than the wording; renaming it would lose every page's setting).
When it is on, the page is still built and anyone with the link can open it, but:

- `[slug].astro` passes `noindex`, so BaseLayout emits `<meta name="robots" content="noindex, follow">`;
- `astro.config.mjs` drops it from the sitemap through `isSitemapPage()` (`src/lib/sitemap-filter.ts`);
- `getNavPages()` leaves it out of the automatic menus and footer, even if "Show in the top menu" is on (the
  Studio shows a warning on that switch);
- the menu link picker (`navLink.internalPage`) does not offer it; an existing link keeps working;
- BaseLayout puts `data-pagefind-ignore="all"` on `<main>` for every noindex page, so site search skips it
  (a site search that indexes only `<main data-pagefind-body>` drops it either way);
- the Checkup's "nobody can click through to" rule leaves it out, and Home's "Your pages" marks it "(hidden)".

The fixed pages (Home, About, Contact, FAQ, Journal, Privacy) do not get the switch: they are the site's main
pages, every one is linked from the menus, and none has a reason to be hidden. A site that wants it on one adds
the field and BOTH halves (the noindex and the sitemap path) in the same change.

## Private: "Only people with the password can see this"

A separate document type, `privatePage`, in Pages, Private pages (password). Shown at `/private/<slug>/` by the
server-rendered route `src/pages/private/[slug].astro`. Pure rules: `src/lib/private-pages.ts`; Worker half:
`src/lib/private-pages-server.ts`; Studio input: `src/sanity/components/PrivatePasswordInput.tsx`.

### Why it is built this way (the security note)

The obvious design, a password switch on an ordinary custom page with the HTML served from a gated route, is NOT
safe here, and the reason is the dataset, not the HTML:

1. **The dataset is public.** Any ordinary document can be read by anyone with the project id over the plain query
   API, no login. A password on an ordinary page would lock the door and leave the window open: the page's words
   are one `curl` away.
2. **So a private page lives under an id path.** Every `privatePage` is stored as `privatePage.<id>`. Sanity serves
   documents under an id path only to authenticated requests, the same rule that keeps drafts and the card 117
   share records private. The words AND the password hash are invisible to the public API. `structure.ts` gives
   every new private page that id (a child resolver on the list); the global Create menu and Duplicate are switched
   off for the type (both would mint an ordinary, public id); the route only reads documents under the path; and
   the Checkup flags any `privatePage` stored outside it as "Needs doing".
3. **It is never built.** No build query names `privatePage`, and the route has `prerender = false`, so there is no
   HTML for it in `dist/client` to fetch around the check. A Playwright test asserts `dist/client/private` does not
   exist.
4. **The password is never stored.** The Studio input hashes it in the editor's browser (PBKDF2-SHA256, 16-byte
   random salt, 20,000 rounds; the count is stored with the hash) and saves only `{alg, iterations, salt, hash,
setAt}`. Nobody can read it back. The Worker hashes each guess the same way and compares in constant time. The
   round count is modest on purpose: the hash is already private (point 2), and every guess is hashed inside the
   Worker's CPU budget.
5. **The cookie.** A right password earns `ncs_private_<slug>`: `base64url(payload).base64url(HMAC-SHA256)` signed
   with the Worker secret `PRIVATE_PAGE_SECRET`, carrying the slug, an expiry (14 days) and the first 8 characters
   of the password's salt. HttpOnly, SameSite=Lax, Path=`/private/<slug>/`, Secure on https. A new password means a
   new salt, so it ends every old cookie at once.
6. **Rate limit.** Five wrong guesses per visitor (Cloudflare's connecting IP) and page per 15 minutes, then 429 with
   Retry-After. The count lives in the Worker isolate's memory, so it is best effort (several isolates, restarts).
   For a hard global limit add a Cloudflare rate limiting rule on `POST /private/*` in the dashboard.
7. **Every answer** is `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, a noindex meta,
   `Referrer-Policy: same-origin`; robots.txt disallows `/private/`; the sitemap filter drops it. The form looks the
   same whether or not a page exists at the address. A POST whose Origin is another site gets 403.
8. **Fails closed.** No secret, no `SANITY_TOKEN`, a read that throws, no password set: the form (or "not ready
   yet"), never the page.
9. **Editors** signed in to the Studio (the preview cookie, checked by value) can open a private page without the
   password.

**What it does not protect: pictures.** Image files are on Sanity's public CDN and the public API lists every image
asset, so someone determined could find a private page's pictures. The password field's description and the Site
Guide say so. **Also left out:** live preview in the Presentation tool (open the page at its address instead; it
changes the moment you publish, with no rebuild) and outbound link checking of private pages (the weekly check reads
the public dataset only).

### Setting it up on a site (what Nathan sets)

- `npx wrangler secret put PRIVATE_PAGE_SECRET` with 32+ random characters
  (`node -e "console.log(crypto.randomBytes(32).toString('base64url'))"`).
- The preview stack's `SANITY_TOKEN` Worker secret (a read token), which most sites already have.
- Optional: a Cloudflare rate limiting rule on `POST /private/*`.
- Add `"privatePage"` and `"linkReport"` to the publish webhook's deny-list (OPERATIONS.md): private pages are read
  live, and the weekly link report should not rebuild the site.

Locally, `.dev.vars` (git-ignored) takes `PRIVATE_PAGE_SECRET`; `PRIVATE_PAGE_TEST_FIXTURE=1` serves a fixture page
at `/private/test-private-page/` (password `correct horse battery`) so the gate can be tested with
`npm run preview` and no dataset. Never set the fixture flag on a deployed Worker.

### Testing

- `src/lib/private-pages.test.ts`: hashing, salts, doctored records, cookie signing, expiry, scope, password change,
  forged cookies, the limiter.
- `tests/private-pages.spec.ts` part 1 (normal suite): no `/private/` in the build, robots.txt, every noindex page
  out of the sitemap and search. Part 2 against the Worker:
  `PRIVATE_PAGES_BASE_URL=http://localhost:8787 npx playwright test private-pages` with `npm run preview` running
  (`.dev.vars` copied to `dist/server/`): form without a cookie, wrong password 401, right password 303 + cookie +
  page, forged cookie, cross-site POST 403, rate limit 429.

## The link and accessibility checks

`src/lib/studio-checkup-quality.ts` (`qualityRules()` in `kit.config.ts`), each with a Fix-it item and Edit button
per page (card 115):

| Rule                       | Finds                                                                           |
| -------------------------- | ------------------------------------------------------------------------------- |
| `dead-external-links`      | links to other sites the weekly check found gone (from `linkReport.latest`)     |
| `internal-link-missing`    | a typed address on this site that no page or redirect answers                   |
| `heading-skips`            | rich text that jumps a heading level (H2 to H4) or uses H1                      |
| `vague-link-text`          | "click here", "read more", a web address as link words or typed but not linked  |
| `seo-too-long`             | Google titles over 60 characters, descriptions over 160                         |
| `page-unreachable`         | a published custom page no menu, footer or page links to (hidden pages skipped) |
| `private-page-exposed`     | a private page stored outside the `privatePage.` path                           |
| `private-page-no-password` | a published private page with no password                                       |

Pictures with no description stay with the generic `image-no-description` rule.

**The weekly external check.** `.github/workflows/link-health.yml` runs `scripts/check-live-links.mjs --write-report`
on Mondays. It reads the public dataset (no token), checks every external link (HEAD, then GET), and, when the repo
has the `SANITY_API_WRITE_TOKEN` secret (the one publish-due uses), saves `linkReport.latest` (type `linkReport`, a
private id path) with each dead link, the documents using it and the field path. The Checkup reads it with the
editor's own login; a report older than three weeks is ignored. Report documents are kept out of the content
rules (`REPORT_TYPES` in `studio-checkup.ts`), so a weekly write never reads as "the last change was published
today". The morning change note ignores `linkReport` and `privatePage` (a private page's name does not belong in a
public GitHub issue).

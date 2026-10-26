# Routes summary

Moved out of CLAUDE.md. Read when you add, remove or debug a route. The modules and archive paragraph is in .claude/rules/scaffold.md.

Core routes that ship with the starter. None of them is toggleable in the Studio; the ones a fork may not want are **scaffold capabilities**, removed from the source with `npm run scaffold -- --remove <name> --write`.

| Path                  | Source                               | scaffold   | Notes                                                                                                                                               |
| --------------------- | ------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | `src/pages/index.astro`              | --         | Home -- section-driven via `pageBuilder` + `SectionRenderer`                                                                                        |
| `/about`              | `src/pages/about.astro`              | `about`    | About -- section-driven. The capability also owns founderSection, storySection and the aboutPage singleton                                          |
| `/services`           | `src/pages/services.astro`           | `services` | Services -- section-driven, plus the `service` collection and servicesGridSection                                                                   |
| `/process`            | `src/pages/process.astro`            | `process`  | Process -- section-driven, plus the `processStep` collection (graduated from module into core)                                                      |
| `/[slug]`             | `src/pages/[slug].astro`             | --         | Custom pages created in the Studio; reserved slugs are filtered inside `getStaticPaths` (see `src/lib/reservedSlugs.ts`)                            |
| `/faq`                | `src/pages/faq.astro`                | `faq`      | FAQ page + faqItem and faqCategory collections + faqSection                                                                                         |
| `/contact`            | `src/pages/contact.astro`            | --         | Contact page + Web3Forms form + Calendly embed                                                                                                      |
| `/journal`            | `src/pages/journal/index.astro`      | `journal`  | Post grid with category chips                                                                                                                       |
| `/journal/[slug]`     | `src/pages/journal/[slug].astro`     | `journal`  | Post detail: reading progress + header + cover + body + related                                                                                     |
| `/privacy`            | `src/pages/privacy.astro`            | --         | Privacy policy from singleton, with static fallback when doc is absent                                                                              |
| `/journal/rss.xml`    | `src/pages/journal/rss.xml.ts`       | `journal`  | Journal RSS feed                                                                                                                                    |
| `/studio`             | `src/pages/studio/index.astro`       | --         | The embedded Sanity Studio                                                                                                                          |
| `/search`             | `src/pages/search/[...search].astro` | --         | Visitor search page (card 126); built only when `site.search.enabled`. noindex, sitemap-excluded. Index under `/pagefind/`                          |
| `/private/[slug]`     | `src/pages/private/[slug].astro`     | --         | SSR password pages (`privatePage`, card 122). noindex, no-store, sitemap-excluded, robots-disallowed                                                |
| `/preview/**`         | `src/pages/preview/[...slug].astro`  | --         | SSR draft preview for the Studio's Presentation tool. noindex, sitemap-excluded                                                                     |
| `/preview/live`       | `src/pages/preview/live.ts`          | --         | SSE proxy for preview auto-refresh (403 without the Studio cookie)                                                                                  |
| `/api/draft-mode/*`   | `src/pages/api/draft-mode/`          | --         | Turns draft mode on/off for the preview                                                                                                             |
| `/api/studio/people/` | `src/pages/api/studio/people.ts`     | --         | People tool (SSR, card 176): GET members and pending invitations, POST invite / resend / cancel; ADMINISTRATORS only; `docs/agent/studio-people.md` |
| `/robots.txt`         | `src/pages/robots.txt.ts`            | --         | Generated; reads production URL from `site.ts`                                                                                                      |
| `/build-info.json`    | `src/pages/build-info.json.ts`       | --         | Prerendered `{ builtAt, commit }` for the Studio kit's "Is it live?" card (PORTS.md card 106)                                                       |
| `/sitemap-index.xml`  | `@astrojs/sitemap` (auto)            | --         | Production sitemap                                                                                                                                  |
| `/404`                | `src/pages/404.astro`                | --         | Custom 404                                                                                                                                          |

Two capabilities have no route of their own and are removed the same way: **`testimonials`** (the `testimonial` collection, testimonialsSection and its three components) and **`philosophy`** (the `philosophyPoint` collection and valuesSection, which is the About page's values grid).

The section-driven pages (home/about/services/process) render whichever `pageBuilder` array Sanity provides. If the array is absent (fresh clone, no Sanity project), the route falls back to code-defined defaults in `src/data/defaultSections.ts`, so the site is never blank.

Every core route except `/`, `/contact`, `/privacy`, `/404` and the Studio and preview machinery belongs to a scaffold capability, so a fork that does not want it runs one command. The `scaffold:` column above says which.

## Email routes (card 127)

| Route                                                 | What                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `/api/subscribe/` (SSR)                               | GET ready, POST sign-up (double opt-in)                                    |
| `/api/subscribe/confirm/` (SSR)                       | the confirm link; 303 to `/email/confirmed/` or `/email/link-problem/`     |
| `/api/unsubscribe/` (SSR)                             | POST only: the unsubscribe button and RFC 8058 one-click                   |
| `/api/rsvp/` (SSR)                                    | GET an event's state, POST a reply                                         |
| `/api/studio/newsletter/`, `/api/studio/rsvps/` (SSR) | the Studio's protected mail routes                                         |
| `/email/[state]/`                                     | confirmed, unsubscribe, link-problem (static, noindex, out of the sitemap) |
| `/newsletter/`, `/newsletter/<slug>/`                 | the archive; no pages at all when no issue is marked for the website       |

# Routes summary

Moved out of CLAUDE.md. Read when you add, remove or debug a route. The modules and archive paragraph is in .claude/rules/scaffold.md.

Core routes that ship with the starter. None of them is toggleable in the Studio; the ones a fork may not want are **scaffold capabilities**, removed from the source with `npm run scaffold -- --remove <name> --write`.

| Path                 | Source                              | scaffold   | Notes                                                                                                                    |
| -------------------- | ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`                  | `src/pages/index.astro`             | --         | Home -- section-driven via `pageBuilder` + `SectionRenderer`                                                             |
| `/about`             | `src/pages/about.astro`             | `about`    | About -- section-driven. The capability also owns founderSection, storySection and the aboutPage singleton               |
| `/services`          | `src/pages/services.astro`          | `services` | Services -- section-driven, plus the `service` collection and servicesGridSection                                        |
| `/process`           | `src/pages/process.astro`           | `process`  | Process -- section-driven, plus the `processStep` collection (graduated from module into core)                           |
| `/[slug]`            | `src/pages/[slug].astro`            | --         | Custom pages created in the Studio; reserved slugs are filtered inside `getStaticPaths` (see `src/lib/reservedSlugs.ts`) |
| `/faq`               | `src/pages/faq.astro`               | `faq`      | FAQ page + faqItem and faqCategory collections + faqSection                                                              |
| `/contact`           | `src/pages/contact.astro`           | --         | Contact page + Web3Forms form + Calendly embed                                                                           |
| `/journal`           | `src/pages/journal/index.astro`     | `journal`  | Post grid with category chips                                                                                            |
| `/journal/[slug]`    | `src/pages/journal/[slug].astro`    | `journal`  | Post detail: reading progress + header + cover + body + related                                                          |
| `/privacy`           | `src/pages/privacy.astro`           | --         | Privacy policy from singleton, with static fallback when doc is absent                                                   |
| `/journal/rss.xml`   | `src/pages/journal/rss.xml.ts`      | `journal`  | Journal RSS feed                                                                                                         |
| `/studio`            | `@sanity/astro` (mounted)           | --         | The embedded Sanity Studio                                                                                               |
| `/preview/**`        | `src/pages/preview/[...slug].astro` | --         | SSR draft preview for the Studio's Presentation tool. noindex, sitemap-excluded                                          |
| `/preview/live`      | `src/pages/preview/live.ts`         | --         | SSE proxy for preview auto-refresh (403 without the Studio cookie)                                                       |
| `/api/draft-mode/*`  | `src/pages/api/draft-mode/`         | --         | Turns draft mode on/off for the preview                                                                                  |
| `/robots.txt`        | `src/pages/robots.txt.ts`           | --         | Generated; reads production URL from `site.ts`                                                                           |
| `/sitemap-index.xml` | `@astrojs/sitemap` (auto)           | --         | Production sitemap                                                                                                       |
| `/404`               | `src/pages/404.astro`               | --         | Custom 404                                                                                                               |

Two capabilities have no route of their own and are removed the same way: **`testimonials`** (the `testimonial` collection, testimonialsSection and its three components) and **`philosophy`** (the `philosophyPoint` collection and valuesSection, which is the About page's values grid).

The section-driven pages (home/about/services/process) render whichever `pageBuilder` array Sanity provides. If the array is absent (fresh clone, no Sanity project), the route falls back to code-defined defaults in `src/data/defaultSections.ts`, so the site is never blank.

Every core route except `/`, `/contact`, `/privacy`, `/404` and the Studio and preview machinery belongs to a scaffold capability, so a fork that does not want it runs one command. The `scaffold:` column above says which.

# team module

Adds a `/team` page displaying all team members in a responsive grid ordered by `displayOrder` (then name). Each member card shows a headshot, name, role, bio, and optional email and social links. The page includes an optional intro section above the grid. A coming-soon state renders automatically when no `teamMember` documents exist. Studio schemas: `teamPage` (singleton for SEO and hero copy) and `teamMember` (collection, one document per person).

No per-member detail pages are included by default; the enable doc describes how to add them as a custom extension.

**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `SanityImage.astro`, `PortableText.tsx`, `getSectionVisibility` (from `@/lib/sectionVisibility`).

Enable steps and exact code snippets are in `docs/modules/team.md`. Run `node modules/team/seed.mjs` after enabling to populate a placeholder page and three neutral team members (Alex Morgan, Jordan Lee, Sam Rivera).

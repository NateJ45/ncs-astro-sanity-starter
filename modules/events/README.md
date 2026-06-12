# events module

Adds an `/events` page showing upcoming events sorted by date (ascending) and a collapsed past events section. Each event card shows the title, date/time, location, description, and an optional registration button linking to an external registration service. A coming-soon state renders automatically when no `event` documents exist. Studio schemas: `eventsPage` (singleton for SEO and hero copy) and `event` (collection, one document per event).

**Depends on (already in core):** `SectionHeading.astro`, `Hero.astro`, `SanityImage.astro`, `PortableText.tsx`, `getSectionVisibility` (from `@/lib/sectionVisibility`).

Enable steps and exact code snippets are in `docs/modules/events.md`. Run `node modules/events/seed.mjs` after enabling to populate a placeholder page and three neutral events with future dates.

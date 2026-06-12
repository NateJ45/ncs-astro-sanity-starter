# Module Library

All 13 opt-in modules are listed below. Each module is OFF by default in the
starter. Enable only the ones a given client needs by following the steps in
the module's enable doc.

For the shared folder-shape contract and the verify loop, see
`modules/README.md`.

---

## Presets

These combinations cover the most common project types and work well together
out of the box.

**Creative-studio:** enable `portfolio` for a design, photo, or architecture
studio. It adds a browsable project gallery. The `/process` route is part of
the core starter (always on) and needs no module to enable.

**Capture preset:** `newsletter` + `lead-magnets` + `resources` (optionally add
`style-quiz` and/or `budget-calculator`) for a lead-generation site. The three
core modules build a mailing list and a downloadable-guide library; the two
optional additions offer interactive qualification tools.

**Non-profit preset:** `donations` + `events` + `newsletter` (optionally add
`portfolio` for impact storytelling through project case studies). The donations
module adds the `/donate` page linking to an external processor; events
surfaces upcoming programs and workshops; newsletter builds a donor list.
Together these three modules cover the essential non-profit web presence.

---

## Module index

| Module | Description | Route(s) | Enable doc |
|--------|-------------|----------|------------|
| [portfolio](#portfolio) | Browsable project gallery with category filtering and before/after comparisons | `/portfolio`, `/portfolio/[slug]`, `/portfolio/before-after` | [docs/modules/portfolio.md](portfolio.md) |
| [newsletter](#newsletter) | Global email signup widget (no dedicated route; embedded in other pages or the footer) | none | [docs/modules/newsletter.md](newsletter.md) |
| [lead-magnets](#lead-magnets) | Downloadable guides library with gated-download forms | `/guides`, `/guides/[slug]` | [docs/modules/lead-magnets.md](lead-magnets.md) |
| [style-quiz](#style-quiz) | Interactive preference quiz that qualifies leads | `/quiz` | [docs/modules/style-quiz.md](style-quiz.md) |
| [budget-calculator](#budget-calculator) | Interactive project budget estimator | `/calculator` | [docs/modules/budget-calculator.md](budget-calculator.md) |
| [shop](#shop) | Product or digital-goods shop listing with item detail cards | `/shop` | [docs/modules/shop.md](shop.md) |
| [virtual-services](#virtual-services) | Service landing page for online or virtual service offerings | `/virtual-services` | [docs/modules/virtual-services.md](virtual-services.md) |
| [gift-certificates](#gift-certificates) | Gift certificate purchase or inquiry landing page | `/gift-certificates` | [docs/modules/gift-certificates.md](gift-certificates.md) |
| [press](#press) | Press and media coverage listing | `/press` | [docs/modules/press.md](press.md) |
| [resources](#resources) | Curated resource or link library for clients | `/resources` | [docs/modules/resources.md](resources.md) |
| [team](#team) | Team member listing page with headshots, roles, and bios | `/team` | [docs/modules/team.md](team.md) |
| [events](#events) | Upcoming and past events listing with registration links | `/events` | [docs/modules/events.md](events.md) |
| [donations](#donations) | Donation landing page linking to an external processor | `/donate` | [docs/modules/donations.md](donations.md) |

---

## Module details

### portfolio

Adds a browsable project gallery. Visitors can filter by category and view
individual project detail pages. Optionally includes a before/after comparison
page. Introduces two schemas (`portfolioPage` singleton, `project` collection)
and four components (`PortfolioCursor`, `PortfolioFilterChips`, `ProjectGallery`,
`ProjectMetaBand`).

The `project` schema ships with generic placeholder option values for the
"Project category" (field name `roomType`) and "Project style" (field name
`designStyle`) filter axes. Replace these with labels that match the client's
work before publishing. See Step 1 of the enable doc.

Routes: `/portfolio` (index), `/portfolio/[slug]` (detail), `/portfolio/before-after`

---

### newsletter

Adds a global email signup widget intended to be embedded in other pages (footer,
sidebar, inline CTAs) rather than occupying a dedicated route. Has no schemas of
its own; it relies on the `subscribe.ts` helper already in the core and the
mailing-list integration configured in `siteSettings`.

Route: none (embedded component only)

---

### lead-magnets

Adds a downloadable guides library. The index page lists all available guides;
each guide has its own detail page with a gated-download form powered by the
`LeadMagnetForm` component. Introduces one schema (`leadMagnet` collection).

Routes: `/guides` (index), `/guides/[slug]` (detail)

---

### style-quiz

Adds an interactive preference quiz that helps visitors identify their
fit and optionally captures their email for follow-up. The quiz
logic lives in the `StyleQuiz` React island. Introduces one schema
(`styleQuiz` singleton for copy and result descriptions). Ships with three
generic placeholder archetypes (Archetype A/B/C) and four neutral questions;
replace with client-specific archetypes and copy before publishing.

Route: `/quiz`

---

### budget-calculator

Adds an interactive project budget estimator. Visitors answer a series of
questions and receive an estimated investment range. The calculator logic lives
in the `BudgetCalculator` React island. Introduces one schema
(`budgetCalculator` singleton for copy, question prompts, and price ranges).
Ships with three generic project-size options and generic add-on labels;
replace with client-specific pricing before publishing.

Route: `/calculator`

---

### shop

Adds a product or digital-goods listing page. Items are managed as `shopItem`
documents grouped into `shopCollection` documents. Introduces three schemas
(`shopPage` singleton, `shopCollection`, `shopItem`) and two components
(`ShopGrid`, `ShopItemCard`).

Route: `/shop`

---

### virtual-services

Adds a service landing page for online or virtual service offerings.
Content is managed via the `virtualServicesPage` singleton. Sections include
a hero, intro copy, how-it-works steps, deliverables list, pricing tiers, optional
FAQ, and a final CTA. No collection schema or interactive components beyond what
is already in the core.

Formerly named **e-design** (the old folder was removed; it lives in git history
if an existing project needs it). See the migration note in
`docs/modules/virtual-services.md`.

Route: `/virtual-services`

---

### gift-certificates

Adds a gift certificate landing page where visitors can purchase a certificate
or submit an inquiry. Content is managed via the `giftPage` singleton.

Route: `/gift-certificates`

---

### press

Adds a press and media coverage listing. Coverage items are managed as `pressItem`
documents and displayed on the `pressPage` singleton. Introduces two schemas
(`pressPage` singleton, `pressItem` collection).

Route: `/press`

---

### resources

Adds a curated resource or link library for clients. Content is managed via the
`resourcesPage` singleton (individual resource links are inline fields, not a
separate collection schema). Has no interactive components beyond core layout.

Route: `/resources`

---

### team

Adds a team member listing page. Members are managed as `teamMember` documents
ordered by `displayOrder` (then name). Each card shows a headshot, name, role,
bio, and optional email and social links. Optional intro copy from the
`teamPage` singleton appears above the grid. A coming-soon state renders when
no members exist. No per-member detail pages by default; see the enable doc
for how to add them as a custom extension. Introduces two schemas (`teamPage`
singleton, `teamMember` collection).

Route: `/team`

---

### events

Adds an events listing page. Upcoming events (startDate >= now) are shown
sorted by start date ascending; past events collapse under a `<details>` element.
Each card shows title, date/time, location, description, and an optional
external registration link. A coming-soon state renders when no event documents
exist. Introduces two schemas (`eventsPage` singleton, `event` collection).

Route: `/events`

---

### donations

Adds a donation landing page linking out to an external processor (Donorbox,
PayPal Giving Fund, Stripe, Give Lively, etc.). No payment processing happens
on the page itself. Sections include a hero, mission copy, impact stats row
(up to four stat blocks), prominent donate CTA, optional FAQ accordion, and
a closing dark CTA panel. A coming-soon state renders when the document has
not been published. Set `donateUrl` in Studio before publishing. Introduces
one schema (`donationsPage` singleton).

Pairs well with `events` and `newsletter` to form the **non-profit preset**.
Optionally add `portfolio` for impact storytelling.

Route: `/donate`

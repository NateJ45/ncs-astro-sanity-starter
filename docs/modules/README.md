# Module Library

All 11 opt-in modules are listed below. Each module is OFF by default in the
starter. Enable only the ones a given client needs by following the steps in
the module's enable doc.

For the shared folder-shape contract and the verify loop, see
`modules/README.md`.

---

## Presets

These combinations cover the most common project types and work well together
out of the box.

**Creative-studio pair:** enable `portfolio` + `process` for a design, photo,
or architecture studio. Together they give visitors a browsable project gallery
and a transparent look at how you work.

**Capture preset:** `newsletter` + `lead-magnets` + `resources` (optionally add
`style-quiz` and/or `budget-calculator`) for a lead-generation site. The three
core modules build a mailing list and a downloadable-guide library; the two
optional additions offer interactive qualification tools.

---

## Module index

| Module | Description | Route(s) | Enable doc |
|--------|-------------|----------|------------|
| [portfolio](#portfolio) | Browsable project gallery with category filtering and before/after comparisons | `/portfolio`, `/portfolio/[slug]`, `/portfolio/before-after` | [docs/modules/portfolio.md](portfolio.md) |
| [process](#process) | Step-by-step "how I work" page driven by orderable processStep documents | `/process` | [docs/modules/process.md](process.md) |
| [newsletter](#newsletter) | Global email signup widget (no dedicated route; embedded in other pages or the footer) | none | [docs/modules/newsletter.md](newsletter.md) |
| [lead-magnets](#lead-magnets) | Downloadable guides library with gated-download forms | `/guides`, `/guides/[slug]` | [docs/modules/lead-magnets.md](lead-magnets.md) |
| [style-quiz](#style-quiz) | Interactive style-preference quiz that qualifies leads | `/quiz` | [docs/modules/style-quiz.md](style-quiz.md) |
| [budget-calculator](#budget-calculator) | Interactive project budget estimator | `/calculator` | [docs/modules/budget-calculator.md](budget-calculator.md) |
| [shop](#shop) | Product or digital-goods shop listing with item detail cards | `/shop` | [docs/modules/shop.md](shop.md) |
| [e-design](#e-design) | Service landing page for e-design or virtual design offerings | `/e-design` | [docs/modules/e-design.md](e-design.md) |
| [gift-certificates](#gift-certificates) | Gift certificate purchase or inquiry landing page | `/gift-certificates` | [docs/modules/gift-certificates.md](gift-certificates.md) |
| [press](#press) | Press and media coverage listing | `/press` | [docs/modules/press.md](press.md) |
| [resources](#resources) | Curated resource or link library for clients | `/resources` | [docs/modules/resources.md](resources.md) |

---

## Module details

### portfolio

Adds a browsable project gallery. Visitors can filter by category and view
individual project detail pages. Optionally includes a before/after comparison
page. Introduces two schemas (`portfolioPage` singleton, `project` collection)
and four components (`PortfolioCursor`, `PortfolioFilterChips`, `ProjectGallery`,
`ProjectMetaBand`).

Routes: `/portfolio` (index), `/portfolio/[slug]` (detail), `/portfolio/before-after`

---

### process

Adds a "how I work" page composed of draggable process steps managed in Studio.
Steps use the orderable-document-list plugin so editors control display order
without touching code. Introduces two schemas (`processPage` singleton,
`processStep` orderable collection).

Route: `/process`

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

Adds an interactive style-preference quiz that helps visitors discover their
design aesthetic and optionally captures their email for follow-up. The quiz
logic lives in the `StyleQuiz` React island. Introduces one schema
(`styleQuiz` singleton for copy and result descriptions).

Route: `/quiz`

---

### budget-calculator

Adds an interactive project budget estimator. Visitors answer a series of
questions and receive an estimated investment range. The calculator logic lives
in the `BudgetCalculator` React island. Introduces one schema
(`budgetCalculator` singleton for copy, question prompts, and price ranges).

Route: `/calculator`

---

### shop

Adds a product or digital-goods listing page. Items are managed as `shopItem`
documents grouped into `shopCollection` documents. Introduces three schemas
(`shopPage` singleton, `shopCollection`, `shopItem`) and two components
(`ShopGrid`, `ShopItemCard`).

Route: `/shop`

---

### e-design

Adds a service landing page for e-design or virtual interior design offerings.
Content is managed via the `eDesignPage` singleton. Has no collection schema or
interactive components beyond what is already in the core.

Route: `/e-design`

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

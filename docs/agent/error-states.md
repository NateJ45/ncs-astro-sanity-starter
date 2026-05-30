# Error and empty states

> Patterns for 404, form-submission failure, empty collections, and unresolved Sanity references.

## Error and empty states

Patterns for the moments when things go sideways or content hasn't landed yet.

### 404

`src/pages/404.astro` uses BaseLayout, sets a clear "That page wandered off." headline, and gives the visitor three paths: back to Home, browse the Portfolio, or Contact. Two-column editorial layout — text on the left, a styled vignette photograph on the right (currently Staci's studio-dogs shot). Don't link "Search" (there isn't one). Don't dump a list of random pages. Eyebrow + headline + body + image + the three CTA labels & hrefs are all Sanity-editable via the `notFoundPage` singleton — every field has a hardcoded fallback that matches the prior look so the page works even before the doc exists.

### Form submission failure

The contact form posts to Web3Forms. Three failure modes, each with a distinct user-visible message:
- **Network failure** ("Couldn't send right now. Try again, or email owner@example.com directly.")
- **Rate limit** (rare, Web3Forms free tier is 250/month): same message, Staci's email is the failsafe.
- **Validation rejection** (missing required field, bad email format): inline per-field message, focus moves to the first invalid field, and the error container has `role="alert"` so screen readers announce.

Don't show "Oops!" or "Something went wrong." Always tell the user what to do next.

### "No projects yet" empty state

`/portfolio` index (post-launch) renders an empty state for the period between launch and the first 1 or 2 case studies landing. Content: brief explanation that case studies are coming, link to Contact for "start your own project," link back to Services. Don't hide the page entirely — keeping it live builds expectation and gives Google something to crawl.

### Sanity reference resolution

A few queries reference other documents (e.g., `homePage.featuredTestimonial` → testimonial). If the referenced doc gets unpublished or deleted, the query returns `null`. Every component that consumes a referenced doc must handle null gracefully — render the section without it, or skip the section entirely. Don't crash, don't show "undefined."

### Sanity content not yet seeded

During the launch window, some `siteSettings` or page fields may be empty while Staci completes them. Every component reading from Sanity falls back to a sensible default (see `Footer.astro` and `Header.astro` for the pattern: `siteSettings?.field ?? site.staticDefault`). The site stays presentable even with empty content.

# Shop module

Adds a `/shop` affiliate product listing page. Items are organized into named
collections (`shopCollection`, orderable) and rendered as linked cards
(`shopItem`, orderable). The page is controlled by a `shopPage` singleton that
holds the hero copy, an FTC affiliate disclosure (required by law and rendered
prominently above all collections), an `enabled` toggle, and the ordered list of
collections to display.

Depends on core: `SanityImage.astro`, `SectionHeading.astro`, `getSectionVisibility`.

For full enable instructions and exact Studio snippets, see
`docs/modules/shop.md`.

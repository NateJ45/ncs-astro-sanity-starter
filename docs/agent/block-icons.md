# Block icons

> The small icon set behind the icon cards and the steps on a path, and how a site swaps in its own (PORTS.md card 193).

## What ships

`src/lib/block-icons.ts` holds `BLOCK_ICONS`: 17 neutral line icons (a house, heart, star, calendar, clock, map pin,
phone, envelope, speech bubble, people, book, cup, gift, leaf, wrench, door, check). Each is a few SVG paths on a 24 by
24 grid, drawn with a stroke in `currentColor`, so an icon takes the text colour of its card and works in light, dark
and a Feature band with no extra CSS. `src/components/builder-blocks/BlockIcon.astro` draws one by name, hidden from
screen readers (the words beside it carry the meaning), and draws nothing for a name it does not know, so a retired icon
never breaks a page.

Three pieces use it and nothing else does: the `icon` field (`iconField()` in `builderSections.ts`, listed in
`NON_STEGA_FIELDS`), `IconCardsBlock.astro`, `StepsRailBlock.astro` and `HubBlock.astro`. All of them call
`<BlockIcon name={...} />`.

## A site with its own icons (Auburn's stone icons)

The icon set is per site. Keep the field name `icon` and the shape of the list; change two things in the site's own
files.

1. **The list.** Replace the entries in `block-icons.ts` with the site's picks: `value` is the stored name, `title` is
   what the editor reads in the picker. A site whose art is image files keeps only `value` and `title` and leaves
   `paths` empty (the type allows it).
2. **The component.** If the art is a set of image files, replace `BlockIcon.astro` with one that maps `name` to the file
   (Auburn's `StoneIcon.astro` does this with `import.meta.glob('../assets/brand/stone-icon-*.svg')` and `getImage`),
   keeping the props `name`, `size` and `class`. The cards and the rail do not change.

Add a name to the list and its file in the same commit, so a value can never name an icon that is not there. A new
icon drawn as paths needs stroke-friendly geometry (no fills), because the component sets `fill="none"`.

## Colour and size

The icon is `currentColor`; the card styles (`builder-blocks-more.css`, `.bb-icard__icon`, `.bb-rail__badge`) colour it
with `--primary`. A brand that wants quiet icons sets them to `--foreground` there. Sizes are 64px in a card, 28px in a
rail badge, 40px beside a title on a phone. The hub's no-photo tile centres one on `--shape-tile` (`shapes.css`).

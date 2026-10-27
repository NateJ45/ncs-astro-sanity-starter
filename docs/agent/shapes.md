# Picture shapes

> The shape class contract (`src/styles/shapes.css`, PORTABLE, PORTS.md card 188) and how a brand sets its own shapes.

From FBC Auburn's shape system (2026-10-24): a few picture shapes make a client's own phone photos read
as one designed family. The **class names are the contract** and are the same on every site in the
family; the **geometry and the paint are tokens** a brand sets in its own layer (`globals.css` on the
starter, the site's brand stylesheet elsewhere). The defaults are neutral, and the file is class rules
only, so a site that never uses a class renders exactly as before.

## The classes

| Class                                | What it does                                                                                                                                                        | Typical use                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `.shape-step`                        | A picture inside a card: a plain frame on `--radius-inner`. `.shape-step--lg` takes `--radius-card` (a post's cover). Named for the stepped corner it once cut.     | Card photos, portraits                               |
| `.shape-gable`                       | A picture that stands alone: the brand's signature cut (`--shape-feature-clip`) and corner (`--shape-feature-radius`). Neutral default: the card corner, no cut.    | A text-and-picture band's photo, the board page head |
| `.shape-slab`                        | A panel (`--shape-slab`) behind the picture, from `--shape-slab-inset` across it out past the page edge. `.shape-slab--left` runs it left. A band on a phone.       | Behind a `.shape-gable` picture                      |
| `.shape-slab-host`                   | Clips sideways overflow, so the slab stops at the window edge. Put it on the section.                                                                               | The section around a slab                            |
| `.shape-zoom` inside a `.shape-card` | The picture grows to `--shape-zoom` over 500ms on hover or keyboard focus of the card, inside the frame (the zoom is on an inner wrapper). Off with reduced motion. | Link cards                                           |
| `.shape-tile`                        | A card with no photo: its icon or mark centred on `--shape-tile`, in the same frame, so a grid never breaks.                                                        | A card whose photo is missing                        |

Every frame has `border: 0` (a clipped border shows as a hairline along the cut) and `--muted` behind
the picture while it loads. The cuts are `clip-path`s, so an image, a video or a plain panel take them
the same way.

## The tokens (set per brand)

| Token                    | Default              | Notes                                                                                      |
| ------------------------ | -------------------- | ------------------------------------------------------------------------------------------ |
| `--shape-feature-clip`   | `none`               | The standalone cut. `var(--shape-gable-polygon)` is a ready-made roofline.                 |
| `--shape-feature-radius` | `var(--radius-card)` | Set `0` with a cut, or the cut's corners round off.                                        |
| `--gable-pitch`          | `24%`                | How far down the box the roofline's eaves sit (a narrow box reads steep, a wide one flat). |
| `--shape-slab`           | `var(--muted)`       | Any `background` value: a colour, or a texture `url(...)` over a colour.                   |
| `--shape-slab-inset`     | `34%`                | Where the slab starts across the picture.                                                  |
| `--shape-tile`           | `var(--muted)`       | The no-photo panel.                                                                        |
| `--shape-zoom`           | `1.06`               | The hover scale.                                                                           |

The defaults are declared under `:where(:root)` (zero specificity), so a brand's own `:root` wins
whatever the stylesheet order.

**FBC Auburn's layer**, the worked example: `--shape-feature-clip: var(--shape-gable-polygon)` and
`--shape-feature-radius: 0` (its building's front gable), `--shape-slab` a red printed-brick texture over
`#6a2b20`, `--shape-tile` its one tinted panel `#e9eef5`, `--shape-zoom: 1.08`. A different brand picks a
cut from its own mark or building (an arch, a notch, a soft blob) and writes it as a `polygon()` or
`path()`; the classes and the markup do not change.

## Where the starter uses them

Only the board grammar's page head (`hero: board`, `docs/agent/design-tokens.md`) puts its photo in
`.shape-gable`. Nothing else in the starter carries a shape class yet, so the default site is
unchanged; a site that wants its cards or bands shaped adds the classes to its own components. The
contract is shown, unshot, at the end of `/styleguide/layouts/`.

# Popups (PORTS.md card 170)

A popup is a short message in a box over the page, with one button: for the few big things a
year (holiday hours, an event). It is different from an Announcement, the quiet line across the
top of every page. A popup interrupts, so it carries guard rails.

Files:

- `src/sanity/schemaTypes/popup.ts`: the document type, listed under Content > Popups
  (`structure.ts`), with its Studio validation. Safe to edit: wording and examples are per site.
- `src/lib/popup.ts` (PORTABLE): which popup is live, which pages it shows on, the overlap check,
  the dismissal key. Tests in `src/lib/popup.test.ts` (PORTABLE). Page addresses come from the
  site's own `SINGLETON_LIVE_PATHS` in `src/lib/nav-href.ts`, so the file is identical everywhere.
- `src/components/SitePopup.astro`: the dialog and its script. Safe to edit: a site restyles it.
- `src/layouts/BaseLayout.astro`: reads the popups once per build (`getPopups()` in `queries.ts`),
  picks one and renders `SitePopup` only on the pages it is meant for.
- `/styleguide/popup/` renders it with fixed words; `tests/popup.spec.ts` drives it with
  Playwright's clock.

## Fields

Heading (60 characters, required), message (200), one button (text and link, both or neither; a
link starts with `/` or `https://`), an optional picture with alt text, Show from, Show until
(required, so a popup always takes itself down), which pages (every page, Home only, the pages
the editor picks), how often (once per visitor, `localStorage`; once per visit,
`sessionStorage`), and the on/off switch. `where` and `frequency` are in `NON_STEGA_FIELDS`.

## Guard rails

- **One at a time.** `pickPopup` puts one on the site: the switched-on popup that started most
  recently, else the soonest upcoming. A document-level warning names any other switched-on
  popup whose dates overlap.
- **Never straight away.** It opens only after 4 seconds on the page AND a quarter screen of
  scroll (8 seconds on a page too short to scroll that far). A timer alone interrupts someone
  reading the first screen; scroll shows they are browsing, and Google counts a box over the
  content on landing as an intrusive interstitial. It waits while another dialog (the phone
  menu) is open and never opens for print.
- **Accessible.** A native `<dialog>` opened with `showModal()` (the page behind is inert), focus
  on Close and kept inside by a Tab wrap, Escape and the backdrop close it, focus goes back to
  where it was. Animation only under `prefers-reduced-motion: no-preference`; hidden in print; no
  layout shift (top layer). Colors are the theme tokens (`--card`, `--card-foreground`,
  `--border`, `--ring`), so it follows light and dark.
- **Never on `/studio`, `/preview`, `/api` or a password page** (`popupShowsOn`).
- **Remembered** under `site-popup:<id>:<last edit>`, so an edited popup shows again. Storage that
  throws (a private window) falls back to memory.
- **Free when unused.** No popup documents, no markup and no script: the component's script only
  ships on a page that renders it.
- **On time between rebuilds.** The query keeps popups that have not ended at build time; the
  browser checks the start and end dates again, so a popup starts and ends on time. It still
  needs a rebuild (the publish webhook) to appear after it is first published.

## Switching it on

Nothing to do: the type is in the schema, and with no popup documents nothing renders. An editor
adds one under Content > Popups. Guide: "Put up a popup" (`src/sanity/guides/content.ts`).

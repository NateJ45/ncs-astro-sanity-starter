---
paths:
  - 'src/sanity/**'
  - 'sanity.config.ts'
  - 'sanity.cli.ts'
  - 'src/lib/queries.ts'
  - 'src/lib/sectionCadence.ts'
  - 'src/lib/section-fields*.ts'
  - 'src/lib/reservedSlugs.ts'
  - 'src/pages/[slug].astro'
  - 'src/components/SectionRenderer.astro'
  - 'scripts/audit-studio.mjs'
---

# Schema, page builder and data-model rules (1, 8b, 9, 10, 15)

Loads when you touch the Sanity schema, Studio config or page builder. Moved verbatim from CLAUDE.md; the numbering is the original rule numbering, which other docs cite.

<!-- prettier-ignore-start -->
1. **Never click "Remove field" in the Studio.** It deletes that field's data across every document and cannot be undone without a dataset restore. It appears when the Studio's schema is older than the data. Since the Studio is embedded (it ships with the site build) the sequence after a schema change is: edit schema, `npm run typegen`, commit, deploy. There is no separate `studio:deploy` step any more.
8b. **Adding a logic-driving dropdown field to a schema means adding its name to `NON_STEGA_FIELDS`** in `src/lib/cms-preview.ts`, in the same commit. Miss it and the block renders the wrong branch **in the preview only**, which is the hardest kind of bug to notice.
9. **`pageBuilder` cadence is managed by `SectionRenderer`, not by the blocks themselves.** Blocks carry no surface/color field. The alternating-surface logic lives in `src/lib/sectionCadence.ts`. Do not add color fields to block schemas. This is now a TEST, not just a rule: `src/lib/section-fields.test.ts` fails if `sections.ts` or `richSections.ts` ever declares a `tone`, `surface`, `background` or `accent` field. It is also why PORTS.md cards 26 and 28 land here `partial` on purpose -- the sibling repos' band swatch control has nothing to write to here, and adding a field to get the control would trade the reorder guarantee for a convenience.
10. **The reserved-slug guard lives inside `getStaticPaths` in `[slug].astro`,** not at module scope. This is an Astro isolated-scope requirement; shared list is in `src/lib/reservedSlugs.ts`. If you move the guard outside `getStaticPaths`, it silently stops working.
15. **Anything computable from data is derived at build time, never stored as a field an editor can retype.** Stone Steps modelled its race records as `recordEntry` documents with the name and the time typed into them, alongside the results archive those records are supposed to summarise, and the two drifted: five 27K records sat on the board for marks that match no result on file, in any year, at either distance. The fix was to compute the board from the results, so the two cannot disagree, and the same move was made again for the entry fee (quoted from the fee tiers rather than typed a second time) and for the numbers in the stat band. The test is simple: if a value can be worked out from something else in the dataset, a field for it is a second source of truth, and the second one is the one that goes stale. Give the editor the inputs, not the answer. This is a judgement rule, not a gate: nothing in the test suite can tell a derived number from a typed one.
<!-- prettier-ignore-end -->

## Schema conventions (unnumbered; PORTS.md card 66)

**Content that did not come from the client's own words carries a `confirmed` boolean, default `false`, and renders a visible placeholder badge until someone ticks it.** A summarised scrape is not source data: a fetch that returns prose has already thrown away the structure, and transcribing it into a data file is invention, not migration (Stone Steps, 2026-09-07: age brackets shifted a row, two record holders invented to fill a bracket that does not exist, 11 bare names shipped where the source had 66 timed cells, and a code comment "explaining" the truncation made the fabrication read as a decision). Anything the source does not publish, and every value you inferred, gets the flag:

```ts
defineField({
  name: 'confirmed',
  title: 'Confirmed',
  type: 'boolean',
  initialValue: false,
  description: 'Tick once the owner has confirmed this. Until then the site shows a "Not confirmed" badge.',
  options: { canvasApp: { exclude: true } }, // config, not prose
}),
```

Render it with `src/components/Provisional.astro` (`<Provisional confirmed={doc.confirmed} what="Start time" />`; it renders nothing once `confirmed === true`, so a caller never writes the conditional). Putting the marker in the DATA inverts the failure mode: a hand-placed badge relies on a developer remembering to delete it on the day the real answer arrives and nothing fails if they forget, whereas a field defaults to unconfirmed, announces itself in the UI, and puts the burden on the person who actually knows the answer. Also keep unconfirmed values out of JSON-LD so Google is never told a provisional time. The starter ships no `confirmed` field itself (it has no scraped data); add it to the document types a migration fills. Migration procedure that goes with it: parse the DOM for anything tabular, never transcribe a summary; verify by COUNTING (`curl -sL "$URL" | grep -o '<tr' | wc -l`, then the timed or priced cells) against what you rendered; resolve every outbound URL with one `curl -o /dev/null -w "%{http_code}"` instead of reconstructing a slug.

# process module

Adds a `/process` page that walks visitors through the studio's working method
step by step. Steps are managed as orderable `processStep` documents in Studio so
editors control display order without touching code. The page also shows a FAQ
block filtered to process-related items, and closes with a final CTA.

**Core dependencies (do not copy these -- they live in the core):**
`ProcessStep.astro`, `ProcessStepIllustration.astro`, `SectionHeading.astro`,
`FinalCta.astro`, `getSectionVisibility` (from `@/lib/sectionVisibility`).

Enable steps are in `docs/modules/process.md`. Run `node modules/process/seed.mjs`
after enabling to populate four neutral placeholder steps.

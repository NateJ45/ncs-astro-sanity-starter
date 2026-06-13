---
description: Read-only content gap report for the Sanity dataset
argument-hint: "[--fields | --doc <id>]"
---

Run the read-only dataset audit and interpret the results for the user.

1. Run `node scripts/sanity-audit.mjs $ARGUMENTS` (from the repo root). With no
   arguments it prints the summary: document counts by type, missing expected
   singletons/collections, and unpublished drafts. `--fields` adds the
   per-document empty/absent field diff. `--doc <id>` dumps one document
   (e.g. `--doc siteSettings`).

2. Interpret, do not just paste. The summary alone answers most questions:
   - Unpublished drafts above 0 means an editor has Studio changes that are NOT
     on the live site. List them; this is the usual cause of "I changed it in
     Studio but the site did not update" (the other cause is no rebuild since
     publish, see /rebuild).
   - A missing singleton means a page renders entirely from code fallbacks in
     src/data/defaultSections.ts.
   - In --fields output, most "absent" fields are intentional optionals
     (seoImage, heroScriptAccent, integration URLs, etc.). Check the schema
     description in studio/schemaTypes/ before calling a gap a problem.
     Starter-dataset documents intentionally fill only the core fields.

3. If the user asks to fix a gap, patch Sanity with a script per the
   "Patch Sanity content programmatically" section in OPERATIONS.md (use
   setIfMissing, never clobber populated fields). Never invent client facts
   (prices, names, schedules): ask the client for the source material.

Remember: content edits land in the dataset instantly but the live site only
changes after a rebuild (static build). Suggest /rebuild when content was
patched.

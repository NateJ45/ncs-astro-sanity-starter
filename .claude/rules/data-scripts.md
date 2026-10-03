---
paths:
  - 'scripts/**'
  - 'migrations/**'
  - 'docs/RESTORE-DRILL.md'
---

# Rule 16: retiring data

Loads when you write or edit scripts that change data. Moved verbatim from CLAUDE.md.

16. **Retiring data means a backup-then-delete script, run dry first, never a raw delete.** When the five unprovable 27K records came off the board, the working script wrote all five documents verbatim to a committed JSON file BEFORE deleting anything, guarded each delete on the exact conditions that justified it (a 27K entry dated before the 27K existed; an athlete only if nothing outside those records pointed at them), and carried a `--dry-run` that prints the whole plan and writes nothing. `scripts/retire-27k-records.mjs` in the Stone Steps repo is the shape to copy. `scripts/cutover.mjs` here is the same discipline applied to a live domain and goes one better: it is dry BY DEFAULT, and `--write` is the only thing that lets it act, which is the safer of the two defaults. A delete you cannot read the plan for before it runs, and cannot reverse after it runs, is not a migration. This one is judgement too, but it has a habit that makes it cheap: write the backup step first, and the dry run falls out of it.

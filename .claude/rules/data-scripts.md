---
paths:
  - 'scripts/**'
  - 'migrations/**'
  - 'docs/RESTORE-DRILL.md'
---

# Rule 16: retiring data, and the gate on every write

Loads when you write or edit scripts that change data. Rule 16 moved verbatim from CLAUDE.md; the write gate below it was added 2026-10-13 (PORTS.md card 86).

16. **Retiring data means a backup-then-delete script, run dry first, never a raw delete.** When the five unprovable 27K records came off the board, the working script wrote all five documents verbatim to a committed JSON file BEFORE deleting anything, guarded each delete on the exact conditions that justified it (a 27K entry dated before the 27K existed; an athlete only if nothing outside those records pointed at them), and carried a `--dry-run` that prints the whole plan and writes nothing. `scripts/retire-27k-records.mjs` in the Stone Steps repo is the shape to copy. `scripts/cutover.mjs` here is the same discipline applied to a live domain and goes one better: it is dry BY DEFAULT, and `--write` is the only thing that lets it act, which is the safer of the two defaults. A delete you cannot read the plan for before it runs, and cannot reverse after it runs, is not a migration. This one is judgement too, but it has a habit that makes it cheap: write the backup step first, and the dry run falls out of it.

## Every write: dry by default, and a second factor on production

- **A script that writes is dry by default.** Build it on `scripts/lib/sanity-lib.mjs` (`apply()` and `done()`), which prints the plan and writes nothing unless the run carries `--apply`. A script that cannot use it (one that must stay dependency-free, such as `publish-due.mjs`) imports `scripts/lib/write-gate.mjs` FIRST, before `dotenv/config`, and calls `writeGate({ dataset })` before any request (PORTS.md card 114); add it to the `GATED` list in `scripts/lib/write-gate.test.mjs`. `npm run seed` goes through the same gate.
- **On the `production` dataset `--apply` is not enough.** `sanity-lib` exits at import, before any request, unless the same command also sets `NCS_PRODUCTION_WRITE=yes` in the process environment: `NCS_PRODUCTION_WRITE=yes node scripts/x.mjs --apply` (PowerShell: `$env:NCS_PRODUCTION_WRITE='yes'; node scripts/x.mjs --apply; Remove-Item Env:NCS_PRODUCTION_WRITE`). It is read from `process.env` directly, never from `.env`, so it cannot be set once and forgotten. A delegated agent may set it, but only under the write protocol, in this order: back up first (`sanity dataset export production <file> --raw`, saved outside the repo), do a dry run and read its output, run the write with `--apply` plus the variable set in the same command, then verify. The variable never goes in `.env`, a shell profile or a scheduled CI job. Every site in the family writes to `production` (none has a scratch dataset), so in practice every write needs it.
- **Test a guard against a dummy host, never against what it guards.** Point the client at `SANITY_API_HOST=https://example.invalid` with a fake project and token (as `scripts/lib/sanity-lib.test.mjs` does), or unit-test the pure check. Running the real write command to "see if the guard stops it" is how a guard gets tested on production.
- **Never put text containing backticks or `$(...)` inside a shell string** (`node -e "..."`, `echo "..."`, a heredoc with an unquoted delimiter). The shell runs what is inside as a command substitution: on 2026-10-04 a markdown plan written through `node -e` quoted a content-load command in backticks, and bash ran it against production. Write such text with the file-writing tool (Write/Edit), then run a script file. Git Bash heredocs also drop backslashes, which is a second reason to write scripts to a file first.
- **Array objects need `_type` and `_key`** in anything a script writes (see the seeding rule in `.claude/rules/scaffold.md`), and `npm run audit:data` checks the result (PORTS.md card 95).

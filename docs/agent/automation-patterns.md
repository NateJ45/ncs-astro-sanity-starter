# Automation patterns

Written 2026-09-18, out of the Stone Steps 50K build. Two shapes came out of that
project that are not about running races at all. Any client whose site shows data from
somewhere else will want one or both of them, and both are the difference between a site
that stays correct on its own and a site that stays correct because somebody remembers.

The rule underneath both: **a yearly touch is a touch that gets forgotten.** A step that
runs once a year, is nobody's job in particular, and produces a page that looks fine
either way will eventually not happen, and the site will be quietly stale for months.
Automating it is cheaper than the reminder.

Templates to copy live in `docs/templates/workflows/`. They are deliberately NOT under
`.github/workflows/`, so this repo does not run them; a fork copies one across, fills in
the names, and commits it.

---

## Pattern 1: import and deploy on change

**When to use it.** The client's real data lives in somebody else's system (a timing
platform, a ticketing platform, a registration system, a spreadsheet API) and the site
has to show it. The alternative is somebody exporting a CSV once a year.

**Worked example.** Stone Steps: race results live on RunSignUp, which publishes them the
same day the timer posts them. `scripts/import-results.mjs` pulls them into Sanity and
`.github/workflows/results-import.yml` runs it. The morning after the race, the results,
the records derived from them, the per-runner pages, the edition count and the weather bar
are all live and nobody touched anything.

### The five things that make it safe

**1. The importer is idempotent, and that is not optional.** Deterministic `_id` values
plus `createOrReplace`, so running it before the data exists does nothing and running it
twice changes nothing. That single property is what lets it run on a schedule at all: a
scheduler that can fire twice, or fire while a previous run is finishing, stops being a
risk.

```js
// One id per source row, derived from the source's own identifier.
{ _id: `result-${row.result_id}`, _type: 'raceResult', ... }
// ... committed in chunks through a transaction of createOrReplace calls.
```

**2. It discovers what exists rather than carrying a list.** The Stone Steps importer
walks the race's own event list (`/rest/race/15282?future_events_only=F`) and derives the
year and the distance from each event. A new running needs no code change, no event id,
and no new year added anywhere. A hardcoded list is a yearly touch wearing a disguise: it
just moves the forgetting from "run the import" to "add 2027 to the array".

**3. The workflow counts before and after, and deploys only when the count moved.** The
site is statically built, so imported data is invisible until a rebuild, and rebuilding on
every scheduled run is waste. Count, import, count, compare.

Two details that are easy to get wrong. The count query needs no token when the dataset is
public, so it is a plain `curl` rather than another Node script. And Sanity commits with
`visibility: 'async'`, so the query index can trail the write by a second or two: the
"after" count polls briefly instead of reading once and concluding nothing changed.

**4. State the limit out loud.** A re-import that CORRECTS an existing row (a fixed time,
a corrected spelling) does not change the count, so it will not trigger a deploy. That is
a real gap, and the workflow header says so in capitals and offers `deploy_anyway` as a
manual input. A workflow that silently skips the deploy you needed is worse than one that
admits when it will.

**5. `concurrency`, and a schedule that is dense around the event and thin the rest of the
year.**

```yaml
concurrency:
  group: results-import
  cancel-in-progress: false
```

Two overlapping imports would race on the same documents and two overlapping deploys would
race on the same Worker. `cancel-in-progress: false` rather than `true`: a half-finished
import is worse than a queued one.

```yaml
schedule:
  - cron: '0 9 * 10,11 *' # daily through the two months around the event
  - cron: '0 9 * * 1' # every Monday, the rest of the year
```

The weekly run is the answer to "what if the source takes three weeks to publish". Without
it, a December posting sits unimported until the next October.

### Credentials, checked in a step and never in an `if:`

A secret cannot be read in a workflow `if:` expression, so a gate job reads them into step
outputs. Missing credentials **warn and skip** rather than failing, which is what makes the
file safe to commit before any of them exist, and safe to inherit in a fork that will never
set them.

---

## Pattern 2: record and bake

**When to use it.** A value the site will need is knowable in advance but only becomes
_true_ later, and once it is true it must not be lost when the source moves on.

**Worked example.** Stone Steps' race-day weather strip. The race date sits on The Race
document in Sanity months ahead, and Dave moves it to next year's date as soon as this
year's race is run. The weather for the day that just happened has to be captured before
that edit erases the only record of it.

### The two halves

**Record: a document, not a field.** Six days after the race date passes, a `raceDay`
document is created for that year. That document is the durable memory. A field on The Race
would be overwritten by the same edit that moves the date.

**Bake: a committed file, written at build time.** `src/data/raceDayWeather.json` holds the
fetched weather and is committed. The page reads the file, not the API, so a visitor never
waits on a third-party archive and the page cannot go blank when that archive is down.

### The rule is pure and tested, because it runs once a year

The decision "has the race happened, is the archive old enough to hold it, and is it
already on file" lives in `scripts/lib/weather.mjs` as `raceDayDue()`, typed by a
`weather.d.mts` beside it so a TypeScript test can import it with no directive. A rule that
only runs once a year, on a GitHub runner, in November, is exactly the rule nobody notices
is wrong.

```js
export function raceDayDue({ raceDate, asOf, knownYears, lagDays = ARCHIVE_LAG_DAYS }) { ... }
```

`asOf` is injected rather than read from the clock, which is what makes it testable at all.
The script exposes it as `--as-of YYYY-MM-DD` so a human can rehearse next November today,
and `--dry-run` so the rehearsal writes nothing.

The `lagDays` margin is its own small lesson: the ERA5 weather archive publishes about five
days behind, and asking sooner returns nulls, which would bake a blank bar into the strip.
Any external archive has a lag. Find out what it is and leave a margin, rather than
retrying a source that is answering correctly with "not yet".

### Failing soft on the network is the whole point

The bake step runs in the deploy, before every build. A weather archive that is down must
never stop a deploy: the script warns, keeps the years it already has, and the next run
tries again.

```js
} catch (err) {
  console.warn(`::warning::weather for ${day.year} not baked: ${err.message}`);
}
```

The same script prints `changed=true|false` and appends it to `$GITHUB_OUTPUT`, so the
import workflow from pattern 1 can fold "the bake found something new" into its own
deploy-or-not decision. That is how the two patterns compose: one workflow, one deploy,
two independent reasons it might be worth doing.

### Where to put the bake step

In the deploy job, before the build, always, on every deploy. Not on a schedule of its own.
It is cheap when there is nothing to do, and a value baked into the build is a value that
cannot be missing from the build.

`docs/templates/workflows/record-and-bake-step.yml` is that block, ready to paste.

---

## What both patterns have in common

- **Idempotent, so a scheduler can be sloppy.** Every write is `createOrReplace` on a
  deterministic id, or a file rewritten from scratch.
- **The decision is a pure function with an injectable clock**, tested in `src/lib/`, not
  an `if:` in YAML.
- **Fails soft on anything outside your control**, and says so with `::warning::` rather
  than swallowing it.
- **The limits are written in the file's own header**, in the words somebody would use
  when the thing does not happen.
- **No new yearly touch is introduced anywhere**, including inside the automation. If a
  pattern needs a year added to an array, it has not finished.

Related: PORTS.md card 48 (the cutover script) and card 49 (these patterns);
`docs/agent/deployment.md` for how a rebuild reaches the live site.

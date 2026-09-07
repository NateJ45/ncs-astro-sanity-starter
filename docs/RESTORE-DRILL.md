<!-- PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file -->

# Restore drill

**A backup nobody has restored is not a backup.** The nightly
`sanity-backup` workflow has been green on every site for months; that proves
the export and encrypt steps work and says nothing about whether a client's
content can be recovered. This is the drill that closes the gap.

Run it **once per site when the site launches**, and again any time the backup
workflow, the Sanity CLI major version, or the passphrase changes. It takes
about ten minutes and touches nothing live.

## What you need

- `BACKUP_PASSPHRASE` for that site (the copy stored **outside** GitHub — GitHub
  never shows a secret twice, and a backup nobody can decrypt is no backup)
- A **write** token, as `SANITY_API_WRITE_TOKEN` or `SANITY_AUTH_TOKEN`. The
  backup itself only needs read, so the workflow's secret may not be enough.
- The site's Sanity project id

Both are read from `.env` at the repo root; nothing needs exporting.

**Create the scratch dataset by hand first.** Creating a dataset is a
project-admin action (`sanity.project.datasets/create`) and a content write
token does not carry it, so `--create` will fail with "Unauthorized - missing
required grant". Make it once at https://www.sanity.io/manage and then omit
`--create`. The script checks the dataset exists before importing and says so
plainly rather than letting the import fail later with "Dataset not found".

**On a plan without private datasets**, the scratch dataset will be public.
That is fine only when the site's production dataset is already public and holds
nothing but website content — presacademy, for instance, exposes the same 51
published documents either way, and drafts stay protected in both. It is NOT
fine for a dataset holding form submissions or member records: a public dataset
is readable by anyone with the project id (which ships in your JS bundle) over a
plain URL, and every field of a published document comes back, including the
ones your templates never render. Drill those against a separate throwaway
project instead.

## The drill

**1. Get the newest artifact.** From the repo:

```bash
gh run list --workflow sanity-backup.yml --limit 1
gh run download <run-id> --name sanity-backup
```

**2. Restore into a scratch dataset.** Never production. The script refuses
production without a deliberately long flag, and this drill never uses it:

```bash
node scripts/restore-dataset.mjs --file sanity-backup-<date>.tar.gz.enc --project <projectId> --dataset restore-drill
```

**3. Check the number, not the exit code.** The script prints the document
count it ended up with. Compare it against production:

```bash
node node_modules/sanity/bin/sanity documents query 'count(*)' --project-id <projectId> --dataset production
```

(`node node_modules/sanity/bin/sanity`, not `./node_modules/.bin/sanity`: the
latter is a POSIX-only path, and on Windows npm writes a `.cmd` shim there that
Node has refused to spawn since the CVE-2024-27980 fix.)

They should be close. Exactly equal is unlikely and not required — the backup
is a snapshot from 07:00 UTC and editors have worked since. A count that is
**zero, or an order of magnitude off, is a failed drill** even though every
command exited 0. That is the entire point of the exercise.

Better than eyeballing the totals, diff the ids and look at what is actually
missing, so a small gap is explained rather than assumed to be drift:

```
*._id     // run against both datasets, with your token, and compare the sets
```

The first drill (presacademy, 2026-09-06) came back 112 against 113. The single
missing document was `_.schemas.churchstarter`, a deployed-schema manifest
rather than content: every content document restored and nothing spurious
appeared. That is a pass. "One off, near enough" would have been a guess.

**4. Look at the content.** Point a Studio at the scratch dataset, or query a
document you recognise. Assets are the part most likely to be quietly missing:

```bash
node node_modules/sanity/bin/sanity documents query '*[_type=="sanity.imageAsset"][0..2]{url}' \
  --project-id <projectId> --dataset restore-drill
```

**5. Clean up.**

```bash
node node_modules/sanity/bin/sanity dataset delete restore-drill --project-id <projectId>
```

**6. Record it.** Add the date to the client note's decision log. An untested
backup and one tested eleven months ago are different things, and only the log
tells them apart.

## If the drill fails

Do not delete anything. The failure is the most valuable output this system has
produced, and it is recoverable while production is still healthy — which is
exactly why the drill happens on a calm day rather than during an incident.
Common causes, in the order they are worth checking:

- **Wrong passphrase.** `openssl` reports `bad decrypt`. Check the copy stored
  outside GitHub before assuming the backup is corrupt.
- **Read token used for the import.** The export needs read; the restore needs
  write. Different failure, same-looking permission error.
- **Assets missing.** The export includes assets by default; if a site ever adds
  `--no-assets` to save minutes, this drill is how you find out what that cost.

## Off-site copies

The workflow also pushes the encrypted tarball to R2 when `BACKUP_R2_BUCKET` is
set, because Actions artifacts expire after 90 days and live in the same GitHub
account as the repos they protect. Losing the account loses both. To drill
against the off-site copy instead of the artifact:

```bash
npx wrangler r2 object get "<bucket>/sanity/<site>/<date>.tar.gz.enc" \
  --file sanity-backup-<date>.tar.gz.enc --remote
```

then continue from step 2.

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
- `SANITY_AUTH_TOKEN` with **write** access (the backup itself only needs read)
- The site's Sanity project id

## The drill

**1. Get the newest artifact.** From the repo:

```bash
gh run list --workflow sanity-backup.yml --limit 1
gh run download <run-id> --name sanity-backup
```

**2. Restore into a scratch dataset.** Never production. The script refuses
production without a deliberately long flag, and this drill never uses it:

```bash
BACKUP_PASSPHRASE='...' SANITY_AUTH_TOKEN='...' \
  node scripts/restore-dataset.mjs \
  --file sanity-backup-<date>.tar.gz.enc \
  --project <projectId> \
  --dataset restore-drill \
  --create
```

**3. Check the number, not the exit code.** The script prints the document
count it ended up with. Compare it against production:

```bash
./node_modules/.bin/sanity documents query 'count(*)' --project-id <projectId> --dataset production
```

They should be close. Exactly equal is unlikely and not required — the backup
is a snapshot from 07:00 UTC and editors have worked since. A count that is
**zero, or an order of magnitude off, is a failed drill** even though every
command exited 0. That is the entire point of the exercise.

**4. Look at the content.** Point a Studio at the scratch dataset, or query a
document you recognise. Assets are the part most likely to be quietly missing:

```bash
./node_modules/.bin/sanity documents query '*[_type=="sanity.imageAsset"][0..2]{url}' \
  --project-id <projectId> --dataset restore-drill
```

**5. Clean up.**

```bash
./node_modules/.bin/sanity dataset delete restore-drill --project-id <projectId>
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

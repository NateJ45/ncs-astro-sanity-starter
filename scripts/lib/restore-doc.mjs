// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// restore-doc.mjs (lib) - the pure half of scripts/restore-doc.mjs
// =============================================================================
// Added 2026-10-18 (PORTS.md card 111). Sanity's free plan keeps three days of
// history and only administrators can use it, so "undo a change from earlier in
// the week" means taking one document out of the nightly backup
// (sanity-backup.yml) and writing it back as a DRAFT for the editor to review.
//
// Everything here is pure and dependency-free so scripts/lib/restore-doc.test.mjs
// can check it: the backup decryption (the same openssl format as
// restore-dataset.mjs), a minimal tar reader, finding a document in the
// export's data.ndjson, the diff summary, and the one mutation the script
// writes. The network, the GitHub artifact download and the write gate live in
// the script.
// =============================================================================
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

/**
 * Decrypt a backup made by sanity-backup.yml
 * (`openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt`). Same format and
 * reasoning as restore-dataset.mjs: "Salted__" + 8-byte salt + ciphertext,
 * key and IV from PBKDF2-SHA256. Returns the gzip bytes.
 */
export function decryptBackup(buf, passphrase, iterations = 200000) {
  if (buf.subarray(0, 8).toString() !== 'Salted__') {
    throw new Error('not an openssl salted file; is it the backup artifact?');
  }
  const keyiv = pbkdf2Sync(passphrase, buf.subarray(8, 16), iterations, 48, 'sha256');
  const d = createDecipheriv('aes-256-cbc', keyiv.subarray(0, 32), keyiv.subarray(32, 48));
  let out;
  try {
    out = Buffer.concat([d.update(buf.subarray(16)), d.final()]);
  } catch {
    throw new Error('decryption failed, almost certainly the wrong BACKUP_PASSPHRASE.');
  }
  if (!(out[0] === 0x1f && out[1] === 0x8b)) {
    throw new Error('decrypted, but the result is not a gzip archive.');
  }
  return out;
}

/**
 * The bytes of the first file in a tar archive whose name ends with `suffix`,
 * or null. Ustar only (what `sanity dataset export` writes); enough to read one
 * file without a dependency. Handles the ustar name prefix and pax headers by
 * skipping them.
 */
export function readTarFile(tar, suffix) {
  let off = 0;
  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512);
    if (header.every((b) => b === 0)) return null; // end of archive
    const str = (start, len) =>
      header
        .subarray(start, start + len)
        .toString('utf8')
        .replace(/\0.*$/s, '');
    const name = str(0, 100);
    const prefix = str(345, 155);
    const full = prefix ? `${prefix}/${name}` : name;
    const size = parseInt(str(124, 12).trim() || '0', 8);
    const type = String.fromCharCode(header[156] || 48);
    const start = off + 512;
    if ((type === '0' || type === '\0') && full.endsWith(suffix)) {
      return tar.subarray(start, start + size);
    }
    off = start + Math.ceil(size / 512) * 512;
  }
  return null;
}

/** data.ndjson out of the gzip bytes of a dataset export. */
export function exportNdjson(gz) {
  const data = readTarFile(gunzipSync(gz), 'data.ndjson');
  if (!data) throw new Error('the backup has no data.ndjson; is it a Sanity dataset export?');
  return data.toString('utf8');
}

/** The published id ("drafts.x" and "x" both give "x"). */
export const publishedId = (id) => String(id).replace(/^drafts\./, '');

/**
 * The document from the backup: the published copy if the backup has one,
 * else its draft. Returns { doc, wasDraft } or null.
 */
export function findInExport(ndjson, id) {
  const want = publishedId(id);
  let draft = null;
  for (const line of ndjson.split('\n')) {
    if (!line.includes(want)) continue; // cheap skip before parsing
    let doc;
    try {
      doc = JSON.parse(line);
    } catch {
      continue;
    }
    if (doc._id === want) return { doc, wasDraft: false };
    if (doc._id === `drafts.${want}`) draft = doc;
  }
  return draft ? { doc: draft, wasDraft: true } : null;
}

const SYSTEM = new Set(['_id', '_rev', '_createdAt', '_updatedAt', '_type']);

/** A short, single-line preview of a value for the diff summary. */
export function preview(value, max = 60) {
  if (value === undefined) return '(empty)';
  let s;
  if (typeof value === 'string') s = JSON.stringify(value);
  else if (Array.isArray(value)) s = `${value.length} item${value.length === 1 ? '' : 's'}`;
  else if (value && typeof value === 'object') {
    s = typeof value._type === 'string' ? `(${value._type})` : '(group of fields)';
  } else s = String(value);
  return s.length > max ? `${s.slice(0, max - 3)}...` : s;
}

/**
 * Which top-level fields differ between the document as it is now and the
 * backup copy. Sorted by field name. `current` may be null (the document is
 * gone), in which case every backup field is "restored".
 */
export function diffSummary(current, backup) {
  const keys = new Set([...Object.keys(current ?? {}), ...Object.keys(backup ?? {})]);
  const rows = [];
  for (const k of [...keys].sort()) {
    if (SYSTEM.has(k)) continue;
    const now = current ? current[k] : undefined;
    const then = backup ? backup[k] : undefined;
    if (JSON.stringify(now) === JSON.stringify(then)) continue;
    const change = now === undefined ? 'restored' : then === undefined ? 'cleared' : 'changed';
    rows.push({ field: k, change, now: preview(now), then: preview(then) });
  }
  return rows;
}

/**
 * The one mutation the script writes: the backup copy as a DRAFT of the same
 * document, so nothing changes on the website until the editor reviews it and
 * presses Publish. API-assigned fields and any schedule are dropped (a restored
 * draft must never publish itself because an old publishAt had passed).
 */
export function restoreMutation(backupDoc) {
  const { _rev, _createdAt, _updatedAt, publishAt, ...content } = backupDoc;
  void _rev;
  void _createdAt;
  void _updatedAt;
  void publishAt;
  return { createOrReplace: { ...content, _id: `drafts.${publishedId(backupDoc._id)}` } };
}

/** "2026-10-17" out of "sanity-backup-2026-10-17-docs.tar.gz.enc", or null. */
export function backupDate(fileName) {
  const m = /sanity-backup-(\d{4}-\d{2}-\d{2})/.exec(fileName);
  return m ? m[1] : null;
}

// -----------------------------------------------------------------------------
// Earlier versions in the Studio (PORTS.md card 124)
// -----------------------------------------------------------------------------
// The Studio's "Earlier versions" panel asks GitHub Actions to run this script
// (.github/workflows/restore-doc.yml), because only CI holds BACKUP_PASSPHRASE.
// The run's log is how the answer gets back, and on a PUBLIC repository anyone
// can read a run's log. So in CI the script runs with --no-values: it says
// WHICH fields differ and how many items a list had, never what any field
// said. These helpers are that value-free half.

/** One field that differs, without its words: safe for a public log. */
export function changeSummary(current, backup) {
  const count = (v) => (Array.isArray(v) ? v.length : null);
  const keys = new Set([...Object.keys(current ?? {}), ...Object.keys(backup ?? {})]);
  const rows = [];
  for (const k of [...keys].sort()) {
    if (SYSTEM.has(k)) continue;
    const now = current ? current[k] : undefined;
    const then = backup ? backup[k] : undefined;
    if (JSON.stringify(now) === JSON.stringify(then)) continue;
    const change = now === undefined ? 'restored' : then === undefined ? 'cleared' : 'changed';
    rows.push({ field: k, change, then: count(then), now: count(now) });
  }
  return rows;
}

/**
 * Why a backup copy must not be written back, or null. Sanity's own system
 * documents (asset records, roles, anything with an id starting "_.") are never
 * restored one at a time.
 */
export function restoreRefusal(doc) {
  if (!doc || typeof doc._id !== 'string' || typeof doc._type !== 'string') {
    return 'that backup copy has no id or type.';
  }
  if (publishedId(doc._id).startsWith('_')) {
    return "that is one of Sanity's own system documents; it is never restored on its own.";
  }
  if (/^(sanity|system)\./.test(doc._type)) {
    return `"${doc._type}" is one of Sanity's own document types; it is never restored on its own.`;
  }
  return null;
}

/** Same document content, ignoring the API fields. */
export function sameContent(a, b) {
  return changeSummary(a, b).length === 0;
}

/**
 * The line the Studio's endpoint reads back out of the run log
 * (src/lib/earlier-versions.ts parseMarker). One line, JSON, value-free.
 */
export function markerLine(name, payload) {
  return `${name} ${JSON.stringify(payload)}`;
}

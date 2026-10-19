// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// restore-doc's pure half (scripts/lib/restore-doc.mjs, PORTS.md card 111): decrypt,
// read the tar, find the document, the diff summary and the draft-only mutation.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import {
  backupDate,
  decryptBackup,
  diffSummary,
  exportNdjson,
  findInExport,
  preview,
  publishedId,
  readTarFile,
  restoreMutation,
} from './restore-doc.mjs';

/** A one-file ustar archive, enough for the reader. */
function tarOf(files) {
  const parts = [];
  for (const [name, body] of files) {
    const data = Buffer.from(body);
    const h = Buffer.alloc(512);
    h.write(name, 0, 100, 'utf8');
    h.write('0000644\0', 100);
    h.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124);
    h.write('0', 156);
    h.write('ustar\0', 257);
    parts.push(h, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return Buffer.concat(parts);
}

/** Encrypt the way sanity-backup.yml's openssl step does, with few iterations. */
function encrypt(plain, pass, iter) {
  const salt = randomBytes(8);
  const keyiv = pbkdf2Sync(pass, salt, iter, 48, 'sha256');
  const c = createCipheriv('aes-256-cbc', keyiv.subarray(0, 32), keyiv.subarray(32, 48));
  return Buffer.concat([Buffer.from('Salted__'), salt, c.update(plain), c.final()]);
}

const ndjson = [
  { _id: 'aboutPage', _type: 'aboutPage', _rev: 'r1', title: 'About us', intro: 'Old words' },
  { _id: 'drafts.sermon-1', _type: 'sermon', title: 'Draft only' },
  { _id: 'notice-1', _type: 'announcement', message: 'Snow', publishAt: '2026-10-01T00:00:00Z' },
]
  .map((d) => JSON.stringify(d))
  .join('\n');

describe('reading a backup', () => {
  it('decrypts, unzips and finds data.ndjson', () => {
    const gz = gzipSync(tarOf([['export-2026/data.ndjson', ndjson]]));
    const enc = encrypt(gz, 'secret', 10);
    const out = decryptBackup(enc, 'secret', 10);
    assert.equal(exportNdjson(out), ndjson);
  });

  it('a wrong passphrase says so plainly', () => {
    const enc = encrypt(gzipSync(Buffer.from('x')), 'right', 10);
    assert.throws(() => decryptBackup(enc, 'wrong', 10), /passphrase|gzip/i);
  });

  it('refuses a file that is not an openssl backup', () => {
    assert.throws(() => decryptBackup(Buffer.from('plain text here'), 'x', 10), /salted/);
  });

  it('skips other files in the archive', () => {
    const tar = tarOf([
      ['export/assets.json', '{}'],
      ['export/data.ndjson', 'hello'],
    ]);
    assert.equal(readTarFile(tar, 'data.ndjson')?.toString(), 'hello');
    assert.equal(readTarFile(tar, 'missing.txt'), null);
  });
});

describe('finding the document', () => {
  it('prefers the published copy, accepts a drafts. id', () => {
    assert.equal(findInExport(ndjson, 'aboutPage')?.doc.title, 'About us');
    assert.equal(findInExport(ndjson, 'drafts.aboutPage')?.wasDraft, false);
  });
  it('falls back to the draft when that is all the backup has', () => {
    const hit = findInExport(ndjson, 'sermon-1');
    assert.equal(hit?.wasDraft, true);
    assert.equal(hit?.doc.title, 'Draft only');
  });
  it('null when the backup never had it', () => {
    assert.equal(findInExport(ndjson, 'nope'), null);
  });
  it('publishedId strips the drafts prefix only', () => {
    assert.equal(publishedId('drafts.a.b'), 'a.b');
    assert.equal(publishedId('a'), 'a');
  });
});

describe('the diff summary', () => {
  it('lists changed, restored and cleared fields, never system fields', () => {
    const now = { _id: 'x', _rev: 'new', title: 'New', extra: 'added since', same: 1 };
    const then = { _id: 'x', _rev: 'old', title: 'Old', intro: 'was here', same: 1 };
    assert.deepEqual(
      diffSummary(now, then).map((r) => [r.field, r.change]),
      [
        ['extra', 'cleared'],
        ['intro', 'restored'],
        ['title', 'changed'],
      ],
    );
  });
  it('a deleted document restores every field', () => {
    assert.deepEqual(
      diffSummary(null, { _id: 'x', a: 1, b: 'two' }).map((r) => r.change),
      ['restored', 'restored'],
    );
  });
  it('identical copies give no rows', () => {
    assert.equal(diffSummary({ a: [1, 2] }, { a: [1, 2] }).length, 0);
  });
  it('previews stay short and plain', () => {
    assert.equal(preview(undefined), '(empty)');
    assert.equal(preview([1, 2, 3]), '3 items');
    assert.equal(preview({ _type: 'image' }), '(image)');
    assert.ok(preview('x'.repeat(200)).length <= 60);
  });
});

describe('the write', () => {
  it('is a draft of the same document, without API fields or a schedule', () => {
    const m = restoreMutation({
      _id: 'notice-1',
      _type: 'announcement',
      _rev: 'r',
      _updatedAt: 't',
      _createdAt: 't',
      message: 'Snow',
      publishAt: '2026-10-01T00:00:00Z',
    });
    assert.deepEqual(m, {
      createOrReplace: { _id: 'drafts.notice-1', _type: 'announcement', message: 'Snow' },
    });
  });
  it('a draft from the backup stays a draft', () => {
    assert.equal(
      restoreMutation({ _id: 'drafts.s', _type: 'sermon' }).createOrReplace._id,
      'drafts.s',
    );
  });
  it('reads the date out of a backup file name', () => {
    assert.equal(backupDate('sanity-backup-2026-10-17-docs.tar.gz.enc'), '2026-10-17');
    assert.equal(backupDate('other.enc'), null);
  });
});

// Card 125: the Studio's "Earlier versions" runs this script in CI, where the
// log is public, so it must be able to say what differs without the words.
import {
  changeSummary as valueFree,
  markerLine,
  restoreRefusal,
  sameContent,
} from './restore-doc.mjs';

describe('earlier versions (card 125)', () => {
  it('the value-free summary names fields and list lengths only', () => {
    const rows = valueFree(
      { _id: 'a', _type: 'page', title: 'Now words', sections: [1, 2, 3] },
      { _id: 'a', _type: 'page', title: 'Old words', sections: [1] },
    );
    assert.deepEqual(rows, [
      { field: 'sections', change: 'changed', then: 1, now: 3 },
      { field: 'title', change: 'changed', then: null, now: null },
    ]);
    assert.ok(!JSON.stringify(rows).includes('words'));
  });
  it('same content ignores the API fields', () => {
    assert.ok(sameContent({ _id: 'a', _rev: '1', t: 1 }, { _id: 'a', _rev: '2', t: 1 }));
    assert.ok(!sameContent({ t: 1 }, { t: 2 }));
  });
  it("never restores Sanity's own documents", () => {
    assert.equal(restoreRefusal({ _id: 'aboutPage', _type: 'aboutPage' }), null);
    assert.ok(restoreRefusal({ _id: '_.groups.administrator', _type: 'system.group' }));
    assert.ok(restoreRefusal({ _id: 'image-abc', _type: 'sanity.imageAsset' }));
    assert.ok(restoreRefusal({ _type: 'page' }));
  });
  it('the marker is one line the endpoint can read back', () => {
    const line = markerLine('NCS_RESTORE', { id: 'a', applied: true, fields: 2 });
    assert.equal(line, 'NCS_RESTORE {"id":"a","applied":true,"fields":2}');
    assert.ok(!line.includes('\n'));
  });
});

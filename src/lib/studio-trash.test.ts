// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Trash (src/lib/studio-trash.ts): what goes in, and that it comes back exactly
// where it was, published and unpublished copies separately.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrashRecord,
  parseTrashPayload,
  publishedId,
  referrersMessage,
  restoreDocs,
  trashTitle,
  TRASH_TYPE,
} from './studio-trash.ts';

const NOW = '2026-10-17T12:00:00.000Z';

describe('trash', () => {
  it('keeps the published copy and the draft apart, without system fields', () => {
    const published = { _id: 'a1', _type: 'announcement', _rev: 'r1', title: 'Picnic' };
    const draft = { _id: 'drafts.a1', _type: 'announcement', _rev: 'r2', title: 'Picnic (new)' };
    const rec = buildTrashRecord(
      'announcement',
      'drafts.a1',
      published,
      draft,
      NOW,
      'Announcement',
    );
    assert.equal(rec._type, TRASH_TYPE);
    assert.equal(rec.originalId, 'a1');
    assert.equal(rec.title, 'Picnic (new)');
    assert.equal(rec.wasPublished, true);
    const back = parseTrashPayload(rec.payload, rec.originalId);
    assert.equal(back.published?._id, 'a1');
    assert.equal(back.draft?._id, 'drafts.a1');
    assert.equal(back.published?._rev, undefined);
    assert.deepEqual(
      restoreDocs(back).map((d) => d._id),
      ['a1', 'drafts.a1'],
    );
  });

  it('a never-published item comes back as a draft only', () => {
    const rec = buildTrashRecord('faqItem', 'b', null, { _id: 'drafts.b', _type: 'faqItem' }, NOW);
    assert.equal(rec.wasPublished, false);
    assert.deepEqual(
      restoreDocs(parseTrashPayload(rec.payload, 'b')).map((d) => d._id),
      ['drafts.b'],
    );
  });

  it('re-pins ids from originalId, never from the stored text', () => {
    const payload = JSON.stringify({ published: { _id: 'evil', _type: 'x' }, draft: null });
    assert.equal(parseTrashPayload(payload, 'drafts.good').published?._id, 'good');
  });

  it('refuses an empty move, names things kindly, and says who still uses it', () => {
    assert.throws(() => buildTrashRecord('x', 'x', null, null, NOW));
    assert.equal(trashTitle({}, 'Announcement'), 'Announcement with no name');
    assert.equal(trashTitle(null), 'Something with no name');
    assert.equal(publishedId('drafts.z'), 'z');
    assert.equal(referrersMessage([]), null);
    const msg = referrersMessage([{ _id: 'h', _type: 'homePage', name: 'Home' }]) ?? '';
    assert.match(msg, /^Something else uses this: Home\./);
    assert.ok(!msg.includes('—'));
  });
});

// scaffold-file: documents
// The documents library helpers (src/lib/documents.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentDocuments,
  fileLabel,
  humanSize,
  isCurrent,
  today,
  type LibraryDocument,
} from './documents.ts';

const NOW = new Date('2026-10-21T16:00:00Z');
const file = { url: 'https://cdn.example/f.pdf', size: 245_760, extension: 'pdf' };
const doc = (over: Partial<LibraryDocument>): LibraryDocument => ({
  _id: over.title ?? 'x',
  title: 'T',
  category: 'Forms',
  date: '2026-10-01',
  file,
  ...over,
});

test('today is a calendar day in the zone asked for', () => {
  // 02:30 UTC on the 22nd is still the 21st in New York.
  const late = new Date('2026-10-22T02:30:00Z');
  assert.equal(today(late), '2026-10-22');
  assert.equal(today(late, 'America/New_York'), '2026-10-21');
});

test('current: needs a file, and the last day still counts', () => {
  assert.equal(isCurrent(doc({}), NOW), true);
  assert.equal(isCurrent(doc({ file: null }), NOW), false);
  assert.equal(isCurrent(doc({ file: { url: '' } }), NOW), false);
  assert.equal(isCurrent(doc({ expires: '2026-10-21' }), NOW), true, 'last day shows');
  assert.equal(isCurrent(doc({ expires: '2026-10-20' }), NOW), false, 'gone the next morning');
});

test('a list is newest first, filtered by group, expired ones dropped, and capped', () => {
  const list = [
    doc({ title: 'Old form', date: '2026-01-01' }),
    doc({ title: 'New form', date: '2026-09-01' }),
    doc({ title: 'Report', category: 'Reports', date: '2026-10-01' }),
    doc({ title: 'Expired', date: '2026-10-10', expires: '2026-10-11' }),
    doc({ title: 'No file', file: null }),
  ];
  assert.deepEqual(
    currentDocuments(list, NOW).map((d) => d.title),
    ['Report', 'New form', 'Old form'],
  );
  assert.deepEqual(
    currentDocuments(list, NOW, ' forms ').map((d) => d.title),
    ['New form', 'Old form'],
    'case and spaces do not split a group',
  );
  assert.deepEqual(
    currentDocuments(list, NOW, '', 1).map((d) => d.title),
    ['Report'],
  );
  assert.equal(currentDocuments(list, NOW, 'Nothing here').length, 0);
});

test('the same date falls back to the title', () => {
  const list = [doc({ title: 'B', date: '2026-10-01' }), doc({ title: 'A', date: '2026-10-01' })];
  assert.deepEqual(
    currentDocuments(list, NOW).map((d) => d.title),
    ['A', 'B'],
  );
});

test('file labels say what is about to download', () => {
  assert.equal(fileLabel(file), 'PDF, 240 KB');
  assert.equal(fileLabel({ originalFilename: 'minutes.DOCX' }), 'DOCX');
  assert.equal(fileLabel(null), '');
  assert.equal(humanSize(500), '500 bytes');
  assert.equal(humanSize(3 * 1024 * 1024), '3 MB');
  assert.equal(humanSize(1.5 * 1024 * 1024), '1.5 MB');
});

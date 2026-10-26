// Safe to edit by hand
// Pins withSiteGroups() (src/lib/insert-groups.ts, PORTS.md card 173).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withSiteGroups } from './insert-groups.ts';

describe('withSiteGroups', () => {
  const base = [
    { name: 'basics', title: 'Basics', of: ['heroSection', 'richTextSection'] },
    { name: 'media', title: 'Media', of: ['gallerySection'] },
  ];

  it('adds types to a group that exists and appends a new group', () => {
    const out = withSiteGroups(base, [
      { name: 'basics', title: 'Basics', of: ['columnsSection', 'heroSection'] },
      { name: 'dates', title: 'Events and notices', of: ['noticeSection'] },
    ]);
    assert.deepEqual(
      out.map((g) => [g.name, g.of]),
      [
        ['basics', ['heroSection', 'richTextSection', 'columnsSection']],
        ['media', ['gallerySection']],
        ['dates', ['noticeSection']],
      ],
    );
  });

  it('changes neither input', () => {
    const extra = [{ name: 'media', title: 'Media', of: ['videoSection'] }];
    withSiteGroups(base, extra);
    assert.deepEqual(base[1].of, ['gallerySection']);
    assert.deepEqual(extra[0].of, ['videoSection']);
  });
});

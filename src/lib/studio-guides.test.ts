// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Gate on the Studio's Help & Guide content.
//
// The guides are prose, so nothing else can check them. These are the mistakes
// that would ship silently: a guide filed under a category the desk does not
// render (it would simply vanish from the menu), two guides sharing a slug (the
// second would never open, because the pane id collides), a "See also" pointing
// at a guide that no longer exists, and an em-dash, which this project bans in
// anything a visitor or an editor reads.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { guides, GUIDE_CATEGORIES } from '../sanity/guides/content.ts';

describe('Studio guides', () => {
  it('every guide has a unique slug', () => {
    const seen = new Set<string>();
    for (const g of guides) {
      assert.ok(!seen.has(g.slug), `duplicate slug: ${g.slug}`);
      seen.add(g.slug);
    }
  });

  it('every guide sits in a category the desk renders', () => {
    for (const g of guides) {
      assert.ok(
        (GUIDE_CATEGORIES as readonly string[]).includes(g.category),
        `${g.slug} is filed under "${g.category}", which the desk does not list`,
      );
    }
  });

  it('every category has at least one guide', () => {
    // An empty category renders as a divider with nothing under it.
    for (const c of GUIDE_CATEGORIES) {
      assert.ok(
        guides.some((g) => g.category === c),
        `category "${c}" has no guides`,
      );
    }
  });

  it('every "See also" names a guide that exists', () => {
    const titles = new Set(guides.map((g) => g.title));
    for (const g of guides) {
      for (const b of g.body) {
        if (b.kind !== 'seealso') continue;
        for (const ref of b.items) {
          assert.ok(
            [...titles].some((t) => t.includes(ref) || ref.includes(t)),
            `${g.slug} points at "${ref}", which is not a guide title`,
          );
        }
      }
    }
  });

  it('has no em-dashes anywhere in the prose', () => {
    for (const g of guides) {
      const text = [g.title, g.lead, ...g.body.flatMap(blockText)].join(' ');
      assert.ok(!text.includes('\u2014'), `${g.slug} contains an em-dash`);
    }
  });

  it('every guide has a lead and at least one block', () => {
    for (const g of guides) {
      assert.ok(g.lead.trim().length > 0, `${g.slug} has no lead`);
      assert.ok(g.body.length > 0, `${g.slug} has an empty body`);
      assert.ok(g.icon.trim().length > 0, `${g.slug} has no icon`);
    }
  });
});

/** Every string a block renders, so the prose checks can see all of it. */
function blockText(b: (typeof guides)[number]['body'][number]): string[] {
  switch (b.kind) {
    case 'h':
    case 'p':
      return [b.text];
    case 'steps':
    case 'bullets':
    case 'seealso':
      return b.items;
    case 'path':
      return b.items;
    case 'callout':
      return [b.title ?? '', b.text];
    default:
      return [];
  }
}

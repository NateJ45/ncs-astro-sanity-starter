// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// "Post a photo" on Quick update (PORTS.md card 125): the checks, the shrink,
// the gallery query and choices, the photo value and the patch path.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GALLERY,
  fitWithin,
  galleryChoices,
  galleryPath,
  galleryQuery,
  gallerySpec,
  photoFormErrors,
  photoValue,
  shouldRedraw,
} from './photo-post.ts';

describe('the form checks', () => {
  const ok = { hasPhoto: true, alt: 'The choir singing at Easter', target: 'home:k1', title: '' };

  it('a photo, a description and a place are enough for a gallery', () => {
    assert.deepEqual(photoFormErrors(ok), {});
  });
  it('the description is required', () => {
    assert.ok(photoFormErrors({ ...ok, alt: '  ' }).alt);
  });
  it('a file name or a number is not a description', () => {
    for (const alt of ['IMG_2041.jpg', 'photo', 'DSC0042', '1234', 'PXL_20261018.heic']) {
      assert.ok(photoFormErrors({ ...ok, alt }).alt, alt);
    }
    assert.deepEqual(photoFormErrors({ ...ok, alt: 'Image of the new roof' }), {});
  });
  it('no photo, no place: both said', () => {
    const e = photoFormErrors({ hasPhoto: false, alt: 'Choir', target: '', title: '' });
    assert.ok(e.photo);
    assert.ok(e.target);
  });
  it('a new post needs a title', () => {
    assert.ok(photoFormErrors({ ...ok, target: 'post' }).title);
    assert.deepEqual(photoFormErrors({ ...ok, target: 'post', title: 'Harvest supper' }), {});
  });
});

describe('the shrink', () => {
  it('keeps the long side at 2560 or less and never enlarges', () => {
    assert.deepEqual(fitWithin(4032, 3024), { width: 2560, height: 1920 });
    assert.deepEqual(fitWithin(3024, 4032), { width: 1920, height: 2560 });
    assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
    assert.deepEqual(fitWithin(0, 600), { width: 0, height: 0 });
  });
  it('redraws camera photos (dropping EXIF), leaves GIFs and SVGs alone', () => {
    for (const t of ['image/jpeg', 'image/heic', 'image/webp', 'image/png'])
      assert.ok(shouldRedraw(t), t);
    for (const t of ['image/gif', 'image/svg+xml', '']) assert.ok(!shouldRedraw(t), t);
  });
});

describe('the galleries', () => {
  it('the query names only checked fields and takes the types as a parameter', () => {
    const q = galleryQuery(DEFAULT_GALLERY);
    assert.match(q, /_type in \$types/);
    assert.match(q, /pageBuilder\[_type == "gallerySection"\]/);
    assert.match(q, /count\(images\)/);
  });
  it('refuses a field name that is not a plain name', () => {
    assert.throws(() => gallerySpec({ field: 'images] | *[' }));
    assert.throws(() => gallerySpec({ captionField: 'a b' }));
    assert.doesNotThrow(() => gallerySpec({ captionField: null }));
  });
  it('labels each gallery with its page, drafts and singletons included', () => {
    const choices = galleryChoices(
      [
        {
          _id: 'drafts.home',
          _type: 'homePage',
          title: null,
          galleries: [{ _key: 'g1', heading: 'Sunday', count: 12 }],
        },
        {
          _id: 'page-1',
          _type: 'page',
          title: 'Youth',
          galleries: [
            { _key: 'a', heading: '', count: 1 },
            { _key: 'b', heading: null, count: 0 },
            { _key: 'bad key!', heading: 'x', count: 1 },
          ],
        },
      ],
      (t) => (t === 'homePage' ? 'Home' : t),
    );
    assert.deepEqual(
      choices.map((c) => [c.docId, c.sectionKey, c.label]),
      [
        ['home', 'g1', 'Home: Sunday (12 photos)'],
        ['page-1', 'a', 'Youth: Gallery 1 (1 photo)'],
        ['page-1', 'b', 'Youth: Gallery 2 (0 photos)'],
      ],
    );
  });
});

describe('the write', () => {
  it('appends to one gallery by its key', () => {
    assert.equal(galleryPath(DEFAULT_GALLERY, 'g1'), 'pageBuilder[_key=="g1"].images');
    assert.throws(() => galleryPath(DEFAULT_GALLERY, 'g1"]'));
  });
  it('the photo carries its description and, when given, its caption', () => {
    assert.deepEqual(photoValue(DEFAULT_GALLERY, 'image-abc-10x10-jpg', ' Choir ', '', 'k1'), {
      _type: 'image',
      _key: 'k1',
      asset: { _type: 'reference', _ref: 'image-abc-10x10-jpg' },
      alt: 'Choir',
    });
    assert.equal(
      photoValue(DEFAULT_GALLERY, 'image-a', 'Choir', 'Easter 2026', 'k2').caption,
      'Easter 2026',
    );
    assert.equal(
      photoValue({ altField: 'alt', captionField: null }, 'image-a', 'Choir', 'x', 'k3').caption,
      undefined,
    );
  });
});

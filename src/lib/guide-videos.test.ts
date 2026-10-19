// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Guide videos by key (card 137), and this site's clip registry
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GUIDE_VIDEOS } from '../sanity/guides/videos.ts';
import { guides } from '../sanity/guides/content.ts';
import {
  clipLength,
  playableGuides,
  resolveVideo,
  videoRegistryProblems,
  type GuideVideoData,
} from './guide-videos.ts';

const PUBLIC = new URL('../../public', import.meta.url);
/** A clip people open on a phone: past this, record shorter. */
const MAX_BYTES = 8 * 1024 * 1024;

const reg: Record<string, GuideVideoData> = {
  'post-a-notice': {
    title: 'Put up a notice',
    src: '/guide-videos/post-a-notice.mp4',
    poster: '/guide-videos/post-a-notice.jpg',
    captions: '/guide-videos/post-a-notice.vtt',
  },
};

describe('resolveVideo', () => {
  it('finds a key in the registry, and nothing for an unknown key', () => {
    assert.equal(resolveVideo('post-a-notice', reg)?.kind, 'clip');
    assert.equal(resolveVideo('not-there', reg), null);
  });
  it('still plays card 115 paths and links', () => {
    assert.equal(resolveVideo('/guides/x.mp4', reg)?.kind, 'file');
    assert.equal(resolveVideo('https://youtu.be/dQw4w9WgXcQ', reg)?.kind, 'embed');
    assert.equal(resolveVideo('javascript:alert(1)', reg), null);
  });
  it('lists only guides with something to play', () => {
    const g = [{ video: 'post-a-notice' }, { video: 'nope' }, {}];
    assert.equal(playableGuides(g, reg).length, 1);
  });
  it('writes lengths as m:ss', () => {
    assert.equal(clipLength(65), '1:05');
    assert.equal(clipLength(undefined), '');
  });
});

describe("this site's clips", () => {
  const exists = (p: string) => fs.existsSync(new URL(`.${p}`, PUBLIC.href + '/'));
  it('every entry has its files, a poster and captions', () => {
    assert.deepEqual(videoRegistryProblems(GUIDE_VIDEOS, exists), []);
  });
  it('every clip is light enough for a phone', () => {
    for (const [k, c] of Object.entries(GUIDE_VIDEOS)) {
      const f = new URL(`.${c.src}`, PUBLIC.href + '/');
      if (fs.existsSync(f)) assert.ok(fs.statSync(f).size <= MAX_BYTES, `${k}: over 8 MB`);
    }
  });
  it('every guide video key a guide names is in the registry', () => {
    for (const g of guides) {
      const v = (g as { video?: string }).video;
      if (v && /^[a-z0-9][a-z0-9-]*$/.test(v))
        assert.ok(GUIDE_VIDEOS[v], `${g.slug}: no clip "${v}"`);
      for (const b of g.body as { kind: string; key?: string }[]) {
        if (b.kind === 'video')
          assert.ok(b.key && GUIDE_VIDEOS[b.key], `${g.slug}: no clip "${b.key}"`);
      }
    }
  });
});

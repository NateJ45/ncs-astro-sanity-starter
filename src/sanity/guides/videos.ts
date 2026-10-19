// Safe to edit by hand
// =============================================================================
// This site's "Watch how it is done" clips (PORTS.md card 137)
// =============================================================================
// A guide asks for a clip by KEY, as its `video` ('post-a-notice') or as a
// block in its body ({ kind: 'video', key: 'post-a-notice' }), and this file
// says where that clip's files are. The files live in public/guide-videos/ and
// are made by the recorder:
//
//     node tools/tutorial-videos/record.mjs tools/tutorial-videos/scripts/<slug>.json
//
// which prints the entry to paste below. A key with no entry plays nothing
// (the Watch button and the row hide themselves), so a guide never shows a
// broken player. src/lib/guide-videos.test.ts checks every entry (files
// present, a poster and captions, no em-dashes).
//
// Shape of an entry: GuideVideoData in src/lib/guide-videos.ts.
// =============================================================================

import type { GuideVideoData } from '../../lib/guide-videos.ts';

export const GUIDE_VIDEOS: Record<string, GuideVideoData> = {
  // 'post-a-notice': {
  //   title: 'Put up a notice',
  //   src: '/guide-videos/post-a-notice.mp4',
  //   webm: '/guide-videos/post-a-notice.webm',
  //   poster: '/guide-videos/post-a-notice.jpg',
  //   captions: '/guide-videos/post-a-notice.vtt',
  //   duration: 48,
  //   width: 1280,
  //   height: 800,
  // },
};

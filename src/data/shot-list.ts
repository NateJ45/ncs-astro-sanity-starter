// Safe to edit by hand
// The shot list (PORTS.md card 195, ported from First Baptist Auburn): the photo you want in each
// picture slot on the site. While the client review layer is on (CLIENT_NOTES_ACTIVE in
// src/data/client-notes.ts), a slot that is empty or still holds a stand-in (a stock photo, or a
// file uploaded with a `stand-in-` name) shows a "Photo needed" box that names the shot
// (src/components/ShotRequest.astro) instead of the stand-in. Upload the client's own photo in the
// Studio and it shows straight away; with the layer off, every box goes and a slot with no photo
// falls back to what it showed before.
//
// The same list feeds the client notes pill (src/data/client-notes.ts), one note per shot, so the
// pill and the boxes never disagree.
//
// Keys: the page path with a trailing slash, then the block's heading exactly as it reads in the
// Studio ("/" for Home), as "/about/|Our story". A block with several photos lists them in order.
// A renamed heading simply loses its request. The starter wires the "Image and text" block
// (ImageText.astro) and the journal card cover; wire another block the same way: compute
// `shotFor(path, heading, index, image)` and draw `<ShotRequest shot={shot} />` when it is set.
//
// An optional `example` is a free stock photo of the same kind of shot, kept in
// public/shot-examples/ as `<file>.webp` plus 480, 640 and 800 wide copies
// (`<file>-480.webp` and so on; sharp, quality 62). The box then shows it filling the slot with a
// note pinned on top, so the page reads as finished while still saying which photo is the
// client's to take. Credit the photographer in public/shot-examples/CREDITS.md. The starter ships
// no examples. Examples never ship at launch: they go with the layer.

import { CLIENT_NOTES_ACTIVE } from './client-notes.ts';
import { livePagePath } from '../lib/client-notes.ts';
import { splitStega } from '../lib/preview-stega.ts';

export interface Shot {
  /** The shot, in a few words: what the client points the camera at. */
  title: string;
  /** One or two plain sentences: who or what is in it, when, and anything to avoid. */
  detail: string;
  /** The way to hold the phone. The box takes the slot's own shape either way. */
  orientation: 'landscape' | 'portrait' | 'square';
  /** A stock photo of the same kind of shot (see above). `note: 'end'` pins the note to the right corner. */
  example?: { file: string; credit: string; note?: 'end' };
  /**
   * A short silent clip a site's own hero or card plays instead of the example photo; ShotRequest
   * only uses it to word its tag "Example video". The starter draws no video itself.
   */
  video?: { file: string; credit: string; phone?: boolean };
}

/** The public path of an example's photo. */
export const exampleSrc = (file: string) => `/shot-examples/${file}.webp`;

/**
 * The srcset for an example drawn in a picture slot. Every example has 480, 640 and 800 copies
 * beside it as `<file>-480.webp` and so on; a new example needs all three made too. The original
 * is declared at 900w, the narrowest original, so a wider one is only ever sharper than asked for.
 */
export const exampleSrcset = (file: string) =>
  [480, 640, 800].map((w) => `/shot-examples/${file}-${w}.webp ${w}w`).join(', ') +
  `, ${exampleSrc(file)} 900w`;

// The site's shots. The starter ships none; for example:
//
//   '/about/|Our story': [
//     {
//       title: 'The team at work',
//       detail: 'Everyone in one frame, in daylight, mid-conversation rather than posed.',
//       orientation: 'landscape',
//     },
//   ],
const SHOTS: Record<string, Shot[]> = {};

/** The cover of a journal post: one request, whatever the post. */
const JOURNAL_COVER: Shot = {
  title: 'A photo that goes with this post',
  detail: 'Something from the news you are sharing. Optional: a post reads fine without one.',
  orientation: 'landscape',
};

/** Uploaded files named like this are stand-ins, whatever their source (a site may add its own). */
export const STAND_IN_FILE = /^stand-in-/i;

interface AssetLike {
  originalFilename?: string | null;
  source?: { name?: string | null } | null;
}

/**
 * True when a projected image is a pre-launch stand-in: an Unsplash picture (its asset's
 * `source`) or a file uploaded as `stand-in-*`. The client's own uploads are never stand-ins.
 */
export function isStandInPhoto(img: unknown): boolean {
  const asset = (img as { asset?: AssetLike | null } | null | undefined)?.asset;
  if (!asset) return false;
  if (asset.source?.name === 'unsplash') return true;
  return STAND_IN_FILE.test(asset.originalFilename ?? '');
}

// The path is the LIVE one and the heading is cleaned of stega, so the draft preview
// (`/preview/...`, every heading carrying click-to-edit markers) finds the same shots.
const keyOf = (path: string, heading: string) =>
  `${livePagePath(path)}|${splitStega(heading).cleaned.trim()}`;

/** Every shot asked for on one page, in slot order. */
export function shotsForPage(path: string, shots: Record<string, Shot[]> = SHOTS): Shot[] {
  const prefix = keyOf(path, '');
  return Object.entries(shots)
    .filter(([k]) => k.startsWith(prefix))
    .flatMap(([, v]) => v);
}

/**
 * The shot for one picture slot, or null when the slot should show its photo: when the layer is
 * off, when no shot is listed for it, or when the client's own photo is in it. `shots` is the
 * list to look in (tests pass their own; the page uses the site's).
 */
export function pickShot(
  shots: Record<string, Shot[]>,
  path: string,
  heading: string | undefined,
  index: number,
  img: unknown,
): Shot | null {
  if (!heading) return null;
  const shot = shots[keyOf(path, heading)]?.[index];
  if (!shot) return null;
  const hasPhoto = Boolean((img as { asset?: unknown } | null | undefined)?.asset);
  return !hasPhoto || isStandInPhoto(img) ? shot : null;
}

/** The request for one picture slot while the layer is on, else null. `heading` is the plain heading. */
export function shotFor(path: string, heading: string | undefined, index: number, img: unknown) {
  return CLIENT_NOTES_ACTIVE ? pickShot(SHOTS, path, heading, index, img) : null;
}

/** A journal post's cover slot: the request while the cover is a stand-in, with the layer on. */
export function journalCoverShot(img: unknown): Shot | null {
  if (!CLIENT_NOTES_ACTIVE) return null;
  return isStandInPhoto(img) ? JOURNAL_COVER : null;
}

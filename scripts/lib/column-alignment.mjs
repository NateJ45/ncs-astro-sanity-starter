// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// scripts/lib/column-alignment.mjs  (PORTS.md card 91)
//
// The pure half of scripts/measure-columns.mjs: takes the geometry the script
// reads out of a page with getBoundingClientRect and says whether the page keeps
// ONE column edge and ONE text/picture seam. No browser, no DOM, so it is unit
// tested in scripts/lib/column-alignment.test.mjs.
//
// INPUT, one object per page and width:
//   {
//     path, width,
//     tokens: { text: 1.1, media: 0.9 } | null,   // --split-text / --split-media, null when the site has none
//     sections: [{
//       label,                                   // for the report only
//       headingLeft: number | null,              // left edge of the first h1/h2/h3
//       headingCentred: boolean,                 // that heading is text-align:center (exempt)
//       split: null | {                          // a two-column text/picture band, not stacked
//         kind: 'band' | 'grid' | 'hero',          // band = .split, grid = any other picture grid
//         leftLeft, leftWidth,                   // the left-hand column's box
//         rightLeft, rightWidth,                 // the right-hand column's box
//         orientation: 'media-right' | 'media-left',
//       },
//     }],
//   }
//
// THE TWO RULES IT CHECKS
//   1. Edge. Every heading outside a band, and the outer edge of every split band, starts at the
//      page's column edge, taken as the most common value on the page (not a
//      constant, so a site with a different container or gutter reports itself).
//      A centred heading is reported but exempt: it is centred on purpose.
//   2. Seam. Within one orientation (picture on the right, picture on the left)
//      every split band's second column starts at the same x. Two numbers per
//      viewport, never six. A band that uses the shared tokens must also divide the
//      column in the tokens' ratio.
//
// TOLERANCE is 1px: a rotated card or a sub-pixel grid track moves a bounding box
// by a fraction, and a gate that fires on a fraction teaches everyone to ignore it.

const round = (n) => Math.round(n * 10) / 10;

/** The most common value, ties broken towards the smaller x. */
export function mode(values) {
  if (!values.length) return null;
  const counts = new Map();
  for (const v of values) {
    const k = Math.round(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best = null;
  for (const [k, n] of counts) {
    if (best === null || n > best.n || (n === best.n && k < best.k)) best = { k, n };
  }
  return best.k;
}

/**
 * @param {object} page  see the header comment
 * @param {{ tolerance?: number, ratioTolerance?: number }} [opts]
 */
export function analyse(page, opts = {}) {
  const tol = opts.tolerance ?? 1;
  const ratioTol = opts.ratioTolerance ?? 0.02;
  const sections = page.sections ?? [];

  // ---- 1. the column edge ----------------------------------------------
  const edgeSamples = [];
  for (const s of sections) {
    // A band is measured by its outer edge: its first heading may sit in the
    // second column (picture on the left), which is the seam's business, not the edge's.
    if (s.split) edgeSamples.push(s.split.leftLeft);
    else if (s.headingLeft != null && !s.headingCentred) edgeSamples.push(s.headingLeft);
  }
  const edge = mode(edgeSamples);
  const offEdge = [];
  const centred = [];
  if (edge !== null) {
    for (const s of sections) {
      if (s.split) {
        if (Math.abs(s.split.leftLeft - edge) > tol) {
          offEdge.push({ label: s.label, what: 'band', left: round(s.split.leftLeft), edge });
        }
      } else if (s.headingLeft != null && s.headingCentred) centred.push(s.label);
      else if (s.headingLeft != null && Math.abs(s.headingLeft - edge) > tol) {
        offEdge.push({ label: s.label, what: 'heading', left: round(s.headingLeft), edge });
      }
    }
  }

  // ---- 2. the seams ----------------------------------------------------
  const groups = { 'media-right': [], 'media-left': [] };
  for (const s of sections) {
    if (s.split) groups[s.split.orientation].push(s);
  }
  const seams = {};
  const seamOffenders = [];
  for (const [orientation, list] of Object.entries(groups)) {
    if (!list.length) continue;
    const seam = mode(list.map((s) => s.split.rightLeft));
    const xs = list.map((s) => s.split.rightLeft);
    const spread = round(Math.max(...xs) - Math.min(...xs));
    seams[orientation] = {
      seam,
      spread,
      members: list.map((s) => ({
        label: s.label,
        kind: s.split.kind,
        seam: round(s.split.rightLeft),
      })),
    };
    for (const s of list) {
      if (Math.abs(s.split.rightLeft - seam) > tol) {
        seamOffenders.push({
          label: s.label,
          orientation,
          seam: round(s.split.rightLeft),
          expected: seam,
        });
      }
    }
  }

  // ---- 2b. the ratio (bands only; the hero bleeds, so its picture is wider) --
  const ratioOffenders = [];
  if (page.tokens && page.tokens.text > 0 && page.tokens.media > 0) {
    for (const s of sections) {
      const sp = s.split;
      if (!sp || sp.kind !== 'band') continue;
      const want =
        sp.orientation === 'media-right'
          ? page.tokens.text / page.tokens.media
          : page.tokens.media / page.tokens.text;
      const got = sp.leftWidth / sp.rightWidth;
      if (Math.abs(got - want) / want > ratioTol) {
        ratioOffenders.push({
          label: s.label,
          got: Math.round(got * 1000) / 1000,
          want: Math.round(want * 1000) / 1000,
        });
      }
    }
  }

  const failures = offEdge.length + seamOffenders.length + ratioOffenders.length;
  return {
    path: page.path,
    width: page.width,
    sections,
    edge,
    centred,
    offEdge,
    seams,
    seamOffenders,
    ratioOffenders,
    failures,
    ok: failures === 0,
  };
}

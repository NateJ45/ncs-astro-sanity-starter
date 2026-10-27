// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Rewrites SVG path data in its shortest plain form (PORTS.md card 197; first built for FBC Auburn's
// 47 icons, which went from 1.45 MB to 0.90 MB, brotli 464 to 313 KB). Relative commands, one
// decimal, no spaces a parser does not need: "M 239.8 602.7 C 234.1 604.9, 232.3 622, ..." becomes
// "m239.8 602.7c-5.7 2.2-7.5 19.3...". Use it in a build script that writes icons, logos or a
// generated motif, never on artwork you still edit by hand.
//
// PRECISION, THE ONE THING TO KNOW. Every coordinate is rounded to a TENTH of a unit and the
// arithmetic is done in whole tenths, so the points do not drift as offsets add up. Artwork drawn
// to a tenth already (an icon on a 24 or 100 unit grid, a master exported from a vector tool at
// one decimal) loses nothing: the test checks that every point stays where it was. Artwork drawn
// finer than that moves by up to 0.05 unit, so scale a very large drawing's viewBox first.
// Rendered side by side the two look the same; a pixel compare finds a handful of edge pixels
// anti-aliased differently, from the renderer summing relative offsets in floating point.
//
// Handles M, L, H, V, C, S, Q, T and Z, absolute or relative, with implicit repeats. Arcs (A) are
// returned unchanged: their flags do not survive this treatment.

const ARGS = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, z: 0 };

/** "0.5" -> ".5", "-0.5" -> "-.5", "3.0" -> "3". */
function num(tenths) {
  const neg = tenths < 0;
  const a = Math.abs(tenths);
  const whole = Math.floor(a / 10);
  const frac = a % 10;
  const body = frac ? `${whole === 0 ? '' : whole}.${frac}` : String(whole);
  return neg ? `-${body}` : body;
}

/** Joins numbers with the fewest separators: none before a minus sign, or before a leading
 *  "." when the previous number already has a decimal point. */
function join(nums) {
  let out = '';
  let prev = '';
  for (const n of nums) {
    const needsSpace =
      prev !== '' && !n.startsWith('-') && !(n.startsWith('.') && prev.includes('.'));
    out += (needsSpace ? ' ' : '') + n;
    prev = n;
  }
  return out;
}

export function compactPath(d) {
  if (/[aA]/.test(d)) return d;
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const t10 = (s) => Math.round(Number(s) * 10);
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0; // current point, in tenths
  let sx = 0;
  let sy = 0; // subpath start
  let out = '';
  let lastLetter = '';
  const emit = (letter, nums) => {
    const body = join(nums.map(num));
    // A repeated command letter can be left out, except after z.
    if (letter === lastLetter && letter !== 'z' && letter !== 'm') {
      out += (body.startsWith('-') ? '' : ' ') + body;
    } else {
      out += letter + body;
    }
    lastLetter = letter === 'm' ? 'l' : letter;
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const lower = cmd.toLowerCase();
    const rel = cmd === lower;
    const n = ARGS[lower];
    if (n === undefined) throw new Error(`compactPath: unexpected command ${cmd}`);
    if (lower === 'z') {
      out += 'z';
      lastLetter = 'z';
      x = sx;
      y = sy;
      continue;
    }
    const v = tokens.slice(i, i + n).map(t10);
    if (v.length < n) break;
    i += n;
    if (lower === 'h') {
      const nx = rel ? x + v[0] : v[0];
      emit('h', [nx - x]);
      x = nx;
    } else if (lower === 'v') {
      const ny = rel ? y + v[0] : v[0];
      emit('v', [ny - y]);
      y = ny;
    } else {
      // Every pair is a point; turn each into an offset from the current point.
      const abs = v.map((val, k) => (rel ? val + (k % 2 === 0 ? x : y) : val));
      const relv = abs.map((val, k) => val - (k % 2 === 0 ? x : y));
      emit(lower, relv);
      x = abs[n - 2];
      y = abs[n - 1];
      if (lower === 'm') {
        sx = x;
        sy = y;
        cmd = rel ? 'l' : 'L'; // implicit pairs after a moveto are linetos
      }
    }
  }
  return out;
}

/** Every d="..." in an SVG document, compacted. */
export function compactSvgPaths(svg) {
  return svg.replace(/ d="([^"]*)"/g, (_, d) => ` d="${compactPath(d)}"`);
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// qr - crisp QR code files for flyers and print (PORTS.md card 171)
// =============================================================================
// The Studio's "QR code" button (src/sanity/actions/qrCode.tsx) asks
// qrcode-generator (MIT, no dependencies, Studio bundle only) for the code's
// grid of dark and light squares, and this file turns that grid into files:
//   - an SVG drawn as ONE path of whole squares, with crispEdges, so it stays
//     sharp at any size in Word, Publisher or a print shop;
//   - the size of a PNG with whole pixels per square, so a PNG is never blurred
//     by a fractional scale.
// Both keep the four-square quiet border the QR standard asks for: without it
// some phone cameras will not read the code.
//
// Pure, so it is tested in bare Node (qr.test.ts) against the real library.
// =============================================================================

/** What the library's QR object gives us. */
export interface QrGrid {
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}

/** The quiet border, in squares. */
export const QUIET_ZONE = 4;

/** One SVG path for every dark square, merged across each row. */
export function qrPath(grid: QrGrid, margin = QUIET_ZONE): string {
  const n = grid.getModuleCount();
  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!grid.isDark(r, c)) {
        c++;
        continue;
      }
      const start = c;
      while (c < n && grid.isDark(r, c)) c++;
      parts.push(`M${start + margin} ${r + margin}h${c - start}v1h-${c - start}z`);
    }
  }
  return parts.join('');
}

/**
 * A standalone SVG file. Sized in squares (the viewBox) with a nominal width,
 * so it scales cleanly; `title` is read by screen readers and file browsers.
 */
export function qrSvg(
  grid: QrGrid,
  opts: { title?: string; dark?: string; light?: string; margin?: number } = {},
): string {
  const margin = opts.margin ?? QUIET_ZONE;
  const size = grid.getModuleCount() + margin * 2;
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const title = opts.title ? `<title>${esc(opts.title)}</title>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 10}" height="${size * 10}" shape-rendering="crispEdges">` +
    title +
    `<rect width="${size}" height="${size}" fill="${opts.light ?? '#ffffff'}"/>` +
    `<path fill="${opts.dark ?? '#000000'}" d="${qrPath(grid, margin)}"/>` +
    `</svg>`
  );
}

/** Whole pixels per square for a PNG at least `minPx` wide. */
export function qrPngScale(grid: QrGrid, minPx = 1200, margin = QUIET_ZONE): number {
  const size = grid.getModuleCount() + margin * 2;
  return Math.max(1, Math.ceil(minPx / size));
}

/** A safe file name from what the code points at ("qr-spring", "qr-our-team"). */
export function qrFileName(url: string): string {
  let tail = '';
  try {
    const u = new URL(url);
    tail = u.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
    if (!tail) tail = u.hostname.split('.')[0] ?? 'home';
  } catch {
    tail = 'link';
  }
  const clean = tail
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `qr-${clean || 'home'}`;
}

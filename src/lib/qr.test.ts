// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// Tests for the QR file helpers (src/lib/qr.ts), against the real library.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import qrcode from 'qrcode-generator';
import { QUIET_ZONE, qrFileName, qrPath, qrPngScale, qrSvg, type QrGrid } from './qr.ts';

function grid(text: string): QrGrid {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr;
}

describe('qr files', () => {
  const g = grid('https://example-site.workers.dev/spring');
  const n = g.getModuleCount();

  it('draws every dark square, and only those', () => {
    let dark = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (g.isDark(r, c)) dark++;
    let drawn = 0;
    for (const m of qrPath(g).matchAll(/h(\d+)/g)) drawn += Number(m[1]);
    assert.equal(drawn, dark);
  });

  it('keeps the quiet border and stays crisp', () => {
    const svg = qrSvg(g, { title: 'QR code for /spring <test>' });
    const size = n + QUIET_ZONE * 2;
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.includes(`viewBox="0 0 ${size} ${size}"`));
    assert.ok(svg.includes('shape-rendering="crispEdges"'));
    assert.ok(svg.includes('<title>QR code for /spring &lt;test&gt;</title>'));
    // The top-left finder square starts at the quiet border.
    assert.ok(qrPath(g).startsWith(`M${QUIET_ZONE} ${QUIET_ZONE}h7`));
  });

  it('a PNG uses whole pixels per square and is at least 1200px', () => {
    const scale = qrPngScale(g);
    assert.equal(Number.isInteger(scale), true);
    assert.ok(scale * (n + QUIET_ZONE * 2) >= 1200);
  });

  it('names the file after what it points at', () => {
    assert.equal(qrFileName('https://example.com/spring'), 'qr-spring');
    assert.equal(qrFileName('https://example.com/journal/first-post/'), 'qr-journal-first-post');
    assert.equal(qrFileName('https://example.com/'), 'qr-example');
    assert.equal(qrFileName('nonsense'), 'qr-link');
  });
});

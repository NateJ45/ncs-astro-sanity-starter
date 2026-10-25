// Tests for search-files.mjs (PORTS.md card 154). The PDF and Word fixtures are
// built here, byte by byte, so no binary files live in the repo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import {
  cacheKey,
  collectFileLinks,
  extractText,
  fileRecord,
  indexedMain,
  isFileHref,
  stripIgnored,
  mapLimit,
  mergeFileLinks,
  readFile,
  topWords,
  countWords,
  words,
} from './search-files.mjs';

// ---- fixtures ---------------------------------------------------------------

/** A one-page PDF. With `text`, the page draws it; without, the page is blank (a "scan"). */
function makePdf(text) {
  const stream = text ? `BT /F1 12 Tf 72 720 Td (${text}) Tj ET` : '';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, 'latin1'));
}

/** A minimal zip (deflate), enough for mammoth to open a .docx. */
function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const data = Buffer.from(content, 'utf8');
    const comp = deflateRawSync(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, comp);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, cd, end]));
}

function makeDocx(text) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  return makeZip({
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
  });
}

const SHA = 'a'.repeat(40);
const page = (main, { body = true, lang = 'en' } = {}) =>
  `<!doctype html><html lang="${lang}"><head><title>Bulletins | Church</title></head><body>
  <header><a href="https://cdn.sanity.io/files/p/d/${'b'.repeat(40)}.pdf">Header file</a></header>
  <main ${body ? 'data-pagefind-body' : ''}><h1>This week's <em>bulletin</em></h1>${main}</main></body></html>`;

// ---- link collection --------------------------------------------------------

test('collects file links inside the indexed main only', () => {
  const html = page(`
    <a href="https://cdn.sanity.io/files/p/d/${SHA}.pdf?dl=" data-search-title="Bulletin for Oct 12"
       data-search-type="bulletin" data-search-date="October 12, 2026" data-search-note="Order of service">Download</a>
    <a href="/about/">About</a>
    <a href="/files/form.docx">Camp &amp; sign-up form</a>`);
  const links = collectFileLinks(html, '/bulletin/');
  assert.equal(links.length, 2);
  assert.deepEqual(links[0], {
    url: `https://cdn.sanity.io/files/p/d/${SHA}.pdf`,
    title: 'Bulletin for Oct 12',
    type: 'bulletin',
    date: 'October 12, 2026',
    note: 'Order of service',
    source: "This week's bulletin",
    sourceUrl: '/bulletin/',
    language: 'en',
  });
  assert.equal(links[1].title, 'Camp & sign-up form');
  assert.equal(links[1].type, 'file');
});

test('a page that is not indexed gives no links', () => {
  const html = page(`<a href="https://cdn.sanity.io/files/p/d/${SHA}.pdf">x</a>`, { body: false });
  assert.equal(indexedMain(html), null);
  assert.deepEqual(collectFileLinks(html, '/x/'), []);
  const ignored = `<html><main data-pagefind-body data-pagefind-ignore="all"><a href="/a.pdf">a</a></main></html>`;
  assert.deepEqual(collectFileLinks(ignored, '/x/'), []);
});

test('stripIgnored drops ignored blocks with everything nested inside', () => {
  const html =
    '<p>keep</p><div data-pagefind-ignore="all"><div><p>pill <a href="/x.pdf">x</a></p></div></div><p>also</p><img data-pagefind-ignore src="a"><span>end</span>';
  assert.equal(stripIgnored(html), '<p>keep</p><p>also</p><span>end</span>');
  const main = page(
    `<details data-pagefind-ignore="all"><a href="/n.pdf">notes</a></details><a href="/k.pdf">k</a>`,
  );
  assert.deepEqual(
    collectFileLinks(main, '/x/').map((l) => l.url),
    ['/k.pdf'],
  );
});

test('isFileHref accepts Sanity files and local pdf/docx/txt, nothing else', () => {
  assert.ok(isFileHref(`https://cdn.sanity.io/files/p/d/${SHA}.pdf`));
  assert.ok(isFileHref('/downloads/a.PDF'));
  assert.ok(isFileHref('/a.txt?x=1'));
  assert.ok(!isFileHref(`https://cdn.sanity.io/images/p/d/${SHA}-10x10.jpg`));
  assert.ok(!isFileHref('/about/'));
  assert.ok(!isFileHref('https://example.com/a.pdf'));
  assert.ok(!isFileHref(undefined));
});

test('mergeFileLinks keeps one entry per file and the first explicit details', () => {
  const base = {
    title: 'Download',
    type: 'file',
    date: '',
    note: '',
    source: 'A',
    sourceUrl: '/a/',
  };
  const merged = mergeFileLinks([
    { ...base, url: '/x.pdf' },
    { ...base, url: '/x.pdf', title: 'Notes: Grace', type: 'notes', date: 'Oct 1', source: 'B' },
    { ...base, url: '/y.pdf' },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].type, 'notes');
  assert.equal(merged[0].date, 'Oct 1');
  assert.equal(merged[0].source, 'A');
});

test('cacheKey uses the Sanity SHA-1 when the URL has one', () => {
  assert.equal(cacheKey(`https://cdn.sanity.io/files/p/d/${SHA}.pdf?dl=`), SHA);
  assert.match(cacheKey('/local.pdf', Buffer.from('x')), /^[0-9a-f]{40}$/);
});

// ---- extraction -------------------------------------------------------------

test('reads the text inside a PDF', async () => {
  const got = await extractText(makePdf('Potluck after worship on Sunday'), 'pdf');
  assert.match(got.text, /Potluck after worship on Sunday/);
  assert.equal(got.pages, 1);
  assert.equal(got.scanned, false);
});

test('a PDF with no text layer is flagged as a scan', async () => {
  const got = await extractText(makePdf(''), 'pdf');
  assert.equal(got.scanned, true);
});

test('reads the text inside a Word file', async () => {
  const got = await extractText(makeDocx('Camp sign-up closes June 1'), 'docx');
  assert.match(got.text, /Camp sign-up closes June 1/);
});

test('reads a text file and refuses unknown formats', async () => {
  const got = await extractText(new TextEncoder().encode('Hello  there'), 'txt');
  assert.equal(got.text, 'Hello  there');
  await assert.rejects(extractText(new Uint8Array(), 'pptx'), /not read/);
});

test('a missing package becomes a reason, not a crash', async () => {
  const none = { unpdf: async () => null, mammoth: async () => null };
  await assert.rejects(extractText(makePdf('x'), 'pdf', none), /unpdf/);
});

// ---- readFile: cache, failures, limits --------------------------------------

function fakeFetch(bytes, { status = 200, length } = {}) {
  let calls = 0;
  const fn = async () => {
    calls++;
    return {
      ok: status === 200,
      status,
      headers: { get: (h) => (h === 'content-length' && length ? String(length) : null) },
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  };
  fn.calls = () => calls;
  return fn;
}

test('readFile fetches once, then reads from the cache', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'search-files-'));
  const link = { url: `https://cdn.sanity.io/files/p/d/${SHA}.pdf`, title: 'B' };
  const fetchImpl = fakeFetch(makePdf('Hymn sing tonight'));
  const first = await readFile(link, { cacheDir, fetchImpl });
  assert.equal(first.status, 'read');
  assert.match(first.text, /Hymn sing tonight/);
  assert.equal(first.format, 'PDF');
  assert.deepEqual(readdirSync(cacheDir), [`${SHA}.json`]);
  const second = await readFile(link, { cacheDir, fetchImpl });
  assert.equal(second.cached, true);
  assert.match(second.text, /Hymn sing tonight/);
  assert.equal(fetchImpl.calls(), 1);
});

test('readFile never throws: HTTP errors, oversize and unknown types come back as reasons', async () => {
  const url = `https://cdn.sanity.io/files/p/d/${SHA}.pdf`;
  const failed = await readFile(
    { url },
    { fetchImpl: fakeFetch(new Uint8Array(), { status: 404 }) },
  );
  assert.equal(failed.status, 'failed');
  assert.match(failed.reason, /404/);
  const big = await readFile({ url }, { fetchImpl: fakeFetch(new Uint8Array(), { length: 30e6 }) });
  assert.match(big.reason, /too big/);
  const odd = await readFile({ url: `https://cdn.sanity.io/files/p/d/${SHA}.pptx` });
  assert.equal(odd.status, 'skipped');
});

test('readFile reads a local file from the built site', async () => {
  const siteDir = mkdtempSync(join(tmpdir(), 'search-site-'));
  mkdirSync(join(siteDir, 'files'));
  writeFileSync(join(siteDir, 'files', 'rota.txt'), 'Greeters rota for November');
  const got = await readFile({ url: '/files/rota.txt' }, { siteDir });
  assert.equal(got.status, 'read');
  assert.equal(got.text, 'Greeters rota for November');
});

// ---- records and words ------------------------------------------------------

test('fileRecord leads with title and note and carries type and source', () => {
  const rec = fileRecord(
    {
      url: '/x.pdf',
      title: 'Bulletin',
      type: 'bulletin',
      date: 'Oct 12',
      note: 'Order of service',
      source: 'Bulletins',
      sourceUrl: '/bulletin/',
      language: 'en',
    },
    { text: 'Hymn 42', format: 'PDF' },
  );
  assert.equal(rec.content, 'Bulletin. Order of service. Hymn 42');
  assert.deepEqual(rec.filters, { type: ['bulletin'] });
  assert.deepEqual(rec.meta, {
    title: 'Bulletin',
    format: 'PDF',
    date: 'Oct 12',
    source: 'Bulletins',
    source_url: '/bulletin/',
  });
});

test('words lower-cases, drops accents, digits, short words and possessives', () => {
  assert.deepEqual(words("God's café: 3 Hymns, an AWANA night"), [
    'god',
    'cafe',
    'hymns',
    'awana',
    'night',
  ]);
  const top = topWords(countWords(new Map(), 'grace grace mercy'), 1);
  assert.deepEqual(top, [['grace', 2]]);
});

test('mapLimit keeps order and caps concurrency', async () => {
  let live = 0;
  let peak = 0;
  const out = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
    live++;
    peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 5));
    live--;
    return n * 2;
  });
  assert.deepEqual(out, [2, 4, 6, 8, 10]);
  assert.equal(peak, 2);
});

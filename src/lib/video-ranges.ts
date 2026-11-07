// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// video-ranges: answer video byte-range requests with a real 206 (PORTS.md card 222)
// =============================================================================
// Cloudflare's static assets ignore a Range header: they send the whole file with a 200 and no
// Accept-Ranges. Safari on an iPhone asks for the first bytes of a clip and expects a 206, so a
// self-hosted clip may refuse to play there, while desktop browsers, Playwright on Chromium and
// Lighthouse all look fine. src/worker.ts sends *.mp4 and *.webm through this file. Everything
// else stays a plain asset. Tested in video-ranges.test.ts.

/** The paths src/worker.ts handles here. wrangler.jsonc's run_worker_first must list the same. */
export function isVideoPath(pathname: string): boolean {
  return /\.(mp4|webm)$/i.test(pathname);
}

/**
 * Read a Range header against a file's size. Returns the bytes to send, 'whole' when the header is
 * absent or a form this file does not serve (several ranges, other units: sending everything is a
 * valid answer to those), or 'unsatisfiable' when it starts past the end of the file.
 */
export function parseByteRange(
  header: string | null,
  size: number,
): { start: number; end: number } | 'whole' | 'unsatisfiable' {
  const match = header ? /^bytes=(\d*)-(\d*)$/.exec(header.trim()) : null;
  if (!match || (match[1] === '' && match[2] === '')) return 'whole';
  // "bytes=-500" means the last 500 bytes.
  if (match[1] === '') {
    const length = Number(match[2]);
    if (length === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - length), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

/** Turn the asset store's answer into the response a range request should get. */
export async function rangedVideo(request: Request, asset: Response): Promise<Response> {
  // A 304, or anything else that is not the file itself, passes through untouched.
  if (asset.status !== 200) return asset;
  const header = request.method === 'GET' ? request.headers.get('range') : null;
  const ifRange = request.headers.get('if-range');
  // If-Range names the copy the browser already has. A different copy means start again.
  const stale = ifRange !== null && ifRange !== asset.headers.get('etag');
  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');
  if (!header || stale) return new Response(asset.body, { status: 200, headers });

  const bytes = await asset.arrayBuffer();
  const range = parseByteRange(header, bytes.byteLength);
  if (range === 'whole') return new Response(bytes, { status: 200, headers });
  if (range === 'unsatisfiable') {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${bytes.byteLength}`, 'Accept-Ranges': 'bytes' },
    });
  }
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${bytes.byteLength}`);
  headers.set('Content-Length', String(range.end - range.start + 1));
  return new Response(bytes.slice(range.start, range.end + 1), { status: 206, headers });
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-posted-draft — render the preview from the Studio's own copy of the
// draft (2026-10-26, PORTS.md card 184)
// =============================================================================
// THE WAIT THIS REMOVES. Instant text (card 182) and instant structure (card
// 183) put typed words, moved sections and swapped pictures on the page from the
// draft the Studio posts into the frame. Everything else (a new section, a
// toggle, a changed list, a new link) still waited for the server render, and
// that render could not start until Sanity could SERVE the edit: the Studio's
// autosave (about a second of throttle) and then the query index (the
// `/preview/live` SSE fires 0.9 to 1.5 s after the keystroke). A render started
// sooner read the old document and was thrown away.
//
// The frame already holds the newest draft (LiveDraftBridge posts it every
// keystroke). So the soft refresh now POSTS that draft to the preview route,
// and the route runs the page's own projection over it:
//
//     { "id": *[<this page's filter>][0]._id, "doc": $postedDraft{ ...fields } }
//
// ONE request, the same count as before. GROQ dereferences `_ref`s inside a
// parameter object exactly as it does inside a stored document (checked
// against the live API), so synced sections, pictures and picked pages resolve
// from the dataset as before. Only the page's own fields come from the post.
//
// WHY NOT SANITY'S OWN LIVE MODE. Presentation's loader live mode
// (`@sanity/core-loader` `enableLiveMode`, `useLiveMode`) runs the frontend's
// registered query in the Studio: it FETCHES it from the API (on Live Content
// API events) and then "turbo-charges" the result with `applySourceDocuments`,
// which rewrites leaf VALUES from the Studio's local copy through the Content
// Source Map. Read in sanity 6's LiveQueries.js. Two reasons it does not fit:
// the result arrives as JSON in the browser (our pages are server-rendered
// Astro, so there is nothing client-side to re-render it), and leaf rewriting
// cannot add a section any more than instant text can. A structural edit there
// still waits for a refetch, exactly the wait this card removes.
//
// STEGA, OR CLICK-TO-EDIT AND INSTANT TEXT WOULD GO BLIND. Stega is written
// from the Content Source Map, and a value read from a parameter has no source
// document: the API maps the dereferenced documents and leaves the posted ones
// unmapped (checked: `$['d']['title']` absent, `$['d']['s']['title']` mapped to
// siteSettings). `withPostedDraftMappings` fills the gap by IDENTITY: it walks
// the result beside the posted draft, following object keys and array items by
// `_key`, and maps a string leaf only when the draft holds the SAME string at
// that same path. That is the mapping the API would have written for a stored
// draft (`$['pageBuilder'][?(@._key=='k')]['heading']`), so the stega payload
// is the same, and `npm run parity`-style comparison of the two renders is the
// proof. A value the projection renamed or computed gets no mapping (no stega)
// rather than a guessed one; the next render through the stored draft brings it
// back. Mappings the API wrote (referenced documents) are never overwritten.
//
// TRUST. The body is the editor's own draft, rendered back to the editor, behind
// the same `isStudioPreview` cookie. It is still checked: the request must say
// it is ours (a custom header and a JSON body, which no cross-site form can
// send without a CORS preflight we never answer) and come from this origin,
// the body is capped, the envelope must be exactly `{ document }` with a
// `drafts.` id, and the route renders it only when that id and `_type` are the
// document this path shows (`postedDraftMatchesPage`). Anything else falls back
// to the stored draft, which is the old behaviour, never an error.
//
// Pure apart from `readPostedDraft`, which takes a standard `Request`, so the
// whole file is testable in plain Node (preview-posted-draft.test.ts).
// =============================================================================
import { jsonPath } from '@sanity/client/csm';
import type { ContentSourceMap, ContentSourceMapMapping } from '@sanity/client/csm';
import {
  LIVE_DRAFT_MESSAGE,
  POSTED_DRAFT_HEADER,
  parseLiveDraft,
  type LiveDraftDocument,
} from './preview-live-draft.ts';

// Defined beside the channel it belongs to, so the browser island can read it
// without pulling this server-side file (and its CSM helpers) into its bundle.
export { POSTED_DRAFT_HEADER };

/**
 * The largest body the route will read. A full page builder document is tens of
 * kilobytes; this is an order of magnitude above the largest measured (the
 * Auburn home page) and well below anything that would cost real Worker time
 * to parse.
 */
export const MAX_POSTED_DRAFT_BYTES = 512 * 1024;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const publishedId = (id: string): string => id.replace(/^drafts\./, '');

/** The fields of a request the gate reads, so the check is testable without a Request. */
export interface PostedDraftRequest {
  method: string;
  headers: { get(name: string): string | null };
}

/**
 * Whether a request may carry a posted draft at all. Checked BEFORE the body is
 * read. The cookie gate (`isStudioPreview`) is the caller's and comes first.
 */
export function postedDraftRequestAllowed(
  request: PostedDraftRequest,
  siteOrigin: string,
): boolean {
  if (request.method !== 'POST') return false;
  const h = request.headers;
  if (h.get(POSTED_DRAFT_HEADER) !== '1') return false;
  if (!(h.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return false;
  // Same origin only. A browser always sends Origin on a POST; its absence
  // means this is not the frame's own fetch.
  if (h.get('origin') !== siteOrigin) return false;
  const site = h.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin') return false;
  const length = h.get('content-length');
  if (length !== null && !(Number(length) <= MAX_POSTED_DRAFT_BYTES)) return false;
  return true;
}

/**
 * Parse a posted body into the draft it carries, or null for anything else.
 * The envelope is `{ "document": <draft> }` and the draft must be a DRAFT
 * (`drafts.` id): the published twin is what the route already reads.
 */
export function parsePostedDraft(text: string): LiveDraftDocument | null {
  // Measured in UTF-16 units, which never under-counts the UTF-8 bytes by more
  // than a factor of three; the header check above has already capped honest
  // senders, this caps a sender that left Content-Length off.
  if (text.length > MAX_POSTED_DRAFT_BYTES) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isPlainObject(body) || !isPlainObject(body.document)) return null;
  const message = parseLiveDraft({ type: LIVE_DRAFT_MESSAGE, document: body.document });
  const doc = message?.document ?? null;
  if (!doc || !doc._id.startsWith('drafts.')) return null;
  return doc;
}

/** Read and parse a posted draft from a request, or null. Never throws. */
export async function readPostedDraft(
  request: Request,
  siteOrigin: string,
): Promise<LiveDraftDocument | null> {
  if (!postedDraftRequestAllowed(request, siteOrigin)) return null;
  try {
    return parsePostedDraft(await request.text());
  } catch {
    return null;
  }
}

/**
 * Is the posted draft the document this preview path shows?
 *
 * `resolvedId` is what the route's own filter found in the dataset (the draft
 * or the published id, depending on whether a draft is stored yet). The posted
 * draft must be that same document, of the type the path expects. A slug the
 * draft has just changed, a page that does not exist yet, a post meant for the
 * page the frame was on a moment ago: all false, and the route reads the stored
 * draft instead.
 */
export function postedDraftMatchesPage(
  draft: LiveDraftDocument,
  resolvedId: unknown,
  expectedType: string,
): boolean {
  if (typeof resolvedId !== 'string' || resolvedId === '') return false;
  if (draft._type !== expectedType) return false;
  return publishedId(draft._id) === publishedId(resolvedId);
}

type ResultSegment = string | number;
type SourceSegment = string | number | { _key: string; _index: number };

/**
 * Add Content Source Map mappings for every string in `result[at...]` that came
 * from the posted draft, by identity (see the header). Returns a NEW map; the
 * input is not touched. Existing mappings always win.
 */
export function withPostedDraftMappings(
  result: unknown,
  csm: ContentSourceMap | undefined,
  draft: LiveDraftDocument,
  at: readonly string[] = [],
): ContentSourceMap {
  const documents = [...(csm?.documents ?? [])];
  const paths = [...(csm?.paths ?? [])];
  const mappings: Record<string, ContentSourceMapMapping> = { ...(csm?.mappings ?? {}) };

  let root: unknown = result;
  for (const key of at) root = isPlainObject(root) ? root[key] : undefined;
  if (root === undefined) return { documents, paths, mappings };

  let docIndex = -1;
  const pathIndex = new Map<string, number>();

  const map = (resultPath: ResultSegment[], sourcePath: SourceSegment[]) => {
    const key = jsonPath(resultPath);
    if (mappings[key] !== undefined) return;
    if (docIndex === -1) {
      docIndex = documents.length;
      documents.push({ _id: draft._id, _type: draft._type });
    }
    const source = jsonPath(sourcePath as never);
    let index = pathIndex.get(source);
    if (index === undefined) {
      index = paths.length;
      paths.push(source);
      pathIndex.set(source, index);
    }
    mappings[key] = {
      type: 'value',
      source: { type: 'documentValue', document: docIndex, path: index },
    };
  };

  const walk = (
    value: unknown,
    origin: unknown,
    resultPath: ResultSegment[],
    sourcePath: SourceSegment[],
  ) => {
    if (typeof value === 'string') {
      if (origin === value) map(resultPath, sourcePath);
      return;
    }
    if (Array.isArray(value)) {
      if (!Array.isArray(origin)) return;
      value.forEach((item, i) => {
        const key = isPlainObject(item) && typeof item._key === 'string' ? item._key : null;
        if (key !== null) {
          // Keyed: follow the SAME item, wherever the projection put it.
          const j = origin.findIndex((o) => isPlainObject(o) && o._key === key);
          if (j === -1) return;
          walk(item, origin[j], [...resultPath, i], [...sourcePath, { _key: key, _index: j }]);
          return;
        }
        // Unkeyed (a list of strings, say): only when the projection kept the
        // array as it is, which the same length is the cheap evidence of.
        if (origin.length !== value.length) return;
        walk(item, origin[i], [...resultPath, i], [...sourcePath, i]);
      });
      return;
    }
    if (isPlainObject(value)) {
      if (!isPlainObject(origin)) return;
      for (const [key, child] of Object.entries(value)) {
        // `_key`, `_type`, `_ref`: the stega filter skips underscore fields anyway.
        if (key.startsWith('_') && typeof child === 'string') continue;
        if (!(key in origin)) continue;
        walk(child, origin[key], [...resultPath, key], [...sourcePath, key]);
      }
    }
  };

  walk(root, draft, [...at], []);
  return { documents, paths, mappings };
}

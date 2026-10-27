// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-posted-draft — the rules for rendering the Studio's posted draft
// =============================================================================
// Pinned here: (1) only the frame's own same-origin JSON post gets through the
// gate, (2) the body must be exactly a draft envelope and that page's draft,
// and (3) the identity mappings give the posted strings the SAME stega the API
// would have given a stored draft, never a guessed one, and never overwrite a
// mapping the API wrote. See preview-posted-draft.ts for why.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stegaEncodeSourceMap } from '@sanity/client/stega';
import type { ContentSourceMap } from '@sanity/client/csm';
import {
  MAX_POSTED_DRAFT_BYTES,
  POSTED_DRAFT_HEADER,
  parsePostedDraft,
  postedDraftMatchesPage,
  postedDraftRequestAllowed,
  readPostedDraft,
  withPostedDraftMappings,
} from './preview-posted-draft.ts';
import { stegaSource } from './preview-stega.ts';

const ORIGIN = 'https://example.test';

const request = (headers: Record<string, string>, method = 'POST') => ({
  method,
  headers: new Headers({
    [POSTED_DRAFT_HEADER]: '1',
    'content-type': 'application/json',
    origin: ORIGIN,
    ...headers,
  }),
});

test('the gate lets only the frame’s own same-origin JSON post through', () => {
  assert.equal(postedDraftRequestAllowed(request({}), ORIGIN), true);
  assert.equal(
    postedDraftRequestAllowed(request({ 'sec-fetch-site': 'same-origin' }), ORIGIN),
    true,
  );
  assert.equal(postedDraftRequestAllowed(request({}, 'GET'), ORIGIN), false);
  assert.equal(postedDraftRequestAllowed(request({ [POSTED_DRAFT_HEADER]: '0' }), ORIGIN), false);
  // A cross-site form can send these content types without a preflight.
  assert.equal(postedDraftRequestAllowed(request({ 'content-type': 'text/plain' }), ORIGIN), false);
  assert.equal(
    postedDraftRequestAllowed(
      request({ 'content-type': 'application/x-www-form-urlencoded' }),
      ORIGIN,
    ),
    false,
  );
  assert.equal(postedDraftRequestAllowed(request({ origin: 'https://evil.test' }), ORIGIN), false);
  assert.equal(
    postedDraftRequestAllowed(request({ 'sec-fetch-site': 'cross-site' }), ORIGIN),
    false,
  );
  assert.equal(
    postedDraftRequestAllowed(
      request({ 'content-length': String(MAX_POSTED_DRAFT_BYTES + 1) }),
      ORIGIN,
    ),
    false,
  );
  const noOrigin = request({});
  noOrigin.headers.delete('origin');
  assert.equal(postedDraftRequestAllowed(noOrigin, ORIGIN), false);
});

test('the body must be exactly a draft envelope', () => {
  const draft = { _id: 'drafts.homePage', _type: 'homePage', title: 'Hi' };
  assert.deepEqual(parsePostedDraft(JSON.stringify({ document: draft })), draft);
  assert.equal(parsePostedDraft('not json'), null);
  assert.equal(parsePostedDraft(JSON.stringify(draft)), null);
  assert.equal(parsePostedDraft(JSON.stringify({ document: null })), null);
  assert.equal(parsePostedDraft(JSON.stringify({ document: [draft] })), null);
  // The published twin is what the route reads already; only a draft is news.
  assert.equal(parsePostedDraft(JSON.stringify({ document: { ...draft, _id: 'homePage' } })), null);
  assert.equal(parsePostedDraft(JSON.stringify({ document: { _id: 'drafts.x' } })), null);
  assert.equal(
    parsePostedDraft(
      JSON.stringify({ document: { ...draft, pad: 'x'.repeat(MAX_POSTED_DRAFT_BYTES) } }),
    ),
    null,
  );
});

test('readPostedDraft reads a real Request and never throws', async () => {
  const body = JSON.stringify({ document: { _id: 'drafts.p1', _type: 'page' } });
  const ok = new Request(`${ORIGIN}/preview/x/`, {
    method: 'POST',
    headers: { [POSTED_DRAFT_HEADER]: '1', 'content-type': 'application/json', origin: ORIGIN },
    body,
  });
  assert.equal((await readPostedDraft(ok, ORIGIN))?._id, 'drafts.p1');
  const wrong = new Request(`${ORIGIN}/preview/x/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body,
  });
  assert.equal(await readPostedDraft(wrong, ORIGIN), null);
});

test('only the draft of the document this path shows is rendered', () => {
  const draft = { _id: 'drafts.abc', _type: 'page' };
  assert.equal(postedDraftMatchesPage(draft, 'abc', 'page'), true);
  assert.equal(postedDraftMatchesPage(draft, 'drafts.abc', 'page'), true);
  assert.equal(postedDraftMatchesPage(draft, 'other', 'page'), false);
  assert.equal(postedDraftMatchesPage(draft, null, 'page'), false);
  assert.equal(postedDraftMatchesPage(draft, 'abc', 'homePage'), false);
});

const STEGA = { enabled: true, studioUrl: '/studio' } as const;

const encode = (result: unknown, csm: ContentSourceMap) =>
  stegaEncodeSourceMap(result as never, csm, STEGA as never) as Record<string, unknown>;

test('posted strings get the stega a stored draft would have had', () => {
  const draft = {
    _id: 'drafts.homePage',
    _type: 'homePage',
    title: 'Home',
    pageBuilder: [
      { _key: 'a', _type: 'textSection', heading: 'Welcome', tags: ['one', 'two'] },
      { _key: 'new', _type: 'textSection', heading: 'Brand new section' },
    ],
  };
  // The projection kept the order but dropped the first item's tags and
  // computed a field; a renamed field reads the same words from elsewhere.
  const result = {
    id: 'drafts.homePage',
    doc: {
      _id: 'drafts.homePage',
      title: 'Home',
      label: 'Home',
      pageBuilder: [
        { _key: 'new', _type: 'textSection', heading: 'Brand new section' },
        { _key: 'a', _type: 'textSection', heading: 'Welcome', tags: ['one', 'two'] },
      ],
    },
  };
  const csm = withPostedDraftMappings(result, undefined, draft, ['doc']);
  const out = encode(result, csm).doc as typeof result.doc;

  assert.deepEqual(stegaSource(out.title), { id: 'homePage', type: 'homePage', path: 'title' });
  // Followed by _key, wherever the projection put the item.
  assert.deepEqual(stegaSource(out.pageBuilder[0].heading), {
    id: 'homePage',
    type: 'homePage',
    path: 'pageBuilder[_key=="new"].heading',
  });
  assert.equal(stegaSource(out.pageBuilder[1].tags![1])?.path, 'pageBuilder[_key=="a"].tags[1]');
  // A key the draft does not have gets nothing, even with the same words.
  assert.equal(stegaSource(out.label), null);
  // Underscore fields are skipped by the stega filter, as for any fetch.
  assert.equal(stegaSource(out._id), null);
});

test('a value that differs from the draft is left unmapped, never guessed', () => {
  const draft = { _id: 'drafts.p', _type: 'page', heading: 'Draft words' };
  const result = { doc: { heading: 'Computed words' } };
  const csm = withPostedDraftMappings(result, undefined, draft, ['doc']);
  assert.deepEqual(csm.mappings, {});
  assert.deepEqual(csm.documents, []);
});

test('mappings the API wrote for referenced documents always win', () => {
  const draft = {
    _id: 'drafts.p',
    _type: 'page',
    pageBuilder: [{ _key: 's', _type: 'syncedSection', heading: 'Shared' }],
  };
  const result = { doc: { pageBuilder: [{ _key: 's', heading: 'Shared' }] } };
  const api: ContentSourceMap = {
    documents: [{ _id: 'shared1', _type: 'sectionPattern' }],
    paths: ["$['heading']"],
    mappings: {
      "$['doc']['pageBuilder'][0]['heading']": {
        type: 'value',
        source: { type: 'documentValue', document: 0, path: 0 },
      },
    },
  };
  const csm = withPostedDraftMappings(result, api, draft, ['doc']);
  assert.equal(csm.documents.length, 1);
  assert.deepEqual(csm.mappings, api.mappings);
  const out = encode(result, csm).doc as typeof result.doc;
  assert.equal(stegaSource(out.pageBuilder[0].heading)?.id, 'shared1');
  // And the input map is not mutated.
  assert.equal(api.documents.length, 1);
});

test('portable text spans map to their keyed span path', () => {
  const body = [
    {
      _key: 'b',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{ _key: 's', _type: 'span', marks: [], text: 'A sentence.' }],
    },
  ];
  const draft = { _id: 'drafts.p', _type: 'page', body };
  const result = { doc: { body } };
  const out = encode(result, withPostedDraftMappings(result, undefined, draft, ['doc'])).doc as {
    body: typeof body;
  };
  assert.equal(
    stegaSource(out.body[0].children[0].text)?.path,
    'body[_key=="b"].children[_key=="s"].text',
  );
});

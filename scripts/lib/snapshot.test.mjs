// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Run by `npm run test:scripts` (node --test). Covers the pure parts of
// scripts/snapshot.mjs and one round trip through the local query server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSnapshotServer,
  fromNdjson,
  listen,
  paramsFromSearch,
  snapshotClientOptions,
  snapshotProjectEnv,
  toNdjson,
} from '../snapshot.mjs';

const docs = [
  { _id: 'b', _type: 'page', slug: { current: 'ministers' }, title: 'Ministers' },
  { _id: 'a', _type: 'page', slug: { current: 'visit' }, title: 'Visit' },
];

test('snapshotClientOptions is empty unless SANITY_SNAPSHOT_URL is set', () => {
  assert.deepEqual(snapshotClientOptions({}), {});
  assert.deepEqual(snapshotClientOptions({ SANITY_SNAPSHOT_URL: '  ' }), {});
  const o = snapshotClientOptions({ SANITY_SNAPSHOT_URL: 'http://127.0.0.1:1' });
  assert.equal(o.apiHost, 'http://127.0.0.1:1');
  assert.equal(o.useProjectHostname, false);
  assert.equal(o.token, undefined);
});

test('snapshotProjectEnv reads the project from an asset URL only when none is set', () => {
  const asset = {
    _id: 'image-x',
    _type: 'sanity.imageAsset',
    url: 'https://cdn.sanity.io/images/abc123/production/x-10x10.jpg',
  };
  assert.deepEqual(snapshotProjectEnv([...docs, asset], {}), {
    PUBLIC_SANITY_PROJECT_ID: 'abc123',
    PUBLIC_SANITY_DATASET: 'production',
  });
  assert.deepEqual(snapshotProjectEnv([asset], { PUBLIC_SANITY_PROJECT_ID: 'set' }), {});
  assert.equal(snapshotProjectEnv(docs, { PUBLIC_SANITY_PROJECT_ID: ' ' }), null);
});

test('ndjson round-trips and is sorted by _id', () => {
  const text = toNdjson(docs);
  assert.equal(JSON.parse(text.split('\n')[0])._id, 'a');
  assert.deepEqual(
    fromNdjson(text).map((d) => d._id),
    ['a', 'b'],
  );
});

test('paramsFromSearch reads $name=<json>', () => {
  const p = paramsFromSearch(new URLSearchParams('query=x&$slug=%22visit%22&$n=3'));
  assert.deepEqual(p, { slug: 'visit', n: 3 });
});

test('the server answers GET and POST queries like the Sanity API', async () => {
  const { server, url } = await listen(createSnapshotServer(docs));
  try {
    const q = '*[_type == "page" && slug.current == $slug][0]{title}';
    const get = await fetch(
      `${url}/v2026-05-01/data/query/production?query=${encodeURIComponent(q)}&$slug=${encodeURIComponent('"ministers"')}`,
    );
    assert.deepEqual((await get.json()).result, { title: 'Ministers' });
    const post = await fetch(`${url}/v2026-05-01/data/query/production`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'count(*[_type == "page"])', params: {} }),
    });
    assert.equal((await post.json()).result, 2);
    const bad = await fetch(`${url}/v1/data/query/production?query=${encodeURIComponent('*[')}`);
    assert.equal(bad.status, 400);
  } finally {
    server.close();
  }
});

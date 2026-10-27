// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The latest-video block's feed reader (src/lib/youtube-feed.ts). The fixture's entries are invented.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  channelIdFrom,
  decodeXml,
  fetchFeed,
  latestVideo,
  loadLatestVideo,
  parseYoutubeFeed,
  resetYoutubeFeeds,
} from './youtube-feed.ts';

const FEED = readFileSync(new URL('./fixtures/youtube-feed.xml', import.meta.url), 'utf8');
const NOW = new Date('2026-10-21T16:00:00Z');
const CHANNEL = 'UCabcdefghijklmnopqrstuv';
const quiet = () => {};

const answer =
  (body: string, status = 200) =>
  async () =>
    new Response(body, { status });

test('the feed parses, entities decoded, malformed entries dropped', () => {
  const entries = parseYoutubeFeed(FEED);
  assert.equal(entries.length, 3);
  assert.equal(entries[1].title, 'Tools & Tips – the full talk');
  assert.equal(entries[0].views, 0);
  assert.equal(decodeXml('&#8217;&#x2014;&quot;'), '’—"');
  assert.deepEqual(parseYoutubeFeed('<html>error</html>'), []);
  assert.deepEqual(parseYoutubeFeed(null), []);
});

test('the latest watched video, never the scheduled stream', () => {
  const v = latestVideo(parseYoutubeFeed(FEED), NOW)!;
  assert.equal(v.videoId, 'latestBBBBB');
  assert.equal(v.watchUrl, 'https://www.youtube.com/watch?v=latestBBBBB');
  assert.match(v.embedUrl, /^https:\/\/www\.youtube-nocookie\.com\/embed\/latestBBBBB\?/);
  assert.equal(v.thumbnailUrl, 'https://i.ytimg.com/vi/latestBBBBB/hqdefault.jpg');
  // Nothing published yet, or only the scheduled one: nothing to show.
  assert.equal(latestVideo(parseYoutubeFeed(FEED), new Date('2026-01-01T00:00:00Z')), null);
  assert.equal(latestVideo([], NOW), null);
});

test('an entry with no view count is kept', () => {
  const v = latestVideo(
    [{ videoId: 'aaaaaaaaaaa', title: 't', published: '2026-10-01T00:00:00Z', views: null }],
    NOW,
  );
  assert.equal(v?.videoId, 'aaaaaaaaaaa');
});

test('the channel id comes out of a pasted link, and a handle is refused', () => {
  assert.equal(channelIdFrom(CHANNEL), CHANNEL);
  assert.equal(channelIdFrom(`https://www.youtube.com/channel/${CHANNEL}/videos`), CHANNEL);
  assert.equal(channelIdFrom('https://www.youtube.com/@example'), '');
  assert.equal(channelIdFrom(''), '');
  assert.equal(channelIdFrom(undefined), '');
});

test('fetchFeed retries once, then gives up with null and never throws', async () => {
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls === 1) throw new Error('network down');
    return new Response(FEED);
  };
  assert.ok(await fetchFeed('https://x.test', (t) => t.includes('<feed'), 'x', flaky, 50, quiet));
  assert.equal(calls, 2);
  assert.equal(
    await fetchFeed('https://x.test', () => true, 'x', answer('nope', 500), 50, quiet),
    null,
  );
  assert.equal(
    await fetchFeed('https://x.test', (t) => t.includes('<feed'), 'x', answer('<html>'), 50, quiet),
    null,
  );
});

test('fetchFeed times out a feed that never answers', async () => {
  const hang = (_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) =>
      init?.signal?.addEventListener('abort', () =>
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      ),
    );
  assert.equal(await fetchFeed('https://x.test', () => true, 'x', hang, 20, quiet), null);
});

test('loadLatestVideo: no channel, a failing feed and a good feed', async () => {
  resetYoutubeFeeds();
  const never = async (): Promise<Response> => {
    throw new Error('must not be called');
  };
  assert.equal(await loadLatestVideo('', never), null);
  assert.equal(await loadLatestVideo('@handle', never), null);

  const originalWarn = console.warn;
  console.warn = quiet;
  try {
    assert.equal(await loadLatestVideo(CHANNEL, answer('boom', 503), NOW), null);
  } finally {
    console.warn = originalWarn;
  }

  resetYoutubeFeeds();
  let calls = 0;
  const good = async () => {
    calls++;
    return new Response(FEED);
  };
  assert.equal((await loadLatestVideo(CHANNEL, good, NOW))?.videoId, 'latestBBBBB');
  assert.equal((await loadLatestVideo(CHANNEL, good, NOW))?.videoId, 'latestBBBBB');
  assert.equal(calls, 1, 'one fetch per channel per build');
  resetYoutubeFeeds();
});

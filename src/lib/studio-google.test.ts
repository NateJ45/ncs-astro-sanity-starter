// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Studio kit, PORTS.md card 136: GA4 and Search Console for Home (src/lib/studio-google.ts).
// fetch is mocked throughout with fixture answers shaped like Google's; nothing calls Google.

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GOOGLE_TOKEN_URL, GoogleTokens } from './google-auth.ts';
import {
  failureKind,
  ga4Group,
  ga4PropertyId,
  ga4Report,
  ga4Requests,
  ga4Url,
  loadGa4,
  loadSearch,
  pagePath,
  periodCompare,
  pickProvider,
  positionWords,
  searchConsoleSite,
  searchReady,
  searchReport,
  searchRequests,
  searchUrl,
  searchWindow,
  windowWords,
  type Ga4Answer,
  siteData,
  type GoogleEnv,
  type SiteDataBinding,
} from './studio-google.ts';

const NOW = new Date('2026-10-18T15:00:00Z');
const TAG = 'a'.repeat(32);
const CF: GoogleEnv = {
  CF_ANALYTICS_TOKEN: 't',
  CF_ACCOUNT_ID: TAG,
  CF_WEB_ANALYTICS_SITE_TAG: TAG,
};

let KEY = '';
before(async () => {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
  KEY = JSON.stringify({
    type: 'service_account',
    client_email: 'studio@test.iam.gserviceaccount.com',
    private_key: pem,
  });
});

const ga4Env = (extra: GoogleEnv = {}): GoogleEnv => ({
  GA4_PROPERTY_ID: '123456789',
  GOOGLE_SERVICE_ACCOUNT: KEY,
  ...extra,
});

// -----------------------------------------------------------------------------
// Fixtures, shaped like Google's answers
// -----------------------------------------------------------------------------

const row = (dims: string[], metric: number) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: [{ value: String(metric) }],
});

/** A batchRunReports answer: daily sessions, pages, ways in this week and the week before. */
const GA4_FIXTURE: Ga4Answer = {
  reports: [
    {
      rows: [
        row(['20260921'], 3), // the oldest chart day
        row(['20261005'], 10),
        row(['20261011'], 20), // last day of the week before
        row(['20261012'], 30), // first day of the last seven
        row(['20261018'], 40),
      ],
    },
    {
      rows: [
        row(['/'], 120),
        row(['/plan-your-visit/'], 44),
        row(['/studio/structure'], 99), // the editor's own visits: left out
        row(['/sermons/?page=2'], 6),
        row(['/sermons/'], 10),
      ],
    },
    {
      rows: [
        row(['Organic Search', 'google', 'organic'], 25),
        row(['Direct', '(direct)', '(none)'], 20),
        row(['AI Assistant', 'chatgpt.com', 'ai-assistant'], 6),
        row(['Referral', 'perplexity.ai', 'referral'], 2), // fallback list
        row(['Unassigned', 'claude', '(not set)'], 1), // bare name, fallback list
        row(['Organic Social', 'm.facebook.com', 'referral'], 9),
        row(['Referral', 'hamiltonohio.gov', 'referral'], 4),
        row(['Referral', 'example.org', 'referral'], 50), // our own host: left out
        row(['Unassigned', '(not set)', '(not set)'], 3),
      ],
    },
    {
      rows: [
        row(['AI Assistant', 'gemini.google.com', 'ai-assistant'], 2),
        row(['Organic Search', 'google', 'organic'], 30),
      ],
    },
  ],
};

const GSC = {
  totals: { rows: [{ clicks: 84, impressions: 3120, ctr: 0.027, position: 8.43 }] },
  before: { rows: [{ clicks: 70, impressions: 3000, ctr: 0.023, position: 9.6 }] },
  queries: {
    rows: [
      { keys: ['first baptist auburn'], clicks: 40, impressions: 200, position: 1.2 },
      { keys: ['churches near me'], clicks: 12, impressions: 900, position: 7.4 },
      { keys: ['hamilton ohio church times'], clicks: 5, impressions: 80, position: 4 },
    ],
  },
  pages: {
    rows: [
      { keys: ['https://example.org/'], clicks: 50, impressions: 1000 },
      { keys: ['https://example.org/plan-your-visit/'], clicks: 20, impressions: 400 },
    ],
  },
};

// -----------------------------------------------------------------------------
// Settings and the provider
// -----------------------------------------------------------------------------

describe('settings', () => {
  it('reads a numeric GA4 property id, never a G- measurement id', () => {
    assert.equal(ga4PropertyId('123456789'), '123456789');
    assert.equal(ga4PropertyId('properties/123456789'), '123456789');
    assert.equal(ga4PropertyId('G-ABC123XYZ'), null);
    assert.equal(ga4PropertyId(undefined), null);
  });

  it('reads domain and URL-prefix Search Console properties', () => {
    assert.equal(searchConsoleSite('sc-domain:example.org'), 'sc-domain:example.org');
    assert.equal(searchConsoleSite('https://example.org'), 'https://example.org/');
    assert.equal(searchConsoleSite('https://example.org/'), 'https://example.org/');
    assert.equal(searchConsoleSite('example.org'), null);
    assert.equal(searchConsoleSite(''), null);
  });

  it('picks Cloudflare first when nothing is asked, so card 115 sites keep their numbers', () => {
    assert.equal(pickProvider({}), null);
    assert.equal(pickProvider(CF), 'cloudflare');
    assert.equal(pickProvider(ga4Env()), 'ga4');
    assert.equal(pickProvider({ ...CF, ...ga4Env() }), 'cloudflare');
  });

  it('ANALYTICS_PROVIDER wins, and names a source only when that source is set up', () => {
    assert.equal(pickProvider({ ...CF, ...ga4Env({ ANALYTICS_PROVIDER: 'ga4' }) }), 'ga4');
    assert.equal(pickProvider({ ...CF, ANALYTICS_PROVIDER: 'ga4' }), null);
    assert.equal(pickProvider({ ...ga4Env(), ANALYTICS_PROVIDER: 'cloudflare' }), null);
    assert.equal(pickProvider({ ...CF, ANALYTICS_PROVIDER: ' Cloudflare ' }), 'cloudflare');
  });

  it('Search Console is set up only with a property and a key', () => {
    assert.equal(searchReady({}), false);
    assert.equal(searchReady({ SEARCH_CONSOLE_SITE: 'sc-domain:example.org' }), false);
    assert.equal(
      searchReady({ SEARCH_CONSOLE_SITE: 'sc-domain:example.org', GOOGLE_SERVICE_ACCOUNT: '{}' }),
      true,
    );
  });
});

// -----------------------------------------------------------------------------
// GA4
// -----------------------------------------------------------------------------

describe('GA4 ways in', () => {
  it("puts GA4's own AI Assistant channel and the ai-assistant medium straight into AI assistants", () => {
    assert.equal(ga4Group('AI Assistant', 'chatgpt.com', 'ai-assistant'), 'ai');
    assert.equal(ga4Group('Referral', 'someassistant.example', 'ai-assistant'), 'ai');
  });

  it('falls back to the source name list for AI sessions filed elsewhere', () => {
    for (const src of [
      'chatgpt.com',
      'chatgpt',
      'perplexity',
      'perplexity.ai',
      'copilot.microsoft.com',
      'gemini.google.com',
      'claude.ai',
      'claude',
    ]) {
      assert.equal(ga4Group('Referral', src, 'referral'), 'ai', src);
    }
  });

  it('maps the other default channels onto the card groups', () => {
    assert.equal(ga4Group('Organic Search', 'google', 'organic'), 'search');
    assert.equal(ga4Group('Paid Search', 'google', 'cpc'), 'search');
    assert.equal(ga4Group('Direct', '(direct)', '(none)'), 'direct');
    assert.equal(ga4Group('Organic Social', 'facebook.com', 'referral'), 'social');
    assert.equal(ga4Group('Referral', 'hamiltonohio.gov', 'referral'), 'other');
    assert.equal(ga4Group('Unassigned', '(not set)', '(not set)'), 'other');
    assert.equal(ga4Group('Unassigned', 'bing', 'organic'), 'search');
    assert.equal(ga4Group('Email', 'newsletter', 'email'), 'other');
  });

  it('leaves out referrals from the site itself', () => {
    assert.equal(ga4Group('Referral', 'www.example.org', 'referral', 'example.org'), null);
  });
});

describe('GA4 report', () => {
  it('asks for sessions, pages and ways in over the card windows', () => {
    const [daily, pages, ways, wayBefore] = ga4Requests(NOW);
    assert.deepEqual(daily.dateRanges, [{ startDate: '2026-09-21', endDate: '2026-10-18' }]);
    assert.deepEqual(daily.metrics, [{ name: 'sessions' }]);
    assert.deepEqual(pages.dimensions, [{ name: 'pagePath' }]);
    assert.deepEqual(pages.metrics, [{ name: 'screenPageViews' }]);
    assert.deepEqual(ways.dateRanges, [{ startDate: '2026-10-12', endDate: '2026-10-18' }]);
    assert.deepEqual(wayBefore.dateRanges, [{ startDate: '2026-10-05', endDate: '2026-10-11' }]);
    assert.deepEqual(
      ways.dimensions.map((d) => d.name),
      ['sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium'],
    );
    assert.equal(
      ga4Url('123'),
      'https://analyticsdata.googleapis.com/v1beta/properties/123:batchRunReports',
    );
  });

  it('maps the fixture onto the same shape the Cloudflare source makes', () => {
    const r = ga4Report(GA4_FIXTURE, NOW, 'example.org');
    assert.equal(r.provider, 'ga4');
    assert.equal(r.days.length, 28);
    assert.deepEqual(r.days[0], { date: '2026-09-21', visits: 3 });
    assert.deepEqual(r.days.at(-1), { date: '2026-10-18', visits: 40 });
    assert.equal(r.thisWeek, 70);
    assert.equal(r.lastWeek, 30);
    assert.deepEqual(r.pages, [
      { path: '/', views: 120 },
      { path: '/plan-your-visit/', views: 44 },
      { path: '/sermons/', views: 16 },
    ]);
    assert.deepEqual(
      r.sources.map((s) => [s.group, s.visits]),
      [
        ['search', 25],
        ['direct', 20],
        ['ai', 9],
        ['social', 9],
        ['other', 7],
      ],
    );
    assert.equal(r.sources.find((s) => s.group === 'ai')?.label, 'AI assistants');
    assert.deepEqual(r.ai, { thisWeek: 9, lastWeek: 2 });
  });

  it('refuses an answer without all four reports, rather than showing zeros', () => {
    assert.throws(() => ga4Report({ reports: [{ rows: [] }] }, NOW));
    assert.throws(() => ga4Report({}, NOW));
  });
});

// -----------------------------------------------------------------------------
// Search Console
// -----------------------------------------------------------------------------

describe('Search Console report', () => {
  it('reads 28 days ending three days ago, against the 28 before', () => {
    assert.deepEqual(searchWindow(NOW), {
      startDate: '2026-09-18',
      endDate: '2026-10-15',
      beforeStart: '2026-08-21',
      beforeEnd: '2026-09-17',
    });
    const b = searchRequests(NOW);
    assert.deepEqual(b.queries.dimensions, ['query']);
    assert.equal(b.queries.rowLimit, 5);
    assert.deepEqual(b.pages.dimensions, ['page']);
    assert.equal('dimensions' in b.totals, false);
    assert.equal(
      searchUrl('sc-domain:example.org'),
      'https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Aexample.org/searchAnalytics/query',
    );
  });

  it('maps the fixture onto the card', () => {
    const r = searchReport(GSC, NOW);
    assert.equal(r.clicks, 84);
    assert.equal(r.clicksBefore, 70);
    assert.equal(r.impressions, 3120);
    assert.equal(r.position, 8.4);
    assert.equal(r.positionBefore, 9.6);
    assert.deepEqual(r.queries[0], { query: 'first baptist auburn', clicks: 40, impressions: 200 });
    assert.deepEqual(
      r.pages.map((p) => p.path),
      ['/', '/plan-your-visit/'],
    );
    assert.equal(r.from, '2026-09-18');
    assert.equal(r.to, '2026-10-15');
  });

  it('an empty property is zeros and no position, not an error', () => {
    const r = searchReport({ totals: {}, before: { rows: [] }, queries: {}, pages: {} }, NOW);
    assert.equal(r.clicks, 0);
    assert.equal(r.position, null);
    assert.deepEqual(r.queries, []);
  });

  it('page URLs become paths', () => {
    assert.equal(pagePath('https://example.org/about/?x=1'), '/about/');
    assert.equal(pagePath('not a url'), 'not a url');
  });
});

describe('plain words', () => {
  it('compares four weeks with the four before', () => {
    assert.equal(periodCompare(0, 0, 'click', 'clicks'), 'None yet in the last eight weeks.');
    assert.equal(
      periodCompare(84, 70, 'click', 'clicks'),
      '14 more clicks than the four weeks before (up 20%).',
    );
    assert.equal(
      periodCompare(50, 100, 'time', 'times'),
      '50 fewer times than the four weeks before (down 50%).',
    );
    assert.equal(
      periodCompare(101, 100, 'click', 'clicks'),
      'About the same as the four weeks before.',
    );
  });

  it('says which way the average place moved (lower is better)', () => {
    assert.equal(positionWords(null, 3), 'Not shown in Google results yet.');
    assert.match(positionWords(8.4, 9.6), /1\.2 places higher than before/);
    assert.match(positionWords(12, 9), /past the first page.*3 places lower/);
  });

  it('names the window in US dates', () => {
    assert.equal(windowWords('2026-09-18', '2026-10-15'), 'Sep 18 to Oct 15');
  });
});

// -----------------------------------------------------------------------------
// The whole path, with fetch mocked
// -----------------------------------------------------------------------------

/** A fake Google: the token endpoint plus one API, with a status per API call. */
function fakeGoogle(api: (url: string, body: unknown) => { status: number; body: unknown }) {
  const calls: string[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    calls.push(url);
    if (!/^https:\/\/[a-z0-9]+\.googleapis\.com\//.test(url)) throw new Error(`unexpected ${url}`);
    if (url === GOOGLE_TOKEN_URL) {
      return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), {
        status: 200,
      });
    }
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer tok');
    const a = api(url, JSON.parse(String(init?.body ?? '{}')));
    return new Response(JSON.stringify(a.body), { status: a.status });
  };
  return { calls, fetchImpl };
}

describe('loading, with fetch mocked', () => {
  it('GA4: one token, one batch call, the card shape back', async () => {
    const g = fakeGoogle(() => ({ status: 200, body: GA4_FIXTURE }));
    const r = await loadGa4(ga4Env(), NOW, 'example.org', new GoogleTokens(), g.fetchImpl);
    assert.equal(r.thisWeek, 70);
    assert.deepEqual(g.calls, [GOOGLE_TOKEN_URL, ga4Url('123456789')]);
  });

  it('Search Console: the token is fetched once for the four queries', async () => {
    const g = fakeGoogle((_url, body) => {
      const b = body as { dimensions?: string[]; startDate: string };
      if (b.dimensions?.[0] === 'query') return { status: 200, body: GSC.queries };
      if (b.dimensions?.[0] === 'page') return { status: 200, body: GSC.pages };
      return { status: 200, body: b.startDate === '2026-09-18' ? GSC.totals : GSC.before };
    });
    const env = { SEARCH_CONSOLE_SITE: 'sc-domain:example.org', GOOGLE_SERVICE_ACCOUNT: KEY };
    const r = await loadSearch(env, NOW, new GoogleTokens(), g.fetchImpl);
    assert.equal(r.clicks, 84);
    assert.equal(r.clicksBefore, 70);
    assert.equal(g.calls.filter((u) => u === GOOGLE_TOKEN_URL).length, 1);
    assert.equal(g.calls.length, 5);
  });

  it('a 403 (the service account is not a user on the property) says "finish connecting"', async () => {
    const g = fakeGoogle(() => ({ status: 403, body: { error: { status: 'PERMISSION_DENIED' } } }));
    const err = await loadGa4(ga4Env(), NOW, undefined, new GoogleTokens(), g.fetchImpl).catch(
      (e) => e,
    );
    assert.equal(failureKind(err), 'connect');
    const env = { SEARCH_CONSOLE_SITE: 'sc-domain:example.org', GOOGLE_SERVICE_ACCOUNT: KEY };
    const err2 = await loadSearch(env, NOW, new GoogleTokens(), g.fetchImpl).catch((e) => e);
    assert.equal(failureKind(err2), 'connect');
  });

  it('a pasted key that is not a key also says "finish connecting", before any call', async () => {
    const g = fakeGoogle(() => ({ status: 200, body: GA4_FIXTURE }));
    const err = await loadGa4(
      ga4Env({ GOOGLE_SERVICE_ACCOUNT: 'oops' }),
      NOW,
      undefined,
      new GoogleTokens(),
      g.fetchImpl,
    ).catch((e) => e);
    assert.equal(failureKind(err), 'connect');
    assert.equal(g.calls.length, 0);
  });

  it('Google having a bad moment (500) is "could not load", not a set-up problem', async () => {
    const g = fakeGoogle(() => ({ status: 500, body: {} }));
    const err = await loadGa4(ga4Env(), NOW, undefined, new GoogleTokens(), g.fetchImpl).catch(
      (e) => e,
    );
    assert.equal(failureKind(err), 'failed');
    assert.equal(failureKind(new Error('x')), 'failed');
  });

  it('a 401 from the API drops the cached token so the next try signs in afresh', async () => {
    const tokens = new GoogleTokens();
    let status = 401;
    const g = fakeGoogle(() => ({ status, body: GA4_FIXTURE }));
    await loadGa4(ga4Env(), NOW, undefined, tokens, g.fetchImpl).catch(() => null);
    status = 200;
    await loadGa4(ga4Env(), NOW, undefined, tokens, g.fetchImpl);
    assert.equal(g.calls.filter((u) => u === GOOGLE_TOKEN_URL).length, 2);
  });
});

// -----------------------------------------------------------------------------
// The routes fail closed (read as text: they import cloudflare:workers, which
// bare Node cannot load). Both checks come before any setting is read.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Through studio-status (the SITE_DATA service binding), mocked
// -----------------------------------------------------------------------------

/** A mock of studio-status's SiteData entrypoint that records what it was asked. */
function mockSiteData(
  ga4: Awaited<ReturnType<SiteDataBinding['siteAnalytics']>>,
  search: Awaited<ReturnType<SiteDataBinding['searchConsole']>>,
) {
  const asked: Array<{ method: string; key: string; body: unknown }> = [];
  const binding: SiteDataBinding = {
    async siteAnalytics(key, requests) {
      asked.push({ method: 'siteAnalytics', key, body: requests });
      return ga4;
    },
    async searchConsole(key, queries) {
      asked.push({ method: 'searchConsole', key, body: queries });
      return search;
    },
  };
  return { asked, binding };
}

/** fetch that fails the test if anything reaches it: the binding path never calls Google itself. */
const noFetch = async (url: string): Promise<Response> => {
  throw new Error(`fetch called: ${url}`);
};

describe('through studio-status (SITE_DATA binding)', () => {
  const OK_SEARCH = { ok: true as const, answers: GSC };
  const OK_GA4 = { ok: true as const, reports: GA4_FIXTURE.reports as unknown[] };

  it('needs both the binding and a site key', () => {
    const { binding } = mockSiteData(OK_GA4, OK_SEARCH);
    assert.equal(siteData({ SITE_DATA: binding }), null);
    assert.equal(siteData({ SITE_DATA_KEY: 'fbcm' }), null);
    assert.equal(siteData({ SITE_DATA: binding, SITE_DATA_KEY: 'Not A Key!' }), null);
    assert.equal(siteData({ SITE_DATA: binding, SITE_DATA_KEY: 'fbcm' })?.key, 'fbcm');
    assert.equal(pickProvider({ SITE_DATA: binding, SITE_DATA_KEY: 'fbcm' }), 'ga4');
    assert.equal(searchReady({ SITE_DATA: binding, SITE_DATA_KEY: 'fbcm' }), true);
    // Cloudflare still comes first when nothing is asked; ANALYTICS_PROVIDER switches.
    assert.equal(pickProvider({ ...CF, SITE_DATA: binding, SITE_DATA_KEY: 'fbcm' }), 'cloudflare');
    assert.equal(
      pickProvider({ ...CF, SITE_DATA: binding, SITE_DATA_KEY: 'fbcm', ANALYTICS_PROVIDER: 'ga4' }),
      'ga4',
    );
  });

  it('GA4: sends the four report bodies under the site key and maps the answer', async () => {
    const { asked, binding } = mockSiteData(OK_GA4, OK_SEARCH);
    const r = await loadGa4(
      { SITE_DATA: binding, SITE_DATA_KEY: 'fbcm' },
      NOW,
      'example.org',
      new GoogleTokens(),
      noFetch,
    );
    assert.equal(r.provider, 'ga4');
    assert.equal(r.thisWeek, 70);
    assert.deepEqual(r.ai, { thisWeek: 9, lastWeek: 2 });
    assert.equal(asked.length, 1);
    assert.equal(asked[0].key, 'fbcm');
    assert.deepEqual(asked[0].body, ga4Requests(NOW));
  });

  it('the binding wins over a fallback key, and no Google call is made here', async () => {
    const { asked, binding } = mockSiteData(OK_GA4, OK_SEARCH);
    await loadGa4(
      ga4Env({ SITE_DATA: binding, SITE_DATA_KEY: 'fbcm' }),
      NOW,
      undefined,
      new GoogleTokens(),
      noFetch,
    );
    assert.equal(asked.length, 1);
  });

  it('Search Console: sends the four named queries and maps the answers', async () => {
    const { asked, binding } = mockSiteData(OK_GA4, OK_SEARCH);
    const r = await loadSearch(
      { SITE_DATA: binding, SITE_DATA_KEY: 'reid' },
      NOW,
      new GoogleTokens(),
      noFetch,
    );
    assert.equal(r.clicks, 84);
    assert.equal(r.position, 8.4);
    assert.deepEqual(asked[0].body, searchRequests(NOW));
    assert.equal(asked[0].key, 'reid');
  });

  it('no Search Console property for the site keeps the card hidden', async () => {
    const { binding } = mockSiteData(OK_GA4, { ok: false, reason: 'not-set-up' });
    const err = await loadSearch(
      { SITE_DATA: binding, SITE_DATA_KEY: 'fbcm' },
      NOW,
      new GoogleTokens(),
      noFetch,
    ).catch((e) => e);
    assert.equal(failureKind(err), 'not-set-up');
  });

  it('a 403 at Google, an unknown key or no key in studio-status say "finish connecting"', async () => {
    for (const reason of ['connect', 'unknown-site', 'no-key'] as const) {
      const { binding } = mockSiteData({ ok: false, reason }, { ok: false, reason });
      const env = { SITE_DATA: binding, SITE_DATA_KEY: 'fbcm' };
      const a = await loadGa4(env, NOW, undefined, new GoogleTokens(), noFetch).catch((e) => e);
      const b = await loadSearch(env, NOW, new GoogleTokens(), noFetch).catch((e) => e);
      assert.equal(failureKind(a), 'connect', reason);
      assert.equal(failureKind(b), 'connect', reason);
    }
  });

  it('Google down, or studio-status not answering at all, is "could not load"', async () => {
    const { binding } = mockSiteData(
      { ok: false, reason: 'failed' },
      { ok: false, reason: 'failed' },
    );
    const env = { SITE_DATA: binding, SITE_DATA_KEY: 'fbcm' };
    const a = await loadGa4(env, NOW, undefined, new GoogleTokens(), noFetch).catch((e) => e);
    assert.equal(failureKind(a), 'failed');
    const broken: SiteDataBinding = {
      siteAnalytics: async () => {
        throw new Error('The RPC receiver does not implement the method "siteAnalytics".');
      },
      searchConsole: async () => {
        throw new Error('no entrypoint');
      },
    };
    const b = await loadGa4(
      { SITE_DATA: broken, SITE_DATA_KEY: 'fbcm' },
      NOW,
      undefined,
      new GoogleTokens(),
      noFetch,
    ).catch((e) => e);
    assert.equal(failureKind(b), 'failed');
  });
});

describe('routes fail closed', () => {
  for (const file of ['visitors.ts', 'search.ts']) {
    it(`${file}: same origin, then a Sanity member, then the settings`, () => {
      const src = readFileSync(new URL(`../pages/api/studio/${file}`, import.meta.url), 'utf8');
      const body = src.slice(src.indexOf('export const GET'));
      const origin = body.indexOf('isSameOrigin(request)');
      const member = body.indexOf('verifyStudioUser(');
      const settings = Math.max(body.indexOf('pickProvider('), body.indexOf('searchReady('));
      assert.ok(origin > 0 && member > origin && settings > member, file);
      assert.match(body, /return json\(\{ error: 'Not allowed\.' \}, 403\)/);
      assert.match(body, /, 401\)/);
      assert.match(src, /'Cache-Control': 'private, no-store'/);
      assert.ok(!/console\.\w+\([^)]*(token|GOOGLE_SERVICE_ACCOUNT|private_key)/.test(src), file);
    });
  }
});

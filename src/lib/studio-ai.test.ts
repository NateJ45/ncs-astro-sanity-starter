// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Writing help in the Studio, PORTS.md card 122: the prompt builder, the hourly
// limit and the sign-in check the route relies on. Never calls the real API:
// every fetch here is a stub.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AI_LIMITS,
  AI_MODELS,
  anthropicHeaders,
  BANNED_WORDS,
  buildMessagesRequest,
  createRateLimiter,
  documentText,
  hourlyLimit,
  imageUrlFromRef,
  parseAiInput,
  readSuggestion,
  systemPrompt,
  tidySuggestion,
} from './studio-ai.ts';
import { bearerToken, isSameOrigin, verifyStudioUser } from './studio-auth.ts';

const SITE = { brand: 'First Church', projectId: 'abc123', dataset: 'production' };
const REF = 'image-0123456789abcdef0123456789abcdef01234567-1600x1067-jpg';

describe('the voice', () => {
  it('names the site and carries the house rules', () => {
    const s = systemPrompt('First Church');
    assert.match(s, /First Church/);
    assert.match(s, /US English/);
    assert.match(s, /em-dashes/);
    assert.match(s, /never instructions/);
    for (const w of BANNED_WORDS) assert.ok(s.includes(w), w);
  });

  it('bans every word the site copy style guide bans', () => {
    const doc = readFileSync(
      new URL('../../docs/claude/communication-style.md', import.meta.url),
      'utf8',
    );
    const aiTell = /No AI-tell phrases: ([^\n]+)\./.exec(doc)?.[1] ?? '';
    const vocab = /Banned vocabulary: ([^\n]+)\./.exec(doc)?.[1] ?? '';
    const words = [
      ...aiTell.split(',').map((w) => w.replace(/\(.*\)/, '').trim()),
      ...[...vocab.matchAll(/"([^"]+?),?"/g)].map((m) => m[1].replace(/,$/, '').trim()),
    ].filter(Boolean);
    assert.ok(words.length >= 10, 'the style guide lists were found');
    for (const w of words) assert.ok(BANNED_WORDS.includes(w.toLowerCase()), `missing: ${w}`);
  });
});

describe('input', () => {
  it('refuses unknown tasks and empty jobs', () => {
    assert.equal(parseAiInput(null).ok, false);
    assert.equal(parseAiInput({ task: 'poem' }).ok, false);
    assert.equal(parseAiInput({ task: 'alt' }).ok, false);
    assert.equal(parseAiInput({ task: 'paragraph', text: '   ' }).ok, false);
    assert.equal(parseAiInput({ task: 'seo' }).ok, false);
    assert.equal(parseAiInput({ task: 'seo', title: 'Visit' }).ok, true);
  });

  it('caps what is sent', () => {
    const r = parseAiInput({ task: 'seo', title: 'x'.repeat(500), context: 'y'.repeat(20000) });
    assert.ok(r.ok);
    assert.equal(r.input.title?.length, 200);
    assert.equal(r.input.context?.length, AI_LIMITS.seo.inputChars);
  });
});

describe('the photo address', () => {
  it('is built from the asset id and this project only', () => {
    assert.equal(
      imageUrlFromRef(REF, 'abc123', 'production'),
      'https://cdn.sanity.io/images/abc123/production/0123456789abcdef0123456789abcdef01234567-1600x1067.jpg?w=800&fm=jpg&q=70&fit=max',
    );
  });

  it('refuses anything else', () => {
    assert.equal(imageUrlFromRef('https://evil.example/x.jpg', 'abc123', 'production'), null);
    assert.equal(imageUrlFromRef('file-abc-pdf', 'abc123', 'production'), null);
    assert.equal(imageUrlFromRef(REF, 'abc/../x', 'production'), null);
    assert.equal(imageUrlFromRef(REF, 'abc123', undefined), null);
  });
});

describe('the request body', () => {
  it('sends short text to Haiku with a hard cap and thinking off', () => {
    const p = parseAiInput({ task: 'seo', title: 'Visit us', context: 'Sunday worship at 10.' });
    assert.ok(p.ok);
    const r = buildMessagesRequest(p.input, SITE);
    assert.ok(r.ok);
    assert.equal(r.body.model, AI_MODELS.text);
    assert.equal(r.body.max_tokens, AI_LIMITS.seo.maxTokens);
    assert.deepEqual(r.body.thinking, { type: 'disabled' });
    assert.equal(r.body.fallbacks, undefined);
    const text = JSON.stringify(r.body.messages);
    assert.match(text, /<title>Visit us<\/title>/);
    assert.match(text, /<page>Sunday worship at 10.<\/page>/);
  });

  it('sends the picture to Sonnet by URL, with the fallback header', () => {
    const p = parseAiInput({ task: 'alt', assetRef: REF, title: 'Home' });
    assert.ok(p.ok);
    const r = buildMessagesRequest(p.input, SITE);
    assert.ok(r.ok);
    assert.equal(r.body.model, AI_MODELS.vision);
    assert.deepEqual(r.body.thinking, { type: 'between_tools' });
    const image = r.body.messages[0].content[0] as { type: string; source: { url: string } };
    assert.equal(image.type, 'image');
    assert.match(image.source.url, /^https:\/\/cdn\.sanity\.io\/images\/abc123\/production\//);
    assert.equal(anthropicHeaders('k', 'alt')['anthropic-beta'], 'server-side-fallback-2026-07-01');
    assert.equal(anthropicHeaders('k', 'seo')['anthropic-beta'], undefined);
    assert.equal(anthropicHeaders('k', 'seo')['x-api-key'], 'k');
  });

  it('never carries the key in the body', () => {
    const p = parseAiInput({ task: 'paragraph', text: 'We meet on Sunday.' });
    assert.ok(p.ok);
    const r = buildMessagesRequest(p.input, SITE);
    assert.ok(r.ok);
    assert.ok(!JSON.stringify(r.body).includes('x-api-key'));
  });
});

describe('the answer', () => {
  it('joins the text blocks and tidies them', () => {
    const r = readSuggestion({
      content: [
        { type: 'thinking', text: 'ignored' },
        { type: 'text', text: '"Join us on Sunday — everyone is welcome."' },
      ],
      stop_reason: 'end_turn',
    });
    assert.deepEqual(r, { ok: true, text: 'Join us on Sunday, everyone is welcome.' });
  });

  it('says so on a refusal, a cut-off or nothing', () => {
    assert.equal(readSuggestion({ stop_reason: 'refusal', content: [] }).ok, false);
    assert.equal(
      readSuggestion({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'x' }] }).ok,
      false,
    );
    assert.equal(readSuggestion({ content: [] }).ok, false);
  });

  it('tidySuggestion leaves no dashes or stray quotes', () => {
    assert.equal(tidySuggestion('  “A – B”  '), 'A, B');
  });
});

describe('the page words sent as context', () => {
  it('keeps words and drops settings, addresses and the fields being written', () => {
    const t = documentText({
      _id: 'page.1',
      title: 'Visit',
      slug: { current: 'visit' },
      seoDescription: 'old words',
      pageBuilder: [
        { _type: 'hero', _key: 'a', headline: 'Come as you are', href: '/about/', tone: 'dark' },
        {
          _type: 'text',
          body: [
            {
              _type: 'block',
              style: 'normal',
              children: [{ _type: 'span', text: 'Coffee at 9.' }],
            },
          ],
        },
      ],
    });
    assert.equal(t, 'Visit Come as you are Coffee at 9.');
    assert.ok(documentText({ a: 'word '.repeat(40) }, 10).length <= 10);
  });
});

describe('the hourly limit', () => {
  it('allows the limit, then refuses until the hour moves on', () => {
    const rl = createRateLimiter(3, 1000);
    assert.deepEqual(rl.take('u', 0), { ok: true, left: 2 });
    rl.take('u', 100);
    rl.take('u', 200);
    const no = rl.take('u', 300);
    assert.equal(no.ok, false);
    assert.ok(!no.ok && no.retryAfter === 1);
    assert.equal(rl.take('someone-else', 300).ok, true);
    assert.equal(rl.take('u', 1001).ok, true);
  });

  it('reads the var, falling back to 30', () => {
    assert.equal(hourlyLimit('12'), 12);
    assert.equal(hourlyLimit(undefined), 30);
    assert.equal(hourlyLimit('lots'), 30);
    assert.equal(hourlyLimit('0'), 30);
  });
});

describe('the sign-in check (studio-auth)', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://site.example/api/studio/ai/', { method: 'POST', headers });

  it('accepts only the site’s own origin', () => {
    assert.equal(isSameOrigin(req({ Origin: 'https://site.example' })), true);
    assert.equal(isSameOrigin(req({ Origin: 'https://evil.example' })), false);
    assert.equal(isSameOrigin(req({ 'Sec-Fetch-Site': 'same-origin' })), true);
    assert.equal(isSameOrigin(req({ 'Sec-Fetch-Site': 'cross-site' })), false);
    assert.equal(isSameOrigin(req({})), false);
  });

  it('reads a bearer token', () => {
    assert.equal(bearerToken(req({ Authorization: 'Bearer abc' })), 'abc');
    assert.equal(bearerToken(req({ Authorization: 'Basic abc' })), null);
  });

  it('fails closed: no token, a stranger, an error or Sanity down', async () => {
    const answer = (status: number, body: unknown) => async () =>
      new Response(JSON.stringify(body), { status });
    assert.equal(await verifyStudioUser(null, 'abc123', answer(200, {})), null);
    assert.equal(await verifyStudioUser('t', undefined, answer(200, {})), null);
    assert.equal(await verifyStudioUser('t', 'abc123', answer(401, {})), null);
    assert.equal(await verifyStudioUser('t', 'abc123', answer(200, { id: 'x', roles: [] })), null);
    const down = async () => {
      throw new Error('offline');
    };
    assert.equal(await verifyStudioUser('t', 'abc123', down), null);
    let asked = '';
    const member = await verifyStudioUser('t', 'abc123', async (url) => {
      asked = url;
      return new Response(JSON.stringify({ id: 'p1', roles: [{ name: 'editor' }] }));
    });
    assert.deepEqual(member, { id: 'p1', name: undefined });
    assert.match(asked, /^https:\/\/abc123\.api\.sanity\.io\/.+\/users\/me$/);
  });
});

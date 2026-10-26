// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { embedProviderIds, hashSource, scanHtml, scriptSrc } from './csp.mjs';

const sha = (t) => `'sha256-${createHash('sha256').update(t).digest('base64')}'`;

test('inline scripts are hashed; JSON-LD and external scripts are not', () => {
  const { inline, origins } = scanHtml(
    '<script>a()</script><script type="module">b()</script>' +
      '<script type="application/ld+json">{"x":1}</script>' +
      '<script type="module" src="/_astro/x.js"></script>' +
      '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="{}"></script>',
  );
  assert.deepEqual([...inline], ['a()', 'b()']);
  assert.deepEqual([...origins], ['https://static.cloudflareinsights.com']);
});

test('the scripts inside a srcdoc frame count, decoded', () => {
  const { inline, origins } = scanHtml(
    '<iframe srcdoc="&lt;script&gt;if (a &amp;&amp; b) go(&quot;x&quot;)&lt;/script&gt;&lt;script src=&quot;https://w.example.org/e.js&quot;&gt;&lt;/script&gt;"></iframe>',
  );
  assert.deepEqual([...inline], ['if (a && b) go("x")']);
  assert.deepEqual([...origins], ['https://w.example.org']);
});

test('script-src: self, wasm, origins, then sorted hashes; handlers add unsafe-hashes', () => {
  const plain = scriptSrc(scanHtml('<script>a()</script>'), ['https://www.googletagmanager.com']);
  assert.equal(
    plain,
    `'self' 'wasm-unsafe-eval' https://www.googletagmanager.com ${sha('a()')} 'unsafe-inline'`,
  );
  const withHandler = scriptSrc(scanHtml('<button onclick="go()">x</button>'));
  assert.ok(withHandler.includes("'unsafe-hashes'"));
  assert.ok(withHandler.includes(hashSource('go()')));
});

test('embedProviderIds reads the embed block markers off a page (card 172)', () => {
  const html =
    '<div class="w-full" data-embed-provider="tithely"><script src="x"></script></div><div data-embed-provider="calendly"></div><div data-embed-provider="tithely"></div>';
  assert.deepEqual([...embedProviderIds(html)], ['tithely', 'calendly']);
  assert.equal(embedProviderIds('<p>hello</p>').size, 0);
  assert.equal(embedProviderIds('<div data-embed-provider="Bad Value!"></div>').size, 0);
});

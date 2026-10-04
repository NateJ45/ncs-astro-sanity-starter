// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PLACEHOLDER_NAME,
  PLACEHOLDER_SITE,
  readBrandConfig,
  resolveSiteIdentity,
} from './site-identity.mjs';

const brand = { name: 'Demo Church', domain: 'demochurch.org' };

test('a filled brand config wins over the placeholders when env is empty', () => {
  const r = resolveSiteIdentity({ env: {}, brand });
  assert.equal(r.siteName, 'Demo Church');
  assert.equal(r.site, 'https://demochurch.org');
  assert.deepEqual(r.fallback, { name: false, site: false });
});

test('env wins over the brand config, field by field', () => {
  const r = resolveSiteIdentity({
    env: { SITE_NAME: 'From Env', PUBLIC_SITE_URL: 'https://www.demochurch.org' },
    brand,
  });
  assert.equal(r.siteName, 'From Env');
  assert.equal(r.site, 'https://www.demochurch.org');
  assert.equal(
    resolveSiteIdentity({ env: { SITE_URL: 'https://s.example' }, brand }).site,
    'https://s.example',
  );
  assert.equal(
    resolveSiteIdentity({ env: { PUBLIC_SITE_URL: 'https://a', SITE_URL: 'https://b' }, brand })
      .site,
    'https://a',
  );
});

test('no brand config, or one without the fields: today’s placeholders, flagged', () => {
  for (const b of [undefined, {}, { name: '  ', domain: '' }, { name: 5, domain: null }]) {
    const r = resolveSiteIdentity({ env: {}, brand: b });
    assert.equal(r.siteName, PLACEHOLDER_NAME);
    assert.equal(r.site, PLACEHOLDER_SITE);
    assert.deepEqual(r.fallback, { name: true, site: true });
  }
  assert.equal(PLACEHOLDER_NAME, 'Studio Starter');
  assert.equal(PLACEHOLDER_SITE, 'https://example.com');
});

test('the starter’s own placeholder brand config yields the same output as before', () => {
  const r = resolveSiteIdentity({
    env: {},
    brand: { name: 'Studio Starter', domain: 'example.com' },
  });
  assert.equal(r.siteName, 'Studio Starter');
  assert.equal(r.site, 'https://example.com');
  assert.deepEqual(r.fallback, { name: false, site: false }); // came from the config, not the fallback
});

test('only the missing field falls back', () => {
  const r = resolveSiteIdentity({ env: {}, brand: { name: 'Only Name' } });
  assert.equal(r.siteName, 'Only Name');
  assert.equal(r.site, PLACEHOLDER_SITE);
  assert.deepEqual(r.fallback, { name: false, site: true });
});

test('a domain written with a scheme or trailing slash is normalised', () => {
  assert.equal(
    resolveSiteIdentity({ env: {}, brand: { domain: 'https://demochurch.org/' } }).site,
    'https://demochurch.org',
  );
});

test('an explicitly empty env value still wins, as it did before (?? semantics)', () => {
  const r = resolveSiteIdentity({ env: { SITE_NAME: '' }, brand });
  assert.equal(r.siteName, '');
  assert.equal(r.fallback.name, false);
});

test('readBrandConfig: reads the file, and returns {} for missing, invalid or non-object JSON', () => {
  const root = mkdtempSync(join(tmpdir(), 'site-identity-'));
  try {
    assert.deepEqual(readBrandConfig(root), {}); // no brand/ folder at all
    mkdirSync(join(root, 'brand'));
    const file = join(root, 'brand', 'brand.config.json');
    writeFileSync(file, '{ not json');
    assert.deepEqual(readBrandConfig(root), {});
    writeFileSync(file, '[1,2]');
    assert.deepEqual(readBrandConfig(root), {});
    writeFileSync(file, 'null');
    assert.deepEqual(readBrandConfig(root), {});
    writeFileSync(file, JSON.stringify(brand));
    assert.deepEqual(readBrandConfig(root), brand);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

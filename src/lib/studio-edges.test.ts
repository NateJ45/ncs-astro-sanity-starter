// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The Studio's branded edges (PORTS.md card 120):
//   1. Every Sanity string key we reword still exists in the INSTALLED sanity's
//      English "studio" bundle. Sanity silently falls back to its own text when
//      a key is renamed, so without this an upgrade would undo the wording
//      unnoticed. A failure here means: find the new key name, or drop ours.
//   2. The wording builder and the site's overrides.
//   3. The `sanity:studio` module source and the wordmark picker.
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STUDIO_WORD_KEYS, STUDIO_WORDS, studioWording } from '../sanity/studioWording.ts';
import { studioEdges } from '../sanity/studioEdges.config.ts';
import { pickWordmark, studioConfigModuleSource } from './studio-route.ts';

/** The body of sanity's `defineLocalesResources("studio", { ... })`. */
function installedStudioBundle(): string {
  const require = createRequire(import.meta.url);
  const libDir = join(dirname(require.resolve('sanity/package.json')), 'lib');
  const marker = 'defineLocalesResources("studio", {';
  for (const file of readdirSync(libDir)) {
    if (!file.endsWith('.js')) continue;
    const text = readFileSync(join(libDir, file), 'utf8');
    const at = text.indexOf(marker);
    if (at === -1) continue;
    const end = text.indexOf('\n\t})', at);
    return text.slice(at, end === -1 ? undefined : end);
  }
  throw new Error('Could not find the "studio" locale bundle in node_modules/sanity/lib');
}

describe('studio wording keys exist in the installed sanity', () => {
  const bundle = installedStudioBundle();
  for (const key of STUDIO_WORD_KEYS) {
    it(key, () => {
      assert.ok(
        bundle.includes(`"${key}":`),
        `sanity no longer has the "${key}" string: its own text shows again. Rename or drop it in src/sanity/studioWording.ts.`,
      );
    });
  }
});

describe('studioWording', () => {
  it('fills the site name and the defaults', () => {
    const { subtitle, bundles } = studioWording('Example Church');
    assert.equal(subtitle, 'Sign in to edit the website');
    assert.equal(bundles.length, 1);
    assert.equal(bundles[0].namespace, 'studio');
    const res = bundles[0].resources as Record<string, string>;
    assert.equal(
      res['login.logged-out.generic'],
      'Please sign in again to keep working on Example Church.',
    );
    assert.deepEqual(Object.keys(res).sort(), [...STUDIO_WORD_KEYS].sort());
  });

  it('takes overrides and ignores blanks', () => {
    const { subtitle, bundles } = studioWording('X', {
      loginSubtitle: '  Sign in to update {site}  ',
      words: { 'help-resources.title': 'Sanity help', 'user-menu.action.invite-members': ' ' },
    });
    assert.equal(subtitle, 'Sign in to update {site}');
    const res = bundles[0].resources as Record<string, string>;
    assert.equal(res['help-resources.title'], 'Sanity help');
    assert.equal(
      res['user-menu.action.invite-members'],
      STUDIO_WORDS['user-menu.action.invite-members'],
    );
  });

  it('this site: no em-dashes, every override is a known key', () => {
    const { subtitle, bundles } = studioWording('Site', studioEdges);
    for (const text of [subtitle, ...Object.values(bundles[0].resources)]) {
      assert.ok(!String(text).includes('—'), `em-dash in "${text}"`);
    }
    for (const key of Object.keys(studioEdges.words ?? {})) {
      assert.ok((STUDIO_WORD_KEYS as readonly string[]).includes(key), `unknown key ${key}`);
    }
  });
});

describe('studio route plumbing', () => {
  it('serves the config with basePath "/" (hash history)', () => {
    const src = studioConfigModuleSource('/repo/sanity.config.ts');
    assert.match(src, /^import studioConfig from "\/repo\/sanity\.config\.ts";/);
    assert.match(src, /\{ \.\.\.studioConfig, basePath: '\/' \}/);
  });

  it('picks the built wordmark URL and its shape, with an optional crop', () => {
    const assets = {
      '/src/assets/logo-dark.svg': { src: '/_astro/logo-dark.abc.svg', width: 280, height: 60 },
      '/src/assets/logo.png': '/_astro/logo.png',
    };
    assert.deepEqual(pickWordmark(assets, 'src/assets/logo-dark.svg'), {
      src: '/_astro/logo-dark.abc.svg',
      ratio: 4.667,
    });
    assert.deepEqual(pickWordmark(assets, './src/assets/logo-dark.svg', '64, 4, 200, 44'), {
      src: '/_astro/logo-dark.abc.svg#svgView(viewBox(64,4,200,44))',
      ratio: 4.545,
    });
    assert.deepEqual(pickWordmark(assets, 'src/assets/logo.png', '1,2,3,4'), {
      src: '/_astro/logo.png',
      ratio: null,
    });
    assert.equal(
      pickWordmark(assets, 'src/assets/logo-dark.svg', 'nonsense')?.src,
      '/_astro/logo-dark.abc.svg',
    );
    assert.equal(pickWordmark(assets, 'src/assets/missing.svg'), null);
    assert.equal(pickWordmark(assets, null), null);
  });
});

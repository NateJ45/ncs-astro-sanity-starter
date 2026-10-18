// Foundation, edit with care
// Proof only (exp/react-19.3): @sanity/themer needs react ^19.3.0, so it could
// not be installed on the 19.2.7 pin. This checks that buildTheme() produces a
// Studio theme from a brand accent and background. It is NOT wired into the
// Studio config; the Studio theme is owned elsewhere.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTheme } from '@sanity/themer';

describe('@sanity/themer buildTheme', () => {
  it('builds a Studio theme from an accent and a background', () => {
    const theme = buildTheme({
      light: { accent: '#2f6f4f', background: '#fbfaf7' },
      dark: { accent: '#7fc4a0', background: '#111312' },
    });
    assert.equal(typeof theme, 'object');
    assert.ok(theme !== null);
    // The shape @sanity/ui's ThemeProvider reads.
    for (const key of ['color', 'fonts', 'radius', 'space', 'button', 'input']) {
      assert.ok(key in theme, `theme has ${key}`);
    }
  });

  it('changes the output when the accent changes', () => {
    const a = JSON.stringify(buildTheme({ light: { accent: '#ff0000' } }));
    const b = JSON.stringify(buildTheme({ light: { accent: '#0000ff' } }));
    assert.notEqual(a, b);
  });
});

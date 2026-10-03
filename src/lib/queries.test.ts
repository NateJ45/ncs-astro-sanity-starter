import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// GROQ slice guard (PORTS.md card 65, 2026-10-03)
// =============================================================================
// `sanityFetch` returns its fallback on ANY error, so a GROQ query that does not
// parse renders an empty section and leaves the build green. The one that
// shipped: `dynamicListSection` sliced with `[0...limit]`, where `limit` is a
// per-block FIELD. GROQ subscript ranges need INTEGER endpoints, so that is a
// parse error ("subscript ranges must have integer endpoints"), on every site,
// until a real project was attached and someone read the build log.
//
// This reads queries.ts as text and fails on any slice whose endpoint is not an
// integer literal or a `$param`. A `$param` is valid GROQ (one value for the
// whole query); a field reference is not. If you need a per-block count, slice
// at the schema's max with a literal and trim in the component
// (DynamicList.astro does exactly that).

const src = readFileSync(new URL('./queries.ts', import.meta.url), 'utf8');

// Strip // line comments so the explanatory comment above the slice (which names
// the bad form on purpose) does not trip the guard. Block comments are not used
// inside the query template literals.
const code = src
  .split('\n')
  .map((line) => line.replace(/\/\/.*$/, ''))
  .join('\n');

describe('GROQ slices in queries.ts', () => {
  it('every range has integer or $param endpoints', () => {
    // [a...b] or [a..b], where a and b are anything that is not a digit run or $name.
    const ranges = [...code.matchAll(/\[\s*([^\][]*?)\s*\.\.\.?\s*([^\][]*?)\s*\]/g)];
    const bad = ranges.filter(([, from, to]) => {
      const ok = (e: string) => /^(\d+|\$[A-Za-z_]\w*)$/.test(e);
      return !ok(from) || !ok(to);
    });
    assert.deepEqual(
      bad.map((m) => m[0]),
      [],
      'GROQ subscript ranges must have integer endpoints; slice at a literal max and trim in the component',
    );
  });

  it('dynamicListSection still slices at the schema max (12)', () => {
    const limitField = readFileSync(
      new URL('../sanity/schemaTypes/richSections.ts', import.meta.url),
      'utf8',
    );
    const max = limitField.match(/name: 'limit'[\s\S]*?\.max\((\d+)\)/);
    assert.ok(max, 'could not find the limit field max in richSections.ts');
    const arms = [...code.matchAll(/\[0\.\.\.(\d+)\]/g)].map((m) => Number(m[1]));
    assert.ok(arms.length > 0, 'found no [0...N] slices at all');
    for (const n of arms) {
      assert.ok(
        n >= Number(max![1]),
        `a [0...${n}] slice is below the limit field max (${max![1]}); an editor choosing more than ${n} would silently get ${n}`,
      );
    }
  });
});

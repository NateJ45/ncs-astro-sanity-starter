// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// scripts/check-studio-look.mjs (PORTS.md card 139): `npm run check:look`.
// Warns when a site's brand/brand.config.json `studio.look` still has the starter's
// neutral marker, stone, colours or connector. Never fails the run unless --strict.
// Run through node --experimental-strip-types so it can read the tested TS.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lookInput, neutralLookWarnings } from '../src/lib/studio-look.ts';

const brand = JSON.parse(
  readFileSync(fileURLToPath(new URL('../brand/brand.config.json', import.meta.url)), 'utf8'),
);
const warnings = neutralLookWarnings(lookInput(brand));
if (warnings.length === 0) console.log('studio.look: the site has settled its own devices.');
else {
  console.warn(`studio.look still has ${warnings.length} neutral device(s):`);
  for (const w of warnings) console.warn(`  - ${w}`);
}
process.exit(process.argv.includes('--strict') && warnings.length ? 1 : 0);

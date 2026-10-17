// A PORTABLE file must stay byte-identical across the family, and `npm run scaffold
// -- --remove` edits every file that carries a scaffold marker. A marker in a PORTABLE
// file therefore guarantees sync-check DRIFT in every fork that removes that
// capability (PORTS.md card 99: first-baptist-auburn's fork, 2026-10-17). This test
// fails if one appears.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MARKER = /scaffold(?::\s*[a-z]|-file:|-branch:|:end)/;
// The scaffold script documents the markers, and this test names them.
const EXEMPT = new Set(['scripts/scaffold.mjs', 'scripts/lib/portable-scaffold-markers.test.mjs']);

test('no PORTABLE file carries a scaffold marker', () => {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const offenders = [];
  for (const file of files) {
    if (EXEMPT.has(file) || !/\.(mjs|js|ts|tsx|astro|css|md|json|jsonc|yml)$/.test(file)) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (!text.slice(0, 400).includes('PORTABLE: canonical copy')) continue;
    text.split('\n').forEach((line, i) => {
      if (MARKER.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], `scaffold markers in PORTABLE files:\n${offenders.join('\n')}`);
});

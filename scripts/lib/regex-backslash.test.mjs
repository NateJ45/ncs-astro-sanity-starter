// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Guards every script in the repo against regexes that lost their backslashes to a Git Bash
// heredoc (PORTS.md card 155: a heading splitter matched the letter "s"). The detector is
// scripts/lib/regex-backslash.mjs. A deliberate pattern that trips it (a regex that really means
// the letter s followed by +) can be written with a character class, `[s]+`, to pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { looksStripped, onDisk, scanFile } from './regex-backslash.mjs';

test('the detector catches the shapes a heredoc leaves behind', () => {
  for (const body of ['(s+)', '^s+$', 'd+', '(d{1,2})', '[^s]', 'w+@', '^day-(d{1,2})$']) {
    assert.equal(looksStripped(body), true, body);
  }
});

test('the detector leaves real regexes alone', () => {
  for (const body of [
    '(\\s+)',
    '^\\s+$',
    '^day-(\\d{1,2})$',
    '.+@.+\\..+',
    'class+',
    'stars?',
    '[?&]still(=|&|$)',
    '^#[0-9a-f]{6}$',
    'is-(open|shut)',
  ]) {
    assert.equal(looksStripped(body), false, body);
  }
});

test('a tracked file that a scaffold removal deleted is skipped, not read', () => {
  const gone = new Set(['src/gone.ts']);
  assert.deepEqual(
    onDisk(['src/a.ts', 'src/gone.ts', 'src/b.ts'], (f) => !gone.has(f)),
    ['src/a.ts', 'src/b.ts'],
  );
});

test('no script in the repo holds a regex that lost its backslashes', () => {
  const tracked = execFileSync(
    'git',
    ['ls-files', '--', '*.ts', '*.tsx', '*.mjs', '*.js', '*.astro'],
    { encoding: 'utf8' },
  )
    .split('\n')
    .filter((f) => f && !f.includes('.generated.') && !f.startsWith('public/'));
  // A capability removed with scaffold --remove is deleted but still tracked until committed.
  const files = onDisk(tracked);
  const hits = [];
  for (const f of files) {
    for (const h of scanFile(f)) hits.push(`${f}:${h.line} ${h.regex}`);
  }
  assert.deepEqual(
    hits,
    [],
    `Regexes that look like they lost their backslashes:\n${hits.join('\n')}`,
  );
});

// Prints the next free PORTS.md card number, looking at BOTH the working copy and
// origin/main's copy. Two sessions took card 62 on the same day (2026-10-03)
// because each read only its own branch's PORTS.md; main had moved on. Run this
// right before writing a card, and again right before pushing. It fetches origin/main
// first and sees MERGED cards only: a number held by an open PR or an unmerged branch is
// invisible to it, so also look at `gh pr list` when several sessions are porting.
//
//   node scripts/next-port-card.mjs        -> 70
//   npm run ports:next
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve from this file, not the cwd, so it works from any subdirectory.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portsPath = path.join(root, 'PORTS.md');

const cards = (text) => [...text.matchAll(/^## Card (\d+)\b/gm)].map((m) => Number(m[1]));
const highest = (text) => Math.max(0, ...cards(text));

const local = fs.existsSync(portsPath) ? highest(fs.readFileSync(portsPath, 'utf8')) : 0;

let remote = 0;
let remoteNote = '';
try {
  execFileSync('git', ['fetch', '-q', 'origin', 'main'], { cwd: root, stdio: 'ignore' });
  remote = highest(
    execFileSync('git', ['show', 'origin/main:PORTS.md'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    }),
  );
} catch {
  remoteNote = ' (could not read origin/main: offline? this is the local count only)';
}

const next = Math.max(local, remote) + 1;
console.log(next);
if (local !== remote || remoteNote) {
  console.error(`local highest card ${local}, origin/main highest card ${remote}${remoteNote}`);
}

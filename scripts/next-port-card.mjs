// Prints the next free PORTS.md card number, looking at BOTH the working copy and
// origin/main's copy. Two sessions took card 62 on the same day (2026-10-03)
// because each read only its own branch's PORTS.md; main had moved on. Run this
// right before writing a card, and again right before pushing.
//
//   node scripts/next-port-card.mjs        -> 70
//   npm run ports:next
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const cards = (text) => [...text.matchAll(/^## Card (\d+)\b/gm)].map((m) => Number(m[1]));
const highest = (text) => Math.max(0, ...cards(text));

const local = fs.existsSync('PORTS.md') ? highest(fs.readFileSync('PORTS.md', 'utf8')) : 0;

let remote = 0;
let remoteNote = '';
try {
  execFileSync('git', ['fetch', '-q', 'origin', 'main'], { stdio: 'ignore' });
  remote = highest(
    execFileSync('git', ['show', 'origin/main:PORTS.md'], { encoding: 'utf8', maxBuffer: 1 << 26 }),
  );
} catch {
  remoteNote = ' (could not read origin/main: offline? this is the local count only)';
}

const next = Math.max(local, remote) + 1;
console.log(next);
if (local !== remote || remoteNote) {
  console.error(`local highest card ${local}, origin/main highest card ${remote}${remoteNote}`);
}

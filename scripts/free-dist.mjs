// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// free-dist.mjs - release any lock on dist/ before a build (Windows)
// =============================================================================
// WHY THIS EXISTS (ported into the starter 2026-08-27; original 2026-08-26)
//
// A still-running `wrangler dev` / `astro preview` / `http-server` keeps a
// handle on dist/ (or dist/client). Astro empties dist at the start of every
// build, so the next `npm run build` (and therefore `npm run deploy`) dies
// with a cryptic:
//
//     EPERM, Permission denied: \\?\...\dist\client
//
// It reads like a permissions problem; it is really "something is still
// serving the last build". This bit two real deploys on 2026-08-26.
//
// HOW TO WIRE IT
// In presacademy this runs as the `prebuild` npm hook so it fires
// automatically. The starter ships it unwired (running PowerShell on every
// build is a behavior change a downstream project should opt into), and
// exposes it as `npm run free-dist` for a manual rescue. To make it
// automatic in a project, add:
//
//     "prebuild": "node scripts/free-dist.mjs"
//
// PORTABILITY (the genericization done on the 2026-08-27 port)
// The script derives the project root from its OWN location
// (import.meta.url -> ../), so a copy dropped into any repo matches that
// repo's processes and no other. Nothing here is hardcoded to a project
// name, and the file needs no edit when copied.
//
// The command-line comparison uses an ordinal case-insensitive IndexOf rather
// than PowerShell's -like. -like treats [ and ] as wildcard character classes,
// so a checkout path containing brackets would silently match nothing; and a
// literal path is what we actually want. Drive-letter case varies between
// tools, hence case-insensitive.
//
// SAFETY - this kills processes, so it is deliberately narrow:
//   - Windows only (no-ops everywhere else, so Linux CI is untouched).
//   - Only node.exe / workerd.exe.
//   - Only when the command line mentions BOTH this project's directory AND
//     a known dev-server (wrangler / miniflare / http-server / astro preview).
//     A node process doing anything else - including the editor or agent
//     session running this script - can never match.
//   - Prints every PID it kills.
// =============================================================================
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') process.exit(0);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Match on the project path so we can never touch an unrelated project's server.
// NOTE: a PowerShell single-quoted string treats backslashes LITERALLY, so the
// path must NOT be backslash-escaped here (doing that produced C:\\Users\\...,
// which matched nothing and let the EPERM through). Only ' needs doubling.
const ps = `
$root = '${ROOT.replace(/'/g, "''")}'
Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='workerd.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine.IndexOf($root, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $_.CommandLine -match 'wrangler|miniflare|http-server|astro preview'
  } |
  ForEach-Object { Write-Output $_.ProcessId; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
`;

try {
  const out = execFileSync('powershell', ['-NoProfile', '-Command', ps], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  if (out) {
    console.log(
      `[free-dist] stopped stale dev server(s) holding dist: ${out.split(/\s+/).join(', ')}`,
    );
  }
} catch {
  // Never block a build over this - if the query fails, just carry on and let
  // Astro report the EPERM as before.
}

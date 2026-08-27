// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// with-workerd.mjs - run a command with a workerd that actually starts
// =============================================================================
// WHY THIS EXISTS (ported into the starter 2026-08-27; original 2026-08-25/26)
//
// `astro build` prerenders the static pages by booting the Cloudflare runtime
// (workerd) through @cloudflare/vite-plugin. On Windows the workerd version
// that plugin pins (hoisted to node_modules/@cloudflare/workerd-windows-64)
// aborts immediately:
//
//     *** std::terminate() called with no exception
//     MiniflareCoreError [ERR_RUNTIME_FAILURE]: The Workers runtime failed to start.
//
// The NEWER workerd that ships inside wrangler runs the very same config fine.
// Miniflare lets you point at a specific binary with MINIFLARE_WORKERD_PATH,
// so this wrapper finds wrangler's copy and sets that variable before handing
// off to the real command.
//
// STATUS IN THIS STARTER (2026-08-27): a no-op safety net, not a live fix.
// The starter is on Astro 6.3 with @astrojs/cloudflare 13.5.5, which does not
// route the prerender through @cloudflare/vite-plugin, so the crash does not
// occur and `npm run build` never needs this wrapper. It is installed now
// because the crash appears the moment a project takes the Astro 7 /
// adapter 14 upgrade (that is exactly where presacademy hit it). When this
// starter takes that upgrade, wire it in:
//
//     "build": "node scripts/with-workerd.mjs astro build"
//
// Until then, leave package.json alone; running the wrapper by hand is
// harmless because it changes nothing when the wrangler binary is absent or
// the platform is not Windows.
//
// Deliberately conservative:
//   - Windows only. The crash is a Windows binary problem; Linux CI boots the
//     plugin's own workerd fine, and CI should stay on the stock path.
//   - Never overrides an explicit MINIFLARE_WORKERD_PATH.
//   - If wrangler's binary is missing, it changes nothing and the command runs
//     exactly as before.
//
// Remove this wrapper once the plugin's pinned workerd starts on Windows again.
//
// Usage (from an npm script, so node_modules/.bin is on PATH):
//   node scripts/with-workerd.mjs astro build
// =============================================================================
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const command = process.argv.slice(2).join(' ');
if (!command) {
  console.error('with-workerd: no command given');
  process.exit(1);
}

const env = { ...process.env };

if (process.platform === 'win32' && !env.MINIFLARE_WORKERD_PATH) {
  const wranglerWorkerd = resolve(
    ROOT,
    'node_modules/wrangler/node_modules/@cloudflare/workerd-windows-64/bin/workerd.exe',
  );
  if (existsSync(wranglerWorkerd)) {
    env.MINIFLARE_WORKERD_PATH = wranglerWorkerd;
    console.log("[with-workerd] using wrangler's workerd (the plugin's copy crashes on Windows)");
  }
}

// shell: true so the npm-script PATH resolves `astro` (a .cmd shim on Windows).
const result = spawnSync(command, { stdio: 'inherit', shell: true, env, cwd: ROOT });
process.exit(result.status ?? 1);

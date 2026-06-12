// scripts/lib/loadEnv.mjs
//
// Shared .env loader for Node scripts.
// Reads the .env file at the repo root and merges it into process.env, with
// process.env taking precedence (i.e. existing env vars are never overwritten).
//
// Parse rules:
//   - Lines must match KEY=value (KEY: A-Z, 0-9, underscore; leading spaces ok)
//   - Quoted values: surrounding single or double quotes are stripped
//   - Inline comments: a bare # following unquoted whitespace is treated as a
//     comment delimiter; the comment is NOT included in the value
//     (e.g. KEY=hello # comment => value is "hello")
//   - Quoted values are taken literally: # inside quotes is part of the value
//     (e.g. KEY='hello # world' => value is "hello # world")
//   - process.env variables always win — a .env entry never overwrites them

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load .env from `root` into an env object seeded from process.env.
 * Returns the merged object; does NOT mutate process.env.
 *
 * @param {string} root - Absolute path to the directory containing .env
 * @returns {Record<string, string>}
 */
export function loadEnv(root) {
  const env = { ...process.env };
  try {
    const raw = readFileSync(resolve(root, '.env'), 'utf-8');
    for (const line of raw.split('\n')) {
      // Match KEY = <rest> (rest may be empty, quoted, or bare)
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;

      const key = m[1];
      if (env[key] !== undefined) continue; // process.env takes precedence

      const raw_val = m[2];

      let value;
      // Quoted value: strip surrounding quotes and take content literally
      const quoted = raw_val.match(/^(["'])(.*)\1$/s);
      if (quoted) {
        value = quoted[2];
      } else {
        // Bare value: strip inline comment (# preceded by whitespace)
        value = raw_val.replace(/\s+#.*$/, '').trim();
      }

      env[key] = value;
    }
  } catch {
    /* .env is optional — no error when absent */
  }
  return env;
}

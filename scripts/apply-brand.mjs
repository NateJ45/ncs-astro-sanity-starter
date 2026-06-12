#!/usr/bin/env node
// apply-brand.mjs — deterministic, idempotent brand reskin script.
// Reads brand/brand.config.json and rewrites every branding surface in the repo.
// Run via: npm run apply-brand
//
// All-or-nothing per file: if any token is not found in a file, the script
// throws a descriptive error and writes nothing to that file.
// Idempotent: running twice on the same config produces no diff.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---- Config loader -------------------------------------------------------

function loadConfig() {
  const configPath = resolve(root, 'brand/brand.config.json');
  let raw;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch (err) {
    throw new Error(`apply-brand: cannot read brand/brand.config.json — ${err.message}`);
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`apply-brand: brand/brand.config.json is not valid JSON — ${err.message}`);
  }
  // Minimal validation
  const required = ['name', 'domain', 'tagline', 'palette', 'fonts', 'studio'];
  for (const key of required) {
    if (config[key] === undefined) {
      throw new Error(`apply-brand: brand/brand.config.json is missing required key "${key}"`);
    }
  }
  const palRequired = ['theme', 'light', 'dark'];
  for (const key of palRequired) {
    if (!config.palette[key]) {
      throw new Error(`apply-brand: brand/brand.config.json missing palette.${key}`);
    }
  }
  if (!config.fonts.display || !config.fonts.body) {
    throw new Error(`apply-brand: brand/brand.config.json missing fonts.display or fonts.body`);
  }
  if (!config.studio.themeProps) {
    throw new Error(`apply-brand: brand/brand.config.json missing studio.themeProps`);
  }
  return config;
}

// ---- Substitution helpers -----------------------------------------------

/**
 * Apply a list of substitutions to a text string.
 * Each substitution: { label, pattern, replacement }
 * If any pattern is not found in text, throws an Error.
 * Returns the rewritten text.
 */
function applySubstitutions(text, substitutions, filePath) {
  let result = text;
  for (const { label, pattern, replacement } of substitutions) {
    if (!pattern.test(result)) {
      throw new Error(
        `apply-brand: token "${label}" not found in ${filePath}\n` +
        `  Pattern: ${pattern}\n` +
        `  This usually means the file structure has changed — update the script.`
      );
    }
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Read, rewrite, and conditionally write a file.
 * Returns 'updated' | 'no-changes'.
 */
function rewriteFile(filePath, rewriteFn) {
  const input = readFileSync(filePath, 'utf-8');
  const output = rewriteFn(input, filePath);
  if (output !== input) {
    writeFileSync(filePath, output, 'utf-8');
    console.log(`[apply-brand] ${filePath.replace(root + '/', '')} — updated`);
    return 'updated';
  } else {
    console.log(`[apply-brand] ${filePath.replace(root + '/', '')} — no changes`);
    return 'no-changes';
  }
}

/** Escape a string for use in a RegExp */
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---- Rewrite: src/styles/globals.css ------------------------------------

function rewriteGlobalsCss(config) {
  rewriteFile(resolve(root, 'src/styles/globals.css'), (text, filePath) => {
    let result = text;

    // Step 1 — @theme palette tokens
    const themeSubstitutions = Object.entries(config.palette.theme).map(([token, value]) => ({
      label: token,
      pattern: new RegExp(`(${esc(token)}:\\s*)([^;]+)(;)`),
      replacement: `$1${value}$3`,
    }));
    result = applySubstitutions(result, themeSubstitutions, filePath);

    // Step 2 — @theme font tokens
    const fontSubs = [
      {
        label: '--font-display',
        pattern: /(--font-display:\s*)([^;]+)(;)/,
        replacement: `$1${config.fonts.display.familyValue}$3`,
      },
      {
        label: '--font-body',
        pattern: /(--font-body:\s*)([^;]+)(;)/,
        replacement: `$1${config.fonts.body.familyValue}$3`,
      },
    ];
    if (config.fonts.script !== null) {
      fontSubs.push({
        label: '--font-script',
        pattern: /(--font-script:\s*)([^;]+)(;)/,
        replacement: `$1${config.fonts.script.familyValue}$3`,
      });
    }
    result = applySubstitutions(result, fontSubs, filePath);

    // Step 3 — @fontsource import lines
    // Build the desired import block from the config
    const allImports = [
      ...config.fonts.display.imports,
      ...config.fonts.body.imports,
      ...(config.fonts.script ? config.fonts.script.imports : []),
    ];
    const newImportBlock = allImports.map(imp => `@import "${imp}";`).join('\n');

    // Match the existing @fontsource import block: each import line followed by
    // a line ending. Uses a named group to capture the blank line(s) that follow
    // the block so we can restore them and keep the file structure intact.
    // Pattern: 2+ consecutive @fontsource import lines, then the trailing newline(s).
    const importBlockPattern = /((?:@import "@fontsource[^"]*";\r?\n){2,})(\r?\n)?/;
    if (!importBlockPattern.test(result)) {
      throw new Error(
        `apply-brand: @fontsource import block not found in ${filePath}\n` +
        `  Expected 2+ consecutive @import "@fontsource..." lines.`
      );
    }
    result = result.replace(importBlockPattern, (match, block, trailingBlank) => {
      // Preserve the line ending style from the original file
      const eol = block.includes('\r\n') ? '\r\n' : '\n';
      const rebuildBlock = allImports.map(imp => `@import "${imp}";`).join(eol);
      return rebuildBlock + eol + (trailingBlank || '');
    });

    // Step 4 — :root semantic tokens
    // Extract the :root { ... } block and apply substitutions within it
    const rootBlockPattern = /(:root\s*\{)([\s\S]*?)(\})/;
    const rootMatch = result.match(rootBlockPattern);
    if (!rootMatch) {
      throw new Error(`apply-brand: :root block not found in ${filePath}`);
    }
    const lightSubs = Object.entries(config.palette.light).map(([token, value]) => ({
      label: `light:${token}`,
      pattern: new RegExp(`(${esc(token)}:\\s*)([^;]+)(;)`),
      replacement: `$1${value}$3`,
    }));
    const rewrittenRoot = applySubstitutions(rootMatch[2], lightSubs, filePath + ' [:root]');
    result = result.replace(rootBlockPattern, `$1${rewrittenRoot}$3`);

    // Step 5 — .dark semantic tokens
    // Extract the .dark { ... } block and apply substitutions within it
    const darkBlockPattern = /(\.(dark)\s*\{)([\s\S]*?)(\}(?=\s*\n\s*\/\*|$|\s*\/\*|\s*\n\s*@))/;
    const darkMatch = result.match(darkBlockPattern);
    if (!darkMatch) {
      throw new Error(`apply-brand: .dark block not found in ${filePath}`);
    }
    const darkSubs = Object.entries(config.palette.dark).map(([token, value]) => ({
      label: `dark:${token}`,
      pattern: new RegExp(`(${esc(token)}:\\s*)([^;]+)(;)`),
      replacement: `$1${value}$3`,
    }));
    const rewrittenDark = applySubstitutions(darkMatch[3], darkSubs, filePath + ' [.dark]');
    result = result.replace(darkBlockPattern, `$1${rewrittenDark}$4`);

    return result;
  });
}

// ---- Rewrite: src/data/site.ts ------------------------------------------

function rewriteSiteTs(config) {
  rewriteFile(resolve(root, 'src/data/site.ts'), (text, filePath) => {
    const subs = [
      // name field (bare string literal, 2-space indent)
      {
        label: 'name',
        pattern: /(  name:\s*")((?:[^"\\]|\\.)*)(")/,
        replacement: `$1${config.name}$3`,
      },
      // domain field
      {
        label: 'domain',
        pattern: /(  domain:\s*")((?:[^"\\]|\\.)*)(")/,
        replacement: `$1${config.domain}$3`,
      },
      // brandColors — each key has 4-space indent; match just the quoted value
      // after the key name, leaving comma + comment intact via look-ahead.
      {
        label: 'brandColors.primary',
        pattern: /(    primary:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacement: `$1${config.palette.theme['--color-primary']}$3`,
      },
      {
        label: 'brandColors.primaryDark',
        pattern: /(    primaryDark:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacement: `$1${config.palette.theme['--color-primary-dark']}$3`,
      },
      {
        label: 'brandColors.accent',
        pattern: /(    accent:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacement: `$1${config.palette.theme['--color-accent']}$3`,
      },
      {
        label: 'brandColors.accentDark',
        pattern: /(    accentDark:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacement: `$1${config.palette.theme['--color-accent-dark']}$3`,
      },
      {
        label: 'brandColors.secondary',
        pattern: /(    secondary:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacement: `$1${config.palette.theme['--color-secondary']}$3`,
      },
      {
        label: 'brandColors.tertiary',
        pattern: /(    tertiary:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacement: `$1${config.palette.theme['--color-tertiary']}$3`,
      },
      {
        label: 'brandColors.bg',
        pattern: /(    bg:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacement: `$1${config.palette.theme['--color-bg']}$3`,
      },
      {
        label: 'brandColors.bgSoft',
        pattern: /(    bgSoft:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacement: `$1${config.palette.theme['--color-bg-soft']}$3`,
      },
      {
        label: 'brandColors.border',
        pattern: /(    border:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacement: `$1${config.palette.theme['--color-border-soft']}$3`,
      },
    ];
    return applySubstitutions(text, subs, filePath);
  });
}

// ---- Rewrite: studio/sanity.config.ts -----------------------------------

function rewriteSanityConfig(config) {
  rewriteFile(resolve(root, 'studio/sanity.config.ts'), (text, filePath) => {
    // Extract the studioThemeProps object block
    const blockPattern = /(const studioThemeProps\s*=\s*\{)([\s\S]*?)(\};)/;
    const blockMatch = text.match(blockPattern);
    if (!blockMatch) {
      throw new Error(`apply-brand: studioThemeProps block not found in ${filePath}`);
    }

    const subs = Object.entries(config.studio.themeProps).map(([key, value]) => ({
      label: key,
      pattern: new RegExp(`('${esc(key)}':\\s*')([^']+)(')`),
      replacement: `$1${value}$3`,
    }));

    const rewrittenBlock = applySubstitutions(blockMatch[2], subs, filePath + ' [studioThemeProps]');
    return text.replace(blockPattern, `$1${rewrittenBlock}$3`);
  });
}

// ---- Rewrite: scripts/generate-og-default.mjs ---------------------------

function rewriteOgDefault(config) {
  rewriteFile(resolve(root, 'scripts/generate-og-default.mjs'), (text, filePath) => {
    const subs = [
      {
        label: 'wordmark',
        pattern: /(wordmark:\s*')((?:[^'\\]|\\.)*)(')/,
        replacement: `$1${config.name}$3`,
      },
      {
        label: 'tagline',
        pattern: /(tagline:\s*\[')((?:[^'\\]|\\.)*)('\])/,
        replacement: `$1${config.tagline}$3`,
      },
    ];
    return applySubstitutions(text, subs, filePath);
  });
}

// ---- Rewrite: scripts/lib/render-og.mjs ---------------------------------

function rewriteRenderOg(config) {
  rewriteFile(resolve(root, 'scripts/lib/render-og.mjs'), (text, filePath) => {
    const subs = [
      {
        label: 'DEFAULTS.bg',
        pattern: /(  bg:\s*')((?:[^'\\]|\\.)*)(')/,
        replacement: `$1${config.palette.light['--background']}$3`,
      },
      {
        label: 'DEFAULTS.primary',
        pattern: /(  primary:\s*')((?:[^'\\]|\\.)*)(')/,
        replacement: `$1${config.palette.theme['--color-primary']}$3`,
      },
      {
        label: 'DEFAULTS.primaryDark',
        pattern: /(  primaryDark:\s*')((?:[^'\\]|\\.)*)(')/,
        replacement: `$1${config.palette.theme['--color-primary-dark']}$3`,
      },
      {
        label: 'DEFAULTS.accent',
        pattern: /(  accent:\s*')((?:[^'\\]|\\.)*)(')/,
        replacement: `$1${config.palette.theme['--color-accent']}$3`,
      },
      {
        label: 'DEFAULTS.taupe',
        pattern: /(  taupe:\s*')((?:[^'\\]|\\.)*)(')/,
        replacement: `$1${config.palette.theme['--color-secondary']}$3`,
      },
      {
        label: 'DEFAULTS.fontDisplay',
        pattern: /(  fontDisplay:\s*')((?:[^'\\]|\\.)*)(')/,
        replacement: `$1${config.fonts.display.ogFontStack}$3`,
      },
    ];
    return applySubstitutions(text, subs, filePath);
  });
}

// ---- Rewrite: scripts/generate-og-pages.mjs ----------------------------

function rewriteOgPages(config) {
  rewriteFile(resolve(root, 'scripts/generate-og-pages.mjs'), (text, filePath) => {
    const subs = [
      {
        label: 'WORDMARK fallback',
        // Matches: const WORDMARK = env.SITE_NAME ?? 'Studio Starter';
        // Captures the fallback string literal only
        pattern: /(const WORDMARK = env\.SITE_NAME \?\? ')((?:[^'\\]|\\.)*)(')/,
        replacement: `$1${config.name}$3`,
      },
    ];
    return applySubstitutions(text, subs, filePath);
  });
}

// ---- Run OG generator ---------------------------------------------------

function runOg() {
  console.log('[apply-brand] running npm run og ...');
  // On Windows, npm is a .cmd wrapper; on POSIX it's a bare executable.
  // Pass the full static command string (no user input) via shell: true
  // so npm resolves on all platforms. Passing as a single string (not an
  // array + shell) avoids Node's DEP0190 deprecation warning about shell-
  // escaped arg arrays.
  const result = spawnSync('npm run og', {
    stdio: 'inherit',
    shell: true,
    cwd: root,
  });
  if (result.status !== 0) {
    throw new Error(`apply-brand: npm run og exited with status ${result.status}`);
  }
}

// ---- Main ---------------------------------------------------------------

async function main() {
  const errors = [];

  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const steps = [
    ['globals.css', () => rewriteGlobalsCss(config)],
    ['site.ts', () => rewriteSiteTs(config)],
    ['sanity.config.ts', () => rewriteSanityConfig(config)],
    ['generate-og-default.mjs', () => rewriteOgDefault(config)],
    ['render-og.mjs', () => rewriteRenderOg(config)],
    ['generate-og-pages.mjs', () => rewriteOgPages(config)],
  ];

  for (const [label, fn] of steps) {
    try {
      fn();
    } catch (err) {
      errors.push(err.message);
      console.error(`[apply-brand] ERROR in ${label}:\n  ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n[apply-brand] ${errors.length} error(s). No OG image regenerated.`);
    process.exit(1);
  }

  try {
    runOg();
  } catch (err) {
    console.error(`[apply-brand] OG generation failed: ${err.message}`);
    process.exit(1);
  }

  console.log('[apply-brand] done.');
}

main();

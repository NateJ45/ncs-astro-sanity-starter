#!/usr/bin/env node
// apply-brand.mjs — deterministic, idempotent brand reskin script.
// Reads brand/brand.config.json and rewrites every branding surface in the repo.
// Run via: npm run apply-brand
// Dry-run / validation: npm run apply-brand -- --check
//
// All-or-nothing per file: if any token is not found in a file, the script
// throws a descriptive error and writes nothing to that file.
// Idempotent: running twice on the same config produces no diff.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---- CLI flags ----------------------------------------------------------

const CHECK_MODE = process.argv.includes('--check');

// ---- JSON Schema validator (dependency-free, draft-07 subset) -----------

/**
 * Minimal JSON Schema draft-07 validator covering the subset used in
 * brand.config.schema.json: type, required, properties, pattern,
 * nullable (type array with "null"), additionalProperties.
 * Returns an array of error strings (empty = valid).
 */
function validateSchema(schema, value, path) {
  if (path === undefined) path = '';
  const errors = [];

  // Handle nullable: type array like ["string","null"]
  if (Array.isArray(schema.type)) {
    if (value === null) {
      if (schema.type.includes('null')) return errors;
      errors.push(`${path}: expected one of [${schema.type.join(',')}] but got null`);
      return errors;
    }
    const nonNullType = schema.type.find(function(t) { return t !== 'null'; });
    if (nonNullType) {
      const subSchema = Object.assign({}, schema, { type: nonNullType });
      return validateSchema(subSchema, value, path);
    }
    return errors;
  }

  if (schema.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`${path}: expected object, got ${value === null ? 'null' : typeof value}`);
      return errors;
    }
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in value)) {
          errors.push(`${path}: missing required key "${key}"`);
        }
      }
    }
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        if (key in value) {
          const subErrors = validateSchema(schema.properties[key], value[key], path ? `${path}.${key}` : key);
          for (const e of subErrors) errors.push(e);
        }
      }
    }
    return errors;
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${path}: expected array, got ${typeof value}`);
      return errors;
    }
    if (schema.items) {
      value.forEach(function(item, i) {
        const subErrors = validateSchema(schema.items, item, `${path}[${i}]`);
        for (const e of subErrors) errors.push(e);
      });
    }
    return errors;
  }

  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${path}: expected string, got ${typeof value}`);
      return errors;
    }
    if (schema.pattern) {
      const re = new RegExp(schema.pattern);
      if (!re.test(value)) {
        errors.push(`${path}: value "${value}" does not match pattern ${schema.pattern}`);
      }
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: string too short (min ${schema.minLength})`);
    }
    return errors;
  }

  if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`${path}: expected boolean, got ${typeof value}`);
    }
    return errors;
  }

  return errors;
}

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
  // Minimal structural validation
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

  // JSON Schema validation (if schema file is present)
  const schemaPath = resolve(root, 'brand/brand.config.schema.json');
  if (existsSync(schemaPath)) {
    let schema;
    try {
      schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    } catch (err) {
      throw new Error(`apply-brand: cannot parse brand/brand.config.schema.json — ${err.message}`);
    }
    const schemaErrors = validateSchema(schema, config);
    if (schemaErrors.length > 0) {
      throw new Error(
        `apply-brand: brand/brand.config.json failed schema validation:\n` +
        schemaErrors.map(function(e) { return `  - ${e}`; }).join('\n')
      );
    }
  }

  return config;
}

// ---- Substitution helpers -----------------------------------------------

/**
 * Apply a list of substitutions to a text string.
 * Each substitution: { label, pattern, replacer }
 * where replacer is a function (match, ...groups) => string.
 *
 * Using the function form of .replace() ensures that `$` sequences from
 * config values are NEVER interpolated by JS replace semantics.
 * This prevents silent corruption when config values contain dollar signs.
 *
 * IMPORTANT: all callers must use `replacer` (a function), NOT a string
 * `replacement`. This is the fix for the $-interpolation risk (Finding 1).
 *
 * If any pattern is not found in text, throws an Error.
 * Returns the rewritten text.
 */
function applySubstitutions(text, substitutions, filePath) {
  let result = text;
  for (const sub of substitutions) {
    const { label, pattern, replacer } = sub;
    if (!pattern.test(result)) {
      throw new Error(
        `apply-brand: token "${label}" not found in ${filePath}\n` +
        `  Pattern: ${pattern}\n` +
        `  This usually means the file structure has changed — update the script.`
      );
    }
    // Always use the function form to prevent $-sequence interpolation
    result = result.replace(pattern, replacer);
  }
  return result;
}

/**
 * Read, rewrite, and conditionally write a file.
 * In CHECK_MODE, reports whether the file would change without writing.
 * Returns 'updated' | 'no-changes'.
 */
function rewriteFile(filePath, rewriteFn) {
  const input = readFileSync(filePath, 'utf-8');
  const output = rewriteFn(input, filePath);
  const label = filePath.replace(root + '\\', '').replace(root + '/', '');
  if (output !== input) {
    if (!CHECK_MODE) {
      writeFileSync(filePath, output, 'utf-8');
    }
    console.log(`[apply-brand] ${label} — ${CHECK_MODE ? 'WOULD UPDATE' : 'updated'}`);
    return 'updated';
  } else {
    console.log(`[apply-brand] ${label} — no changes`);
    return 'no-changes';
  }
}

/** Escape a string for use in a RegExp */
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---- Rewrite: src/styles/globals.css ------------------------------------

function rewriteGlobalsCss(config) {
  rewriteFile(resolve(root, 'src/styles/globals.css'), function(text, filePath) {
    let result = text;

    // Step 1 — @theme palette tokens
    const themeSubstitutions = Object.entries(config.palette.theme).map(function([token, value]) {
      return {
        label: token,
        pattern: new RegExp('(' + esc(token) + ':\\s*)([^;]+)(;)'),
        replacer: function(_, g1, _g2, g3) { return g1 + value + g3; },
      };
    });
    result = applySubstitutions(result, themeSubstitutions, filePath);

    // Step 2 — @theme font tokens
    // --font-script is ALWAYS rewritten: config value when non-null, starter
    // default when null, so re-running with script:null after a previous non-null
    // run resets the token correctly instead of leaving a stale family in place.
    const scriptFamilyValue = config.fonts.script !== null
      ? config.fonts.script.familyValue
      : '"Snell Roundhand", "Apple Chancery", cursive';
    const fontSubs = [
      {
        label: '--font-display',
        pattern: /(--font-display:\s*)([^;]+)(;)/,
        replacer: function(_, g1, _g2, g3) { return g1 + config.fonts.display.familyValue + g3; },
      },
      {
        label: '--font-body',
        pattern: /(--font-body:\s*)([^;]+)(;)/,
        replacer: function(_, g1, _g2, g3) { return g1 + config.fonts.body.familyValue + g3; },
      },
      {
        label: '--font-script',
        pattern: /(--font-script:\s*)([^;]+)(;)/,
        replacer: function(_, g1, _g2, g3) { return g1 + scriptFamilyValue + g3; },
      },
    ];
    result = applySubstitutions(result, fontSubs, filePath);

    // Step 3 — @fontsource import lines
    // Build the desired import block from the config
    const allImports = [
      ...config.fonts.display.imports,
      ...config.fonts.body.imports,
      ...(config.fonts.script ? config.fonts.script.imports : []),
    ];

    // Match the existing @fontsource import block: each import line followed by
    // a line ending. Uses a capture group to capture the blank line(s) that follow
    // the block so we can restore them and keep the file structure intact.
    // Pattern: 1+ consecutive @fontsource import lines, then the trailing newline(s).
    // (Was {2,} — relaxed to {1,} so single-import setups are handled correctly.)
    const importBlockPattern = /((?:@import "@fontsource[^"]*";\r?\n){1,})(\r?\n)?/;
    if (!importBlockPattern.test(result)) {
      throw new Error(
        `apply-brand: @fontsource import block not found in ${filePath}\n` +
        `  Expected 1+ consecutive @import "@fontsource..." lines.`
      );
    }
    result = result.replace(importBlockPattern, function(match, block, trailingBlank) {
      // Preserve the line ending style from the original file
      const eol = block.includes('\r\n') ? '\r\n' : '\n';
      const rebuildBlock = allImports.map(function(imp) { return `@import "${imp}";`; }).join(eol);
      return rebuildBlock + eol + (trailingBlank || '');
    });

    // Step 4 — :root semantic tokens
    // Find the actual :root CSS selector by scanning for the pattern
    // ":root {" at line start (skips comment references like ":root / .dark"),
    // then walk braces to extract the block without any $n interpolation hazard.
    {
      // Find ":root {" — must follow newline or be at start of string
      let rootBraceOpen = -1;
      const rootSearchRe = /\n:root\s*\{/g;
      const rootSearchMatch = rootSearchRe.test(result) ? /\n:root\s*\{/.exec(result) : null;
      if (rootSearchMatch) {
        rootBraceOpen = rootSearchMatch.index + rootSearchMatch[0].length - 1;
      }
      if (rootBraceOpen === -1) {
        throw new Error(`apply-brand: :root block not found in ${filePath}`);
      }
      const braceOpen = rootBraceOpen;
      let depth = 1;
      let i = braceOpen + 1;
      while (i < result.length && depth > 0) {
        if (result[i] === '{') depth++;
        else if (result[i] === '}') depth--;
        i++;
      }
      const braceClose = i - 1;
      const before = result.slice(0, braceOpen + 1);
      const inner = result.slice(braceOpen + 1, braceClose);
      const after = result.slice(braceClose);

      const lightSubs = Object.entries(config.palette.light).map(function([token, value]) {
        return {
          label: 'light:' + token,
          pattern: new RegExp('(' + esc(token) + ':\\s*)([^;]+)(;)'),
          replacer: function(_, g1, _g2, g3) { return g1 + value + g3; },
        };
      });
      result = before + applySubstitutions(inner, lightSubs, filePath + ' [:root]') + after;
    }

    // Step 5 — .dark semantic tokens
    // Find ".dark {" at line start, then walk braces — same approach as Step 4.
    {
      let darkBraceOpen = -1;
      const darkSearchRe = /\n\.dark\s*\{/g;
      const darkSearchMatch = darkSearchRe.test(result) ? /\n\.dark\s*\{/.exec(result) : null;
      if (darkSearchMatch) {
        darkBraceOpen = darkSearchMatch.index + darkSearchMatch[0].length - 1;
      }
      if (darkBraceOpen === -1) {
        throw new Error(`apply-brand: .dark block not found in ${filePath}`);
      }
      const braceOpen = darkBraceOpen;
      let depth = 1;
      let i = braceOpen + 1;
      while (i < result.length && depth > 0) {
        if (result[i] === '{') depth++;
        else if (result[i] === '}') depth--;
        i++;
      }
      const braceClose = i - 1;
      const before = result.slice(0, braceOpen + 1);
      const inner = result.slice(braceOpen + 1, braceClose);
      const after = result.slice(braceClose);

      const darkSubs = Object.entries(config.palette.dark).map(function([token, value]) {
        return {
          label: 'dark:' + token,
          pattern: new RegExp('(' + esc(token) + ':\\s*)([^;]+)(;)'),
          replacer: function(_, g1, _g2, g3) { return g1 + value + g3; },
        };
      });
      result = before + applySubstitutions(inner, darkSubs, filePath + ' [.dark]') + after;
    }

    // Step 6 — --radius token
    // Only applied when radius is specified in config; default in brand.config.json
    // is the value already in globals.css so this is a no-op on a fresh clone.
    if (config.radius !== undefined && config.radius !== null) {
      const radiusSubs = [
        {
          label: '--radius',
          pattern: /(--radius:\s*)([^;]+)(;)/,
          replacer: function(_, g1, _g2, g3) { return g1 + config.radius + g3; },
        },
      ];
      result = applySubstitutions(result, radiusSubs, filePath);
    }

    // Step 7 — print footer brand string
    // Replaces content: "..." within the body::after print rule with the
    // current name + domain pair. Pattern matches any quoted content string
    // in that rule (idempotent: re-running with same values produces no change).
    {
      const footerName = config.name;
      const footerDomain = config.domain;
      const printSubs = [
        {
          label: 'print-footer',
          pattern: /(body::after\s*\{[\s\S]*?content:\s*")([^"]*?)(")/,
          replacer: function(_, g1, _g2, g3) { return g1 + footerName + ' · ' + footerDomain + g3; },
        },
      ];
      result = applySubstitutions(result, printSubs, filePath);
    }

    return result;
  });
}

// ---- Rewrite: src/data/site.ts ------------------------------------------

function rewriteSiteTs(config) {
  rewriteFile(resolve(root, 'src/data/site.ts'), function(text, filePath) {
    const primary = config.palette.theme['--color-primary'];
    const primaryDark = config.palette.theme['--color-primary-dark'];
    const accent = config.palette.theme['--color-accent'];
    const accentDark = config.palette.theme['--color-accent-dark'];
    const secondary = config.palette.theme['--color-secondary'];
    const tertiary = config.palette.theme['--color-tertiary'];
    const bg = config.palette.theme['--color-bg'];
    const bgSoft = config.palette.theme['--color-bg-soft'];
    const borderSoft = config.palette.theme['--color-border-soft'];
    const subs = [
      // name — matches the _name private-variable declaration
      // (derived fields storageKeyPrefix, themeStorageKey, studio are computed
      //  from _name at runtime, so the script never needs to rewrite them)
      {
        label: 'name',
        pattern: /(const _name\s*=\s*")((?:[^"\\]|\\.)*)(")/,
        replacer: function(_, g1, _g2, g3) { return g1 + config.name + g3; },
      },
      // domain — matches the _domain private-variable declaration
      {
        label: 'domain',
        pattern: /(const _domain\s*=\s*")((?:[^"\\]|\\.)*)(")/,
        replacer: function(_, g1, _g2, g3) { return g1 + config.domain + g3; },
      },
      // brandColors — each key has 4-space indent; match just the quoted value
      // after the key name, leaving comma + comment intact via look-ahead.
      {
        label: 'brandColors.primary',
        pattern: /(    primary:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacer: function(_, g1, _g2, g3) { return g1 + primary + g3; },
      },
      {
        label: 'brandColors.primaryDark',
        pattern: /(    primaryDark:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacer: function(_, g1, _g2, g3) { return g1 + primaryDark + g3; },
      },
      {
        label: 'brandColors.accent',
        pattern: /(    accent:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacer: function(_, g1, _g2, g3) { return g1 + accent + g3; },
      },
      {
        label: 'brandColors.accentDark',
        pattern: /(    accentDark:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacer: function(_, g1, _g2, g3) { return g1 + accentDark + g3; },
      },
      {
        label: 'brandColors.secondary',
        pattern: /(    secondary:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacer: function(_, g1, _g2, g3) { return g1 + secondary + g3; },
      },
      {
        label: 'brandColors.tertiary',
        pattern: /(    tertiary:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacer: function(_, g1, _g2, g3) { return g1 + tertiary + g3; },
      },
      {
        label: 'brandColors.bg',
        pattern: /(    bg:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacer: function(_, g1, _g2, g3) { return g1 + bg + g3; },
      },
      {
        label: 'brandColors.bgSoft',
        pattern: /(    bgSoft:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacer: function(_, g1, _g2, g3) { return g1 + bgSoft + g3; },
      },
      {
        label: 'brandColors.border',
        pattern: /(    border:\s*")((?:[^"\\]|\\.)*)(")(?=[^a-z])/,
        replacer: function(_, g1, _g2, g3) { return g1 + borderSoft + g3; },
      },
    ];
    return applySubstitutions(text, subs, filePath);
  });
}

// ---- Rewrite: studio/sanity.config.ts -----------------------------------

function rewriteSanityConfig(config) {
  rewriteFile(resolve(root, 'studio/sanity.config.ts'), function(text, filePath) {
    // Extract the studioThemeProps object block using brace-walking
    const blockStart = text.indexOf('const studioThemeProps');
    if (blockStart === -1) {
      throw new Error(`apply-brand: studioThemeProps block not found in ${filePath}`);
    }
    const braceOpen = text.indexOf('{', blockStart);
    let depth = 1;
    let i = braceOpen + 1;
    while (i < text.length && depth > 0) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    }
    const braceClose = i - 1;
    const before = text.slice(0, braceOpen + 1);
    const inner = text.slice(braceOpen + 1, braceClose);
    const after = text.slice(braceClose);

    const subs = Object.entries(config.studio.themeProps).map(function([key, value]) {
      return {
        label: key,
        pattern: new RegExp("('" + esc(key) + "':\\s*')([^']+)(')"),
        replacer: function(_, g1, _g2, g3) { return g1 + value + g3; },
      };
    });

    return before + applySubstitutions(inner, subs, filePath + ' [studioThemeProps]') + after;
  });
}

// ---- Rewrite: scripts/generate-og-default.mjs ---------------------------

function rewriteOgDefault(config) {
  rewriteFile(resolve(root, 'scripts/generate-og-default.mjs'), function(text, filePath) {
    // Escape single quotes in tagline to avoid breaking the JS single-quoted string
    const safeTagline = config.tagline.replace(/'/g, "\\'");
    const name = config.name;
    const subs = [
      {
        label: 'wordmark',
        pattern: /(wordmark:\s*')((?:[^'\\]|\\.)*)(')/,
        replacer: function(_, g1, _g2, g3) { return g1 + name + g3; },
      },
      {
        label: 'tagline',
        pattern: /(tagline:\s*\[')((?:[^'\\]|\\.)*)('\])/,
        replacer: function(_, g1, _g2, g3) { return g1 + safeTagline + g3; },
      },
    ];
    return applySubstitutions(text, subs, filePath);
  });
}

// ---- Rewrite: scripts/lib/render-og.mjs ---------------------------------

function rewriteRenderOg(config) {
  rewriteFile(resolve(root, 'scripts/lib/render-og.mjs'), function(text, filePath) {
    const bg = config.palette.light['--background'];
    const primary = config.palette.theme['--color-primary'];
    const primaryDark = config.palette.theme['--color-primary-dark'];
    const accent = config.palette.theme['--color-accent'];
    const secondary = config.palette.theme['--color-secondary'];
    const fontDisplay = config.fonts.display.ogFontStack;
    const subs = [
      {
        label: 'DEFAULTS.bg',
        pattern: /(  bg:\s*')((?:[^'\\]|\\.)*)(')/,
        replacer: function(_, g1, _g2, g3) { return g1 + bg + g3; },
      },
      {
        label: 'DEFAULTS.primary',
        pattern: /(  primary:\s*')((?:[^'\\]|\\.)*)(')/,
        replacer: function(_, g1, _g2, g3) { return g1 + primary + g3; },
      },
      {
        label: 'DEFAULTS.primaryDark',
        pattern: /(  primaryDark:\s*')((?:[^'\\]|\\.)*)(')/,
        replacer: function(_, g1, _g2, g3) { return g1 + primaryDark + g3; },
      },
      {
        label: 'DEFAULTS.accent',
        pattern: /(  accent:\s*')((?:[^'\\]|\\.)*)(')/,
        replacer: function(_, g1, _g2, g3) { return g1 + accent + g3; },
      },
      {
        label: 'DEFAULTS.taupe',
        pattern: /(  taupe:\s*')((?:[^'\\]|\\.)*)(')/,
        replacer: function(_, g1, _g2, g3) { return g1 + secondary + g3; },
      },
      {
        label: 'DEFAULTS.fontDisplay',
        pattern: /(  fontDisplay:\s*')((?:[^'\\]|\\.)*)(')/,
        replacer: function(_, g1, _g2, g3) { return g1 + fontDisplay + g3; },
      },
    ];
    return applySubstitutions(text, subs, filePath);
  });
}

// ---- Rewrite: scripts/generate-og-pages.mjs ----------------------------

function rewriteOgPages(config) {
  rewriteFile(resolve(root, 'scripts/generate-og-pages.mjs'), function(text, filePath) {
    const name = config.name;
    const subs = [
      {
        label: 'WORDMARK fallback',
        // Matches: const WORDMARK = env.SITE_NAME ?? 'Studio Starter';
        // Captures the fallback string literal only
        pattern: /(const WORDMARK = env\.SITE_NAME \?\? ')((?:[^'\\]|\\.)*)(')/,
        replacer: function(_, g1, _g2, g3) { return g1 + name + g3; },
      },
    ];
    return applySubstitutions(text, subs, filePath);
  });
}

// ---- Rewrite: wrangler.jsonc + astro.config.mjs (domain-aware) ----------

function rewriteWranglerJsonc(config) {
  // Only rewrite when workerName is explicitly set in config
  // (null = leave wrangler.jsonc untouched; domain alone does not trigger this)
  if (!config.workerName) return;

  const workerName = config.workerName;
  rewriteFile(resolve(root, 'wrangler.jsonc'), function(text, filePath) {
    const subs = [
      {
        label: 'worker name',
        pattern: /("name":\s*")((?:[^"\\]|\\.)*)(")/,
        replacer: function(_, g1, _g2, g3) { return g1 + workerName + g3; },
      },
    ];
    return applySubstitutions(text, subs, filePath);
  });
}

function rewriteAstroConfig(config) {
  // Only rewrite when domain has been customised away from the neutral default
  if (config.domain === 'example.com') return;

  const domain = config.domain;
  rewriteFile(resolve(root, 'astro.config.mjs'), function(text, filePath) {
    const subs = [
      {
        label: 'site URL',
        pattern: /(  site:\s*')((?:[^'\\]|\\.)*)(')/,
        replacer: function(_, g1, _g2, g3) { return g1 + 'https://' + domain + g3; },
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

  if (CHECK_MODE) {
    console.log('[apply-brand] --check mode: validating config and dry-running substitutions...');
    console.log('[apply-brand] Config loaded and schema validation passed.');
  }

  const steps = [
    ['globals.css', function() { rewriteGlobalsCss(config); }],
    ['site.ts', function() { rewriteSiteTs(config); }],
    ['sanity.config.ts', function() { rewriteSanityConfig(config); }],
    ['generate-og-default.mjs', function() { rewriteOgDefault(config); }],
    ['render-og.mjs', function() { rewriteRenderOg(config); }],
    ['generate-og-pages.mjs', function() { rewriteOgPages(config); }],
    ['wrangler.jsonc', function() { rewriteWranglerJsonc(config); }],
    ['astro.config.mjs', function() { rewriteAstroConfig(config); }],
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

  if (CHECK_MODE) {
    console.log('[apply-brand] --check passed. All patterns matched; no files written.');
    process.exit(0);
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

// eslint.config.js — flat config (ESLint 9+)
// Minimal, low-noise ruleset: recommended bases only, with specific rules
// tuned so the existing codebase passes without mass-editing source files.

import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ── Global ignores ──────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      '.astro/**',
      '.wrangler/**',
      'node_modules/**',
      'studio/node_modules/**',
      'studio/dist/**',
      'src/lib/sanity.types.ts',
    ],
  },

  // ── TypeScript sources (ts/tsx and .mjs scripts) ────────────────────────
  // NOTE: Astro processor creates virtual .ts paths like src/Foo.astro/*.ts
  // These match src/**/*.ts, so we must account for them. The Astro override
  // block below corrects rule severity for those virtual paths.
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
  })),

  // ── Rule overrides for TS/mjs (non-Astro virtual paths) ─────────────────
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
    // Exclude Astro virtual paths — they are handled in the Astro override below
    ignores: ['**/*.astro/**'],
    // Re-register the plugin so rules resolve (the spread above scopes to files
    // but rule references still need the plugin symbol in scope)
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // 'any' is used intentionally in several Sanity-typed utilities
      '@typescript-eslint/no-explicit-any': 'off',
      // Unused vars: relax to warn; leading-underscore vars are intentional skips
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow require() in .mjs scripts that call Node built-ins via CJS interop
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ── Astro sources ───────────────────────────────────────────────────────
  // eslint-plugin-astro ships its own parser; spread the full recommended
  // config array so the parser, processor, and rules all land correctly.
  ...eslintPluginAstro.configs.recommended,

  // Scope the Astro configs to .astro files only (the plugin does this but
  // be explicit in case glob handling differs by OS)
  {
    files: ['src/**/*.astro'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // 'any' is used intentionally in several Sanity-typed utilities
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // Astro imports are often component-only (used in template, not script scope);
      // the Astro parser may not track usage through the template — warn only.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ── Astro virtual script paths (.astro/*.ts created by the Astro processor) ──
  // These virtual files match src/**/*.ts but contain raw script-block content.
  // Turn off rules that do not apply to Astro's inline script convention.
  {
    files: ['**/*.astro/**'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Astro <script> blocks use var for hoisting; cannot edit these files
      'no-var': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Catch bindings named `_` are conventional ignore markers; allow them
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];

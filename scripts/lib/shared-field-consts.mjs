// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
/**
 * shared-field-consts.mjs - reads module-level `defineField` constants out of one
 * schema file's source, for audit-studio.mjs (PORTS.md card 81, promoted from
 * fbcm 2026-10-03).
 *
 * The shape this exists for:
 *
 *   const eyebrow = defineField({ name: 'eyebrow', type: 'string' });
 *   defineType({ name: 'hero', fields: [eyebrow, ...] });
 *   defineType({ name: 'band', fields: [eyebrow, ...] });
 *
 * The audit slices a type's source from its `defineType(` to the next one and
 * collects every `name: '...'`. The `name: 'eyebrow'` literal sits where the
 * CONST is declared, outside every slice, so each type that spreads the const
 * looks as though it never declared the field, and every document storing it is
 * reported by check 3 as a stored key the schema does not declare ("Remove
 * field" bait). A shared const is the same idea as a helper call (FIELD_HELPERS
 * in audit-studio.mjs), written without the parentheses.
 *
 * Nothing here reads the disk, so it is unit-tested directly
 * (shared-field-consts.test.mjs).
 */

/**
 * identifier -> field name, for every `const x = defineField({ ... name: 'y' })`.
 *
 * @param {string} src one schema file's source
 * @returns {Map<string, string>}
 */
export function sharedFieldConsts(src) {
  const map = new Map();
  for (const m of src.matchAll(
    /const\s+([A-Za-z0-9_]+)\s*=\s*defineField\(\{[\s\S]{0,400}?name:\s*'([A-Za-z0-9_]+)'/g,
  )) {
    map.set(m[1], m[2]);
  }
  return map;
}

/**
 * The field names contributed to `body` by shared consts it lists by bare
 * identifier (`[eyebrow, title]`, `eyebrow,` on its own line, or the last
 * element before `]`).
 *
 * @param {string} body source of one type
 * @param {Map<string, string>} shared from sharedFieldConsts
 * @returns {string[]}
 */
export function sharedFieldNames(body, shared) {
  const out = [];
  for (const [ident, field] of shared) {
    if (new RegExp(`(^|[^A-Za-z0-9_.])${ident}\\s*[,\\]]`).test(body)) out.push(field);
  }
  return out;
}

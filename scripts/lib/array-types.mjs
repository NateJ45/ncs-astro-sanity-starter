// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// scripts/lib/array-types.mjs
//
// Shared by scripts/audit-data-vs-schema.mjs and scripts/backfill-array-types.mjs.
// Ported from mas-monograms (2026-10-05) into the starter on 2026-10-13, PORTS.md
// card 95.
//
// An array item stored without `_type` is something the Studio cannot open when
// the array allows more than one kind of item ("Item of type object not valid
// for this list"). inferMember() says which allowed kind a typeless item is.

/** Names of an object member's declared fields. */
function fieldNames(member) {
  return new Set((member.fields ?? []).map((f) => f.name));
}

/**
 * Which member of `members` is this typeless item? One object member: that one.
 * Several: the members whose declared fields cover every key the item stores,
 * and of those the one with the FEWEST fields (the most specific match: a
 * { label, href } item is the typed-address link, not the richer page link that
 * also happens to declare label and href). A tie or no match returns null.
 */
export function inferMember(item, members) {
  const objectMembers = members.filter((m) => m.jsonType === 'object');
  if (objectMembers.length === 1) return objectMembers[0];
  const keys = Object.keys(item).filter((k) => !k.startsWith('_'));
  const fits = objectMembers.filter((m) => {
    const names = fieldNames(m);
    return keys.every((k) => names.has(k));
  });
  if (!fits.length) return null;
  const smallest = Math.min(...fits.map((m) => fieldNames(m).size));
  const best = fits.filter((m) => fieldNames(m).size === smallest);
  return best.length === 1 ? best[0] : null;
}

const OPAQUE = new Set(['image', 'file', 'block', 'span', 'reference', 'slug', 'geopoint']);

/** A field's type, or null for a built-in the Studio registry resolves lazily. */
export function fieldType(field) {
  try {
    const t = field.type;
    void t.jsonType;
    return t;
  } catch {
    return null;
  }
}

/**
 * Returns a copy of `value` with `_type` added to every typeless array item that
 * can be placed, plus the list of paths changed and the ones it could not place.
 */
export function fillTypes(value, type, path = '', acc = { changed: [], unplaced: [] }) {
  if (value == null || !type || OPAQUE.has(type.name)) return { value, ...acc };
  if (type.jsonType === 'array' && Array.isArray(value)) {
    const members = type.of ?? [];
    const next = value.map((item, i) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      const at = `${path}[${i}]`;
      let member = members.find((m) => m.name === item._type);
      let out = item;
      if (!item._type) {
        member = inferMember(item, members);
        if (!member) {
          acc.unplaced.push(at);
          return item;
        }
        out = { _type: member.name, ...item };
        acc.changed.push(`${at} -> ${member.name}`);
      }
      return member ? fillTypes(out, member, at, acc).value : out;
    });
    return { value: next, ...acc };
  }
  if (type.jsonType === 'object' && typeof value === 'object' && !Array.isArray(value)) {
    const fields = new Map((type.fields ?? []).map((f) => [f.name, f]));
    const next = { ...value };
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('_') || !fields.has(k)) continue;
      const ft = fieldType(fields.get(k));
      if (ft) next[k] = fillTypes(v, ft, `${path}.${k}`, acc).value;
    }
    return { value: next, ...acc };
  }
  return { value, ...acc };
}

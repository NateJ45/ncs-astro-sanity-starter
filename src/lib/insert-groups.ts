// Safe to edit by hand
// =============================================================================
// insert-groups - merge a library's "+ Add item" menu groups into the base list
// =============================================================================
// The page builder's insert menu (SECTION_INSERT_MENU in
// src/sanity/schemaTypes/sections.ts, PORTS.md card 17) sorts blocks into
// plain-language groups. A block library that lives in its own file (the
// builder kit, card 173; a fork's own blocks) names where ITS blocks go, and
// withSiteGroups() merges that into the base list, so adding a library never
// means editing the base groups:
//   - a group whose `name` already exists gains the types (no duplicates),
//   - a new name becomes a new group at the end, in the order given.
// Neither input is changed. Pure, so insert-groups.test.ts pins it.
// =============================================================================

/** One group of the "+ Add item" menu. */
export interface InsertGroup {
  name: string;
  title: string;
  of: string[];
}

export function withSiteGroups<G extends InsertGroup>(groups: G[], extra: InsertGroup[]): G[] {
  const out = groups.map((g) => ({ ...g, of: [...g.of] }));
  for (const add of extra) {
    const found = out.find((g) => g.name === add.name);
    if (found) found.of.push(...add.of.filter((t) => !found.of.includes(t)));
    else out.push({ ...add, of: [...add.of] } as G);
  }
  return out;
}

// Safe to edit by hand
// Walks Sanity Portable Text blocks and returns a flat list of headings with
// deterministic anchor IDs. The PortableText renderer uses the same slugify()
// for its h3/h4 ids so TOC links match rendered headings.

import { slugify } from './slugify';

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3 | 4;
}

export function extractHeadings(blocks: any): Heading[] {
  if (!Array.isArray(blocks)) return [];
  const seen = new Map<string, number>();
  const out: Heading[] = [];
  for (const b of blocks) {
    if (b?._type !== 'block') continue;
    const styleToLevel: Record<string, 2 | 3 | 4> = { h2: 2, h3: 3, h4: 4 };
    const level = styleToLevel[b.style];
    if (!level) continue;
    const text = Array.isArray(b.children)
      ? b.children.map((c: any) => c?.text ?? '').join('').trim()
      : '';
    if (!text) continue;
    const base = slugify(text);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    out.push({ id, text, level });
  }
  return out;
}

// Safe to edit by hand
// Estimates reading time from a Sanity Portable Text block array.
// Walks the blocks, sums the text content's word count, divides by an
// average adult silent reading speed (200 wpm), rounds up to the next minute.

export function readingTimeFromPortableText(blocks: any): number {
  if (!Array.isArray(blocks)) return 0;
  const words = blocks
    .filter((b) => b?._type === 'block' && Array.isArray(b.children))
    .flatMap((b) => b.children.map((c: any) => c?.text ?? ''))
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}

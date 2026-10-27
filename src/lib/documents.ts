// scaffold-file: documents
// Safe to edit by hand
// =============================================================================
// The documents library: which files are current, newest first (PORTS.md card 197)
// =============================================================================
// Pure helpers for the `libraryDocument` collection and the Documents block. Built from FBC
// Auburn's downloads shelf (bulletins, forms, policies) without the church parts: a category is
// whatever the editor types ("Forms", "Price lists", "Minutes"), not a fixed list.
//
// WHAT "CURRENT" MEANS. A document is shown while it has a file and either no "take it down
// after" date, or that date is today or later. The site rebuilds every morning, so a file whose
// last day was yesterday drops off by itself. "Today" is a calendar day in `timeZone` (UTC unless
// the caller passes the site's zone), never the build machine's zone.
//
// No Astro or Vite imports, so `node --test` can run it.

/** The file asset as the GROQ projection resolves it (`file.asset->`). */
export interface FileAsset {
  url?: string | null;
  size?: number | null;
  extension?: string | null;
  originalFilename?: string | null;
}

export interface LibraryDocument {
  _id: string;
  title?: string | null;
  /** The group it is listed under, as the editor typed it. */
  category?: string | null;
  /** YYYY-MM-DD. */
  date?: string | null;
  note?: string | null;
  /** The last day it shows. Empty: it never comes down by itself. */
  expires?: string | null;
  file?: FileAsset | null;
}

/** Today's calendar day, YYYY-MM-DD, in a time zone (UTC by default). */
export function today(now: Date, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Still up: it has a file, and no expiry date or the expiry date is today or later. */
export function isCurrent(d: LibraryDocument, now: Date, timeZone = 'UTC'): boolean {
  return !!d.file?.url && (!d.expires || d.expires.slice(0, 10) >= today(now, timeZone));
}

/** Case and spacing do not make a new group: "Forms " and "forms" are the same one. */
const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

/**
 * The documents a list shows: current ones in a group (or every group when `category` is empty),
 * newest first by date, then by title, at most `limit`.
 */
export function currentDocuments(
  list: LibraryDocument[],
  now: Date,
  category?: string | null,
  limit = 10,
  timeZone = 'UTC',
): LibraryDocument[] {
  const want = norm(category);
  return list
    .filter((d) => isCurrent(d, now, timeZone))
    .filter((d) => !want || norm(d.category) === want)
    .sort(
      (a, b) =>
        (b.date ?? '').localeCompare(a.date ?? '') || (a.title ?? '').localeCompare(b.title ?? ''),
    )
    .slice(0, Math.max(1, limit));
}

/** "240 KB", "1.2 MB", "512 bytes". */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}

/** "PDF, 240 KB" from a file asset, or "". Tells people what they are about to download. */
export function fileLabel(f?: FileAsset | null): string {
  if (!f) return '';
  const ext = (f.extension || f.originalFilename?.split('.').pop() || '').toUpperCase();
  const size = typeof f.size === 'number' && f.size > 0 ? humanSize(f.size) : '';
  return [ext, size].filter(Boolean).join(', ');
}

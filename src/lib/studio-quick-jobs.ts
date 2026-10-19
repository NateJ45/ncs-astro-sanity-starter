// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Quick update jobs from config alone: the pure half (Studio kit, card 137)
// =============================================================================
// Card 111's Quick update forms each needed a `build` function. Card 137 adds
// six generic jobs a site declares as DATA in kit.config.ts (QuickForm.job):
//
//   create    a new document of a type, from a few fields and fixed defaults
//   edit      change some fields on one document (a singleton)
//   append    add an item to a list on one document (a notice to the notices)
//   upload    put a file or a picture into one field
//   toggle    switch one true/false field (the banner on or off)
//   schedule  a new document saved as a DRAFT with "publish at" set, so the
//             publish-due workflow (card 111) puts it up at that time
//   link      a tile that opens another tool, a document or a list (the
//             newsletter, Messages, RSVPs), so the job keeps that tool's own
//             safeguards (the newsletter's test send first)
//
// An edit job may PICK its document from a list instead of naming one
// (`pick: { type }`), and any form may show only in a season (QuickForm.when,
// inSeason() below).
//
// Every field says where its answer goes (`path`, dot-separated; default its
// name) and how it is stored (`as: 'blocks'` for rich text, `as: 'slug'`).
// The React half is src/sanity/kit/QuickUpdateTool.tsx; this file decides the
// values, and src/lib/studio-quick-jobs.test.ts checks it in bare Node.
// =============================================================================

import type { StudioTarget } from './studio-kit.ts';

/** A plain field's kinds (card 111's five, plus card 137's). */
export type QuickJobFieldKind =
  | 'string'
  | 'text'
  | 'date'
  | 'datetime'
  | 'url'
  | 'number'
  | 'boolean'
  | 'select'
  | 'file'
  | 'image';

/** What a job field needs here (the full QuickField is in kit/types.ts). */
export interface JobField {
  name: string;
  kind: QuickJobFieldKind;
  /** Where the answer goes in the document or item, dot-separated. Default: name. */
  path?: string;
  /** 'blocks': text as Portable Text paragraphs. 'slug': { _type: 'slug', current }. */
  as?: 'blocks' | 'slug';
}

export type QuickJob =
  | {
      kind: 'create';
      /** The document type ("notice"). */
      type: string;
      /** Fixed values every new one starts with ({ showOnHome: true }). */
      defaults?: Record<string, unknown>;
      /** Fill `slug` from this field's answer ("title"). */
      slugFrom?: string;
      /** Save a draft for the editor to publish, instead of publishing. Default false. */
      draft?: boolean;
    }
  | {
      kind: 'edit';
      /** The document to edit (a singleton's id). Or `pick`, to choose one first. */
      doc?: string;
      type?: string;
      /** Choose the document from a list: newest first, by title. */
      pick?: {
        type: string;
        /** Extra GROQ filter ("date >= now()"). */
        filter?: string;
        /** GROQ order. Default "_updatedAt desc". */
        order?: string;
        /** The field shown as each row's name. Default title, then name. */
        titleField?: string;
        /** The words above the list ("Which event?"). */
        label?: string;
      };
    }
  | {
      kind: 'link';
      /** Where the tile goes: a tool, a document, a new document or a desk pane. */
      target: StudioTarget;
    }
  | {
      kind: 'append';
      doc: string;
      type?: string;
      /** The list field, dot-separated ("notices"). */
      array: string;
      /** The item's _type when the list holds objects of a named type. */
      itemType?: string;
      defaults?: Record<string, unknown>;
      /** Top or bottom of the list. Default 'start' (newest first). */
      at?: 'start' | 'end';
    }
  | {
      kind: 'upload';
      doc: string;
      type?: string;
      /** The file or image field, dot-separated ("bulletin"). */
      field: string;
      asset: 'file' | 'image';
      /** The file picker's accept ("application/pdf"). */
      accept?: string;
    }
  | {
      kind: 'toggle';
      doc: string;
      type?: string;
      /** The true/false field ("banner.show"). */
      field: string;
      /** "The banner is showing" / "The banner is hidden". */
      onLabel?: string;
      offLabel?: string;
    }
  | {
      kind: 'schedule';
      type: string;
      /** The "publish automatically at" field. Default 'publishAt'. */
      at?: string;
      defaults?: Record<string, unknown>;
      slugFrom?: string;
    };

/** A form's season: shown only between these days. 'MM-DD' repeats every year (and may wrap the new year); 'YYYY-MM-DD' is one-off. */
export interface QuickSeason {
  from: string;
  to: string;
}

/** Is `now` inside the season (both ends included, local dates)? No season: always. */
export function inSeason(season: QuickSeason | undefined, now: Date): boolean {
  if (!season) return true;
  const p = (n: number) => String(n).padStart(2, '0');
  const md = `${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const ymd = `${now.getFullYear()}-${md}`;
  const full = /^\d{4}-\d{2}-\d{2}$/;
  if (full.test(season.from) && full.test(season.to)) return ymd >= season.from && ymd <= season.to;
  const from = season.from.slice(-5);
  const to = season.to.slice(-5);
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}

/** The GROQ that lists an edit job's choices. */
export function pickQuery(pick: NonNullable<Extract<QuickJob, { kind: 'edit' }>['pick']>): string {
  const title = pick.titleField
    ? `coalesce(${pick.titleField}, title, name, _id)`
    : 'coalesce(title, name, _id)';
  const filter = pick.filter ? ` && (${pick.filter})` : '';
  return `*[_type == $type && !(_id in path("drafts.**"))${filter}] | order(${pick.order ?? '_updatedAt desc'})[0...60]{ _id, _type, "title": ${title} }`;
}

/** An uploaded asset as Sanity stores it in a field. */
export function assetValue(kind: 'file' | 'image', assetId: string): Record<string, unknown> {
  return { _type: kind, asset: { _type: 'reference', _ref: assetId } };
}

/** A short random key for list items and blocks. */
export function newKey(): string {
  return Math.random().toString(36).slice(2, 12);
}

/** "Harvest Supper, 2026!" -> "harvest-supper-2026". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

/** Plain text to Portable Text: a blank line starts a new paragraph. */
export function textToBlocks(text: string, key: () => string = newKey): unknown[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({
      _type: 'block',
      _key: key(),
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: key(), text: p.replace(/\s*\n\s*/g, ' '), marks: [] }],
    }));
}

/** Set a dot path on an object, making the objects on the way. Returns the object. */
export function setPath<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const parts = path.split('.').filter(Boolean);
  let at: Record<string, unknown> = obj;
  parts.forEach((p, i) => {
    if (i === parts.length - 1) at[p] = value;
    else {
      if (typeof at[p] !== 'object' || at[p] === null) at[p] = {};
      at = at[p] as Record<string, unknown>;
    }
  });
  return obj;
}

/** Read a dot path. */
export function getPath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>(
      (at, p) => (at && typeof at === 'object' ? (at as Record<string, unknown>)[p] : undefined),
      obj,
    );
}

/** One answer (a string from the form) as it is stored. Empty answers are left out (undefined). */
export function storedValue(field: JobField, raw: string, key: () => string = newKey): unknown {
  const v = raw.trim();
  if (field.kind === 'boolean') return v === 'true';
  if (!v) return undefined;
  if (field.kind === 'number') return Number(v);
  if (field.kind === 'datetime' && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
  if (field.as === 'blocks') return textToBlocks(v, key);
  if (field.as === 'slug') return { _type: 'slug', current: slugify(v) };
  return v;
}

/** A stored value back to the form's string (for edit jobs). */
export function formValue(field: JobField, stored: unknown): string {
  if (stored === undefined || stored === null) return '';
  if (field.kind === 'boolean') return stored === true ? 'true' : 'false';
  if (field.as === 'slug') return String((stored as { current?: string }).current ?? '');
  if (field.as === 'blocks' && Array.isArray(stored)) {
    return stored
      .map((b) =>
        ((b as { children?: { text?: string }[] }).children ?? [])
          .map((c) => c.text ?? '')
          .join(''),
      )
      .join('\n\n');
  }
  if (field.kind === 'datetime' && typeof stored === 'string') {
    const d = new Date(stored);
    if (Number.isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  return typeof stored === 'object' ? '' : String(stored);
}

/**
 * The answers as { path: value }: plain fields from `values`, file and image
 * fields from `assets` (the uploaded asset ids by field name).
 */
export function answers(
  fields: JobField[],
  values: Record<string, string>,
  assets: Record<string, string> = {},
  key: () => string = newKey,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const path = f.path ?? f.name;
    if (f.kind === 'file' || f.kind === 'image') {
      if (assets[f.name]) out[path] = assetValue(f.kind, assets[f.name]);
      continue;
    }
    const v = storedValue(f, values[f.name] ?? '', key);
    if (v !== undefined) out[path] = v;
  }
  return out;
}

/** A whole new document (create, schedule) from the answers. No _id: the tool adds it. */
export function jobDocument(
  job: Extract<QuickJob, { kind: 'create' | 'schedule' }>,
  fields: JobField[],
  values: Record<string, string>,
  assets: Record<string, string> = {},
  key: () => string = newKey,
): { _type: string } & Record<string, unknown> {
  const doc: { _type: string } & Record<string, unknown> = {
    _type: job.type,
    ...structuredClone(job.defaults ?? {}),
  };
  for (const [path, v] of Object.entries(answers(fields, values, assets, key)))
    setPath(doc, path, v);
  if (job.slugFrom && values[job.slugFrom]?.trim()) {
    setPath(doc, 'slug', { _type: 'slug', current: slugify(values[job.slugFrom]) });
  }
  return doc;
}

/** A new list item (append) from the answers, with its _key. */
export function jobItem(
  job: Extract<QuickJob, { kind: 'append' }>,
  fields: JobField[],
  values: Record<string, string>,
  assets: Record<string, string> = {},
  key: () => string = newKey,
): Record<string, unknown> {
  const item: Record<string, unknown> = {
    _key: key(),
    ...(job.itemType ? { _type: job.itemType } : {}),
    ...structuredClone(job.defaults ?? {}),
  };
  for (const [path, v] of Object.entries(answers(fields, values, assets, key)))
    setPath(item, path, v);
  return item;
}

/** The document a job opens in "Open it in the full editor". */
export function jobTarget(job: QuickJob, createdId?: string): { doc: string; type: string } | null {
  if (job.kind === 'create' || job.kind === 'schedule') {
    return createdId ? { doc: createdId, type: job.type } : null;
  }
  if (job.kind === 'link') return null;
  const doc = job.doc ?? createdId;
  return doc
    ? { doc, type: job.type ?? (job.kind === 'edit' ? job.pick?.type : undefined) ?? doc }
    : null;
}

/** Problems with a job's config, in plain words (the unit test runs every site's). */
export function jobProblems(id: string, job: QuickJob, fields: JobField[]): string[] {
  const out: string[] = [];
  const names = new Set(fields.map((f) => f.name));
  if ((job.kind === 'create' || job.kind === 'schedule') && !job.type)
    out.push(`${id}: needs "type".`);
  if (job.kind === 'edit' && !job.doc && !job.pick?.type) out.push(`${id}: needs "doc" or "pick".`);
  if ((job.kind === 'append' || job.kind === 'upload' || job.kind === 'toggle') && !job.doc) {
    out.push(`${id}: needs "doc".`);
  }
  if (job.kind === 'link' && !job.target) out.push(`${id}: needs "target".`);
  if (
    (job.kind === 'create' || job.kind === 'schedule') &&
    job.slugFrom &&
    !names.has(job.slugFrom)
  ) {
    out.push(`${id}: slugFrom "${job.slugFrom}" is not one of its fields.`);
  }
  if (job.kind === 'append' && !job.array) out.push(`${id}: needs "array".`);
  if ((job.kind === 'toggle' || job.kind === 'upload') && !job.field)
    out.push(`${id}: needs "field".`);
  if (['create', 'edit', 'append', 'schedule'].includes(job.kind) && !fields.length) {
    out.push(`${id}: needs at least one field.`);
  }
  if (
    job.kind === 'schedule' &&
    fields.some((f) => (f.path ?? f.name) === (job.at ?? 'publishAt'))
  ) {
    out.push(`${id}: the publish time is asked for by the kit; leave it out of the fields.`);
  }
  return out;
}

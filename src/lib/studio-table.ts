// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// studio-table - the pure half of the Studio's table panes (PORTS.md card 117)
// =============================================================================
// A long list (sermons, downloads, people) reads better as a sortable table
// with a status pill per row than as the desk's one-line list. The component is
// src/sanity/workflow/DocumentTable.tsx; WHICH tables and WHICH columns are the
// site's own, in src/sanity/tables.config.ts. This file is the logic both share:
// merging a document's draft and published copies into one row, the status
// that row gets, sorting, and the text a cell shows. No React, no client, so
// src/lib/studio-table.test.ts covers it in bare Node.
//
// The normal desk list stays where it was; a table is an extra item beside it,
// never a replacement, so a table that misbehaves costs nothing.
// =============================================================================

export type ColumnKind = 'text' | 'date' | 'bool' | 'list';

export interface TableColumn {
  /** The field name in the projection. */
  key: string;
  label: string;
  kind?: ColumnKind;
}

export interface TableConfig {
  /** Desk id, unique, kebab-case (also the pane id). */
  id: string;
  /** The desk item's title, e.g. "Sermons as a table". */
  title: string;
  /** The document type listed. */
  type: string;
  /** GROQ projection body: every column key must be produced here. `_id` is added. */
  projection: string;
  columns: TableColumn[];
  defaultSort: { key: string; dir: 'asc' | 'desc' };
}

export type RowStatus = 'published' | 'changed' | 'draft';

export const ROW_STATUS_LABELS: Record<RowStatus, string> = {
  published: 'Published',
  changed: 'Changes not published',
  draft: 'Draft',
};

export interface TableRow {
  id: string;
  status: RowStatus;
  values: Record<string, unknown>;
}

/**
 * Raw rows (perspective raw: drafts and published side by side) into one row
 * per document. The draft's values are shown when there is one, because that
 * is what the editor will see on opening it.
 */
export function mergeDrafts(raw: Array<Record<string, unknown> & { _id: string }>): TableRow[] {
  const pub = new Map<string, Record<string, unknown>>();
  const draft = new Map<string, Record<string, unknown>>();
  for (const r of raw) {
    if (typeof r._id !== 'string' || r._id.startsWith('versions.')) continue;
    if (r._id.startsWith('drafts.')) draft.set(r._id.slice(7), r);
    else pub.set(r._id, r);
  }
  const ids = new Set([...pub.keys(), ...draft.keys()]);
  return [...ids].map((id) => {
    const p = pub.get(id);
    const d = draft.get(id);
    return {
      id,
      status: p && d ? 'changed' : p ? 'published' : 'draft',
      values: (d ?? p) as Record<string, unknown>,
    };
  });
}

/** What a cell shows. An empty value is a blank cell (a dash would read as data). */
export function cellText(value: unknown, kind: ColumnKind = 'text'): string {
  if (kind === 'bool') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '';
  if (kind === 'list' || Array.isArray(value)) {
    return (Array.isArray(value) ? value : [value])
      .filter((v) => v !== null && v !== undefined && v !== '')
      .join(', ');
  }
  if (kind === 'date') {
    const s = String(value);
    const t = Date.parse(s.length === 10 ? `${s}T12:00:00Z` : s);
    if (!Number.isFinite(t)) return s;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(t));
  }
  return String(value);
}

function sortKey(value: unknown, kind: ColumnKind): string | number {
  if (kind === 'bool') return value ? 1 : 0;
  if (kind === 'date') {
    const t = Date.parse(String(value ?? ''));
    return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
  }
  return cellText(value, kind).toLocaleLowerCase();
}

/**
 * Sort rows by one column. Blank cells always sink to the bottom whichever way
 * the column is sorted, so an undated sermon never heads the list.
 */
export function sortRows(
  rows: TableRow[],
  key: string,
  dir: 'asc' | 'desc',
  kind: ColumnKind = 'text',
): TableRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  const blank = (r: TableRow) =>
    kind !== 'bool' && cellText(key === 'status' ? r.status : r.values[key], kind) === '';
  return [...rows].sort((a, b) => {
    const ba = blank(a);
    const bb = blank(b);
    if (ba !== bb) return ba ? 1 : -1;
    const va = key === 'status' ? a.status : sortKey(a.values[key], kind);
    const vb = key === 'status' ? b.status : sortKey(b.values[key], kind);
    if (va < vb) return -sign;
    if (va > vb) return sign;
    return a.id.localeCompare(b.id);
  });
}

/** The GROQ query for a table: every copy of the type, newest change first. */
export function tableQuery(config: Pick<TableConfig, 'type' | 'projection'>): string {
  return `*[_type == $type && !(_id in path("versions.**"))]{ _id, ${config.projection} }`;
}

/** Config sanity checks the test runs over the site's tables.config.ts. */
export function configProblems(configs: TableConfig[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const c of configs) {
    if (!/^[a-z0-9-]+$/.test(c.id)) out.push(`${c.id}: id must be kebab-case`);
    if (ids.has(c.id)) out.push(`${c.id}: duplicate id`);
    ids.add(c.id);
    if (c.columns.length === 0) out.push(`${c.id}: no columns`);
    const keys = new Set(c.columns.map((col) => col.key));
    if (c.defaultSort.key !== 'status' && !keys.has(c.defaultSort.key)) {
      out.push(`${c.id}: defaultSort.key "${c.defaultSort.key}" is not a column`);
    }
    for (const col of c.columns) {
      if (!new RegExp(`(^|[\\s,"])${col.key}\\b`).test(c.projection)) {
        out.push(`${c.id}: column "${col.key}" is not in the projection`);
      }
    }
  }
  return out;
}

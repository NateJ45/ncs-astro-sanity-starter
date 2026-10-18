// Safe to edit by hand
// =============================================================================
// Table panes for long lists (PORTS.md card 117) - THIS SITE'S columns
// =============================================================================
// Each entry adds a "<title>" item to the desk (src/sanity/structure.ts) that
// opens a sortable table of one document type, with a status pill per row and
// an Open button. The normal list stays where it was; this is an extra view.
//
// To add one: name the type, write a GROQ projection that produces every
// column key (dereference with ->, flags with defined()), list the columns,
// and pick the default sort. src/lib/studio-table.test.ts fails if a column is
// missing from its projection or the sort key is not a column.
//
// Column kinds: 'text' (default), 'date' (formatted, sorts by time), 'bool'
// (Yes / No), 'list' (an array shown comma-separated).
// =============================================================================
import type { TableConfig } from '../lib/studio-table';

export const TABLES: TableConfig[] = [
  // scaffold: journal
  {
    id: 'journal-table',
    title: 'Posts as a table',
    type: 'journalEntry',
    projection: 'publishedAt, title, "categories": categories[]->title, featured',
    columns: [
      { key: 'publishedAt', label: 'Date', kind: 'date' },
      { key: 'title', label: 'Title' },
      { key: 'categories', label: 'Categories', kind: 'list' },
      { key: 'featured', label: 'Featured', kind: 'bool' },
    ],
    defaultSort: { key: 'publishedAt', dir: 'desc' },
  },
  // scaffold:end
];

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// mail-sqlite - TESTS ONLY: a D1-shaped database over Node's built-in SQLite
// =============================================================================
// D1 is SQLite, so the mail tests run the real MAIL_DDL and the real queries
// against node:sqlite (built into Node 22.13+, no package) instead of a fake
// that would agree with whatever the code assumed. Never imported by a route.
// =============================================================================
import { DatabaseSync } from 'node:sqlite';
import type { D1Database, D1Statement } from './mail-db.ts';

type Bindable = string | number | bigint | null | Uint8Array;

export function sqliteD1(ddl: string): D1Database & { raw: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  db.exec(ddl);
  const statement = (sql: string, values: Bindable[]): D1Statement => ({
    bind: (...v: unknown[]) =>
      statement(
        sql,
        v.map((x) =>
          x === undefined ? null : typeof x === 'boolean' ? Number(x) : x,
        ) as Bindable[],
      ),
    run: async () => {
      const r = db.prepare(sql).run(...values);
      return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
    all: async <T>() => ({ results: db.prepare(sql).all(...values) as T[] }),
    first: async <T>() => (db.prepare(sql).get(...values) as T | undefined) ?? null,
  });
  return { raw: db, prepare: (sql: string) => statement(sql, []) };
}

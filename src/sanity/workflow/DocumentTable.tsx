// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// DocumentTable - a sortable table pane for a long list (PORTS.md card 114)
// =============================================================================
// One component, configured per site in src/sanity/tables.config.ts: which
// type, which columns. Click a column heading to sort by it (again to reverse);
// every row has a status pill (Published / Changes not published / Draft) and
// an Open button that goes to the normal editor. The logic (draft merging,
// sorting, cell text) is src/lib/studio-table.ts, unit-tested.
//
// It sits BESIDE the normal desk list, never instead of it (structure.ts adds
// it as an extra item), so if a Sanity upgrade ever breaks a custom pane the
// editor still has the list they always had.
// =============================================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import { RefreshIcon } from '@sanity/icons/Refresh';
import {
  cellText,
  mergeDrafts,
  ROW_STATUS_LABELS,
  sortRows,
  tableQuery,
  type RowStatus,
  type TableConfig,
  type TableRow,
} from '../../lib/studio-table';
import { useStudioLink } from '../kit/shared';
import { WORKFLOW_API_VERSION } from './studioApi';

const TONE: Record<RowStatus, 'positive' | 'caution' | 'default'> = {
  published: 'positive',
  changed: 'caution',
  draft: 'default',
};

const cell = { padding: '8px 12px', borderBottom: '1px solid var(--card-border-color)' } as const;

/** How the active column is sorted, in words. */
function sortNote(kind: string, dir: 'asc' | 'desc'): string {
  if (kind === 'date') return dir === 'asc' ? 'oldest first' : 'newest first';
  if (kind === 'bool') return dir === 'asc' ? 'No first' : 'Yes first';
  return dir === 'asc' ? 'A to Z' : 'Z to A';
}

export function makeDocumentTable(config: TableConfig) {
  function DocumentTable() {
    const client = useClient({ apiVersion: WORKFLOW_API_VERSION });
    const link = useStudioLink();
    const [rows, setRows] = useState<TableRow[] | null>(null);
    const [error, setError] = useState(false);
    const [sort, setSort] = useState(config.defaultSort);

    const load = useCallback(async () => {
      setError(false);
      try {
        const raw = await client.fetch<Array<Record<string, unknown> & { _id: string }>>(
          tableQuery(config),
          { type: config.type },
          { perspective: 'raw' },
        );
        setRows(mergeDrafts(raw));
      } catch {
        setError(true);
      }
    }, [client]);

    useEffect(() => {
      void load();
    }, [load]);

    const kindOf = (key: string) => config.columns.find((c) => c.key === key)?.kind ?? 'text';
    const sorted = useMemo(
      () => (rows ? sortRows(rows, sort.key, sort.dir, kindOf(sort.key)) : []),
      [rows, sort],
    );

    const sortBy = (key: string) =>
      setSort((s) =>
        s.key === key
          ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: kindOf(key) === 'date' ? 'desc' : 'asc' },
      );

    const header = (key: string, label: string) => {
      const active = sort.key === key;
      return (
        <th
          key={key}
          scope="col"
          aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
          style={{ ...cell, textAlign: 'left', whiteSpace: 'nowrap' }}
        >
          <Button
            mode="bleed"
            padding={2}
            fontSize={1}
            text={active ? `${label} (${sortNote(kindOf(key), sort.dir)})` : label}
            onClick={() => sortBy(key)}
          />
        </th>
      );
    };

    return (
      <Card height="fill" overflow="auto">
        <Stack gap={3} padding={3}>
          <Flex align="center" gap={2}>
            <Box flex={1}>
              <Text size={1} muted>
                {rows ? `${rows.length} in all. Click a heading to sort.` : 'Loading...'}
              </Text>
            </Box>
            <Button icon={RefreshIcon} mode="ghost" text="Refresh" onClick={() => void load()} />
          </Flex>
          {error && (
            <Card padding={3} tone="critical" radius={2} border>
              <Text size={1}>The list could not load just now. Use the normal list instead.</Text>
            </Card>
          )}
          {!rows && !error && <Spinner muted />}
          {rows && (
            <Card radius={2} border overflow="auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {config.columns.map((c) => header(c.key, c.label))}
                    {header('status', 'Status')}
                    <th scope="col" style={cell}>
                      <span
                        style={{
                          position: 'absolute',
                          width: 1,
                          height: 1,
                          overflow: 'hidden',
                          clip: 'rect(0 0 0 0)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Open
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => {
                    const open = link({ doc: r.id, type: config.type });
                    return (
                      <tr key={r.id}>
                        {config.columns.map((c) => (
                          <td key={c.key} style={cell}>
                            <Text size={1}>{cellText(r.values[c.key], c.kind)}</Text>
                          </td>
                        ))}
                        <td style={cell}>
                          <Badge tone={TONE[r.status]} fontSize={1} padding={2} radius={4}>
                            {ROW_STATUS_LABELS[r.status]}
                          </Badge>
                        </td>
                        <td style={{ ...cell, textAlign: 'right' }}>
                          <Button
                            as="a"
                            href={open.href}
                            onClick={open.onClick}
                            mode="ghost"
                            text="Open"
                            fontSize={1}
                            padding={2}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </Stack>
      </Card>
    );
  }
  DocumentTable.displayName = `DocumentTable(${config.id})`;
  return DocumentTable;
}

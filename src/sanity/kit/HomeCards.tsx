// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Home's dashboard cards, round four (Studio kit, PORTS.md card 115)
// =============================================================================
// The cards that bring Home up to the WordPress staff dashboard on the family's
// WordPress sites. HomeTool.tsx lays them out; each fails soft (a quiet
// sentence, never a blank) like the rest of Home. What they decide is pure and
// tested in src/lib/studio-home.ts and src/lib/studio-analytics.ts.
//
//   Coming up    drafts with a "Publish automatically at" time (card 111's
//                scheduled publishing), soonest first, in plain words.
//   Fix-it list  the Checkup's findings by name, each with Edit; the rules are
//                the Checkup's own (useCheckup), never repeated here.
//   Visitors     /api/studio/visitors/ (Cloudflare Web Analytics through the
//                Worker): the week against the week before, a four-week chart
//                in plain SVG, the most-read pages and where people came from.
//   Your pages   kitConfig.pages: every page the editor can change, grouped.
// =============================================================================

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useClient, useSchema } from 'sanity';
import { Badge, Box, Button, Card, Flex, Grid, Heading, Spinner, Stack, Text } from '@sanity/ui';
import { countBySeverity, publishedIdOf, type CheckResult } from '../../lib/studio-checkup';
import { comingUp, fixItList, resolvePageMap, type ComingRow } from '../../lib/studio-home';
import { weekCompare, type VisitorsReport } from '../../lib/studio-analytics';
import type { StudioTarget } from '../../lib/studio-kit';
import { API_VERSION, studioToken, useStudioLink, useTypeTitle } from './shared';
import { SEVERITY_TONE } from './CheckupTool';
import type { PageMapGroup } from './types';

// -----------------------------------------------------------------------------
// The card frame, shared with HomeTool.tsx
// -----------------------------------------------------------------------------

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  /** A small link beside the title ("See the whole list"). */
  action?: ReactNode;
}) {
  return (
    <Card padding={4} radius={3} border>
      <Stack gap={4}>
        <Flex align="center" gap={3} wrap="wrap" justify="space-between">
          <Heading as="h2" size={1}>
            {title}
          </Heading>
          {action}
        </Flex>
        {children}
      </Stack>
    </Card>
  );
}

export function Quiet({ children }: { children: ReactNode }) {
  return (
    <Text size={2} muted style={{ lineHeight: 1.6 }}>
      {children}
    </Text>
  );
}

/** A small router link button, for "Open", "Edit" and "See the whole list". */
function LinkButton({
  target,
  text,
  tone,
  mode = 'ghost',
}: {
  target: StudioTarget;
  text: string;
  tone?: 'primary';
  mode?: 'ghost' | 'bleed';
}) {
  const linkTo = useStudioLink();
  const link = linkTo(target);
  return (
    <Button
      as="a"
      href={link.href}
      onClick={link.onClick}
      text={text}
      mode={mode}
      tone={tone}
      fontSize={1}
      padding={2}
    />
  );
}

// -----------------------------------------------------------------------------
// Coming up
// -----------------------------------------------------------------------------

/** Document types whose schema has a publishAt field (card 111's _publishAt.ts). */
export function useScheduledTypes(): string[] {
  const schema = useSchema();
  return useMemo(
    () =>
      schema.getTypeNames().filter((name) => {
        const t = schema.get(name) as
          { type?: { name?: string }; fields?: Array<{ name: string }> } | undefined;
        return (
          t?.type?.name === 'document' && Boolean(t.fields?.some((f) => f.name === 'publishAt'))
        );
      }),
    [schema],
  );
}

export function ComingUp({ types, children }: { types: string[]; children?: ReactNode }) {
  const client = useClient({ apiVersion: API_VERSION });
  const typeTitle = useTypeTitle();
  const [rows, setRows] = useState<ComingRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .fetch(
        `*[_type in $types && _id in path("drafts.**") && defined(publishAt)] | order(publishAt asc)[0...20]{ _id, _type, publishAt, "name": coalesce(title, name, heading, question, label, internalTitle) }`,
        { types },
      )
      .then((docs) => !cancelled && setRows(comingUp(docs ?? [], new Date()).slice(0, 6)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [client, types]);

  return (
    <Panel title="Coming up">
      {failed ? (
        <Quiet>The list could not load just now.</Quiet>
      ) : rows === null ? (
        <Spinner muted />
      ) : rows.length === 0 ? (
        <Quiet>
          Nothing is set to publish by itself. To schedule a page, open it, fill in "Publish
          automatically at" under Publishing, and leave it as a draft.
        </Quiet>
      ) : (
        <Stack gap={3}>
          <Quiet>These publish by themselves, within half an hour of the time shown.</Quiet>
          {rows.map((r) => (
            <Flex key={r.id} align="center" gap={3}>
              <Stack gap={2} flex={1}>
                <Text size={2} weight="semibold" textOverflow="ellipsis">
                  {r.name || typeTitle(r.type)}
                </Text>
                <Text size={1} muted>
                  {r.when}, {typeTitle(r.type)}
                </Text>
              </Stack>
              <LinkButton target={{ doc: r.id, type: r.type }} text="Open" />
            </Flex>
          ))}
        </Stack>
      )}
      {/* Extra rows a site's tools add, like RSVP headcounts (card 121). */}
      {children}
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// Fix-it list (the Checkup's own findings, by name)
// -----------------------------------------------------------------------------

export function FixItList({ results, failed }: { results: CheckResult[] | null; failed: boolean }) {
  const list = results ? fixItList(results, 6) : null;
  const counts = results ? countBySeverity(results) : null;
  const whole = <LinkButton target={{ tool: 'checkup' }} text="See the whole list" mode="bleed" />;

  return (
    <Panel title="Fix-it list" action={list && list.total > 0 ? whole : undefined}>
      {failed ? (
        <Quiet>The check could not run just now. Try the Checkup in a minute.</Quiet>
      ) : !list ? (
        <Spinner muted />
      ) : list.total === 0 ? (
        <Stack gap={3}>
          <Flex>
            <Badge tone="positive" fontSize={1} padding={2}>
              All clear
            </Badge>
          </Flex>
          <Quiet>Nothing needs fixing right now.</Quiet>
        </Stack>
      ) : (
        <Stack gap={3}>
          <Flex gap={2} wrap="wrap">
            {(['Needs doing', 'Worth a look'] as const).map((s) =>
              counts?.[s] ? (
                <Badge key={s} tone={SEVERITY_TONE[s]} fontSize={1} padding={2}>
                  {s}: {counts[s]}
                </Badge>
              ) : null,
            )}
          </Flex>
          {list.rows.map((r) => (
            <Flex key={r.key} align="center" gap={3}>
              <Stack gap={2} flex={1}>
                <Text size={2} weight="semibold" textOverflow="ellipsis">
                  {r.name}
                </Text>
                <Flex gap={2} align="center" wrap="wrap">
                  <Badge tone={SEVERITY_TONE[r.severity]} fontSize={0} padding={1}>
                    {r.severity}
                  </Badge>
                  <Text size={1} muted style={{ lineHeight: 1.5 }}>
                    {r.reason}
                  </Text>
                </Flex>
              </Stack>
              {r.target && <LinkButton target={r.target} text={r.targetLabel} tone="primary" />}
            </Flex>
          ))}
          {list.more > 0 && <Quiet>{`${list.more} more in the Checkup.`}</Quiet>}
        </Stack>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// Visitors (/api/studio/visitors/)
// -----------------------------------------------------------------------------

/** The route's path. */
export const VISITORS_PATH = '/api/studio/visitors/';

type VisitorsState =
  | { kind: 'loading' }
  | { kind: 'not-set-up' }
  | { kind: 'signed-out' }
  | { kind: 'failed' }
  | { kind: 'ok'; report: VisitorsReport };

function useVisitors(enabled: boolean): VisitorsState {
  const client = useClient({ apiVersion: API_VERSION });
  const [state, setState] = useState<VisitorsState>({ kind: enabled ? 'loading' : 'not-set-up' });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const token = studioToken(client);
    fetch(VISITORS_PATH, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        if (r.status === 401) return { kind: 'signed-out' } as const;
        // No route at all (a site that has not taken it yet): say not set up.
        if (r.status === 404) return { kind: 'not-set-up' } as const;
        const j = (await r.json().catch(() => null)) as Partial<
          Omit<VisitorsReport, 'configured'>
        > & { configured?: boolean; error?: string };
        if (j && j.configured === false) return { kind: 'not-set-up' } as const;
        if (!r.ok || !j || j.error || !Array.isArray(j.days)) return { kind: 'failed' } as const;
        return { kind: 'ok', report: j as VisitorsReport } as const;
      })
      .catch(() => ({ kind: 'failed' }) as const)
      .then((s) => !cancelled && setState(s));
    return () => {
      cancelled = true;
    };
  }, [client, enabled]);

  return state;
}

const dayName = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

/** Four weeks of daily visits as plain SVG bars; the last seven are full strength. */
function VisitsChart({ days }: { days: VisitorsReport['days'] }) {
  const max = Math.max(1, ...days.map((d) => d.visits));
  const W = 8;
  const GAP = 2;
  const H = 64;
  const width = days.length * (W + GAP) - GAP;
  const total = days.reduce((a, d) => a + d.visits, 0);
  return (
    <Stack gap={2}>
      <Box style={{ color: 'var(--card-fg-color)' }}>
        <svg
          viewBox={`0 0 ${width} ${H}`}
          width="100%"
          height={H}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Visits per day over the last four weeks: ${total} in all, the busiest day ${max}.`}
        >
          <line x1={0} x2={width} y1={H - 0.5} y2={H - 0.5} stroke="currentColor" opacity={0.2} />
          {days.map((d, i) => {
            const h = d.visits ? Math.max(2, Math.round((d.visits / max) * (H - 4))) : 0;
            return (
              <rect
                key={d.date}
                x={i * (W + GAP)}
                y={H - h}
                width={W}
                height={h}
                rx={1.5}
                fill="currentColor"
                opacity={i >= days.length - 7 ? 0.85 : 0.3}
              >
                <title>{`${dayName(d.date)}: ${d.visits} ${d.visits === 1 ? 'visit' : 'visits'}`}</title>
              </rect>
            );
          })}
        </svg>
      </Box>
      <Flex justify="space-between">
        <Text size={0} muted>
          4 weeks ago
        </Text>
        <Text size={0} muted>
          Today
        </Text>
      </Flex>
    </Stack>
  );
}

export function Visitors({ enabled, helperName }: { enabled: boolean; helperName: string }) {
  const state = useVisitors(enabled);
  return (
    <Panel title="Visitors">
      {state.kind === 'loading' ? (
        <Spinner muted />
      ) : state.kind === 'not-set-up' ? (
        <Quiet>
          {`Not set up yet. Once ${helperName} switches it on, this shows how many people visited the website this week, which pages they read most and how they found it.`}
        </Quiet>
      ) : state.kind === 'signed-out' ? (
        <Quiet>Sign out and back in to the Studio to see visitor numbers.</Quiet>
      ) : state.kind === 'failed' ? (
        <Quiet>The visitor numbers could not load just now. Try again later.</Quiet>
      ) : (
        <VisitorsBody report={state.report} />
      )}
    </Panel>
  );
}

function VisitorsBody({ report }: { report: VisitorsReport }) {
  return (
    <Stack gap={4}>
      <Stack gap={3}>
        <Flex align="baseline" gap={2} wrap="wrap">
          <Text size={4} weight="semibold">
            {report.thisWeek}
          </Text>
          <Text size={2} muted>
            {report.thisWeek === 1 ? 'visit' : 'visits'} in the last 7 days
          </Text>
        </Flex>
        <Text size={1} muted>
          {weekCompare(report.thisWeek, report.lastWeek)}
        </Text>
      </Stack>
      <VisitsChart days={report.days} />
      <Grid gridTemplateColumns={[1, 2]} gap={4}>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            Most read this week
          </Text>
          {report.pages.length === 0 ? (
            <Text size={1} muted>
              No page views yet.
            </Text>
          ) : (
            report.pages.map((p) => (
              <Flex key={p.path} gap={2} justify="space-between">
                <Text size={1} textOverflow="ellipsis">
                  {p.path === '/' ? 'Home page' : p.path}
                </Text>
                <Text size={1} muted>
                  {p.views}
                </Text>
              </Flex>
            ))
          )}
        </Stack>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            How people found the website
          </Text>
          {report.sources.length === 0 ? (
            <Text size={1} muted>
              Nothing to show yet.
            </Text>
          ) : (
            report.sources.map((s) => (
              <Flex key={s.group} gap={2} justify="space-between">
                <Text size={1}>{s.label}</Text>
                <Text size={1} muted>
                  {s.visits}
                </Text>
              </Flex>
            ))
          )}
        </Stack>
      </Grid>
      <Text size={0} muted>
        Counted by Cloudflare without cookies. Numbers are close estimates and update every few
        minutes.
      </Text>
    </Stack>
  );
}

// -----------------------------------------------------------------------------
// Your pages
// -----------------------------------------------------------------------------

interface MapRow {
  _id: string;
  _type: string;
  name?: string | null;
}

export function PagesMap({ groups }: { groups: PageMapGroup[] }) {
  const client = useClient({ apiVersion: API_VERSION });
  const linkTo = useStudioLink();
  const listTypes = useMemo(
    () => [...new Set(groups.map((g) => g.listType).filter((t): t is string => Boolean(t)))],
    [groups],
  );
  const [docs, setDocs] = useState<MapRow[] | null>(listTypes.length ? null : []);

  useEffect(() => {
    if (!listTypes.length) return;
    let cancelled = false;
    client
      .fetch<MapRow[]>(
        `*[_type in $types && !(_id in path("versions.**"))]{ _id, _type, "name": coalesce(title, name, heading, internalTitle) }`,
        { types: listTypes },
      )
      .then((r) => !cancelled && setDocs(r ?? []))
      // Fail soft: the configured links still show.
      .catch(() => !cancelled && setDocs([]));
    return () => {
      cancelled = true;
    };
  }, [client, listTypes]);

  const icons = useMemo(() => {
    const m = new Map<string, ComponentType | undefined>();
    for (const g of groups) for (const l of g.links ?? []) m.set(`${g.title}|${l.title}`, l.icon);
    return m;
  }, [groups]);
  const details = useMemo(() => {
    const m = new Map<string, string | undefined>();
    for (const g of groups) {
      m.set(g.title, g.detail);
      for (const l of g.links ?? []) m.set(`${g.title}|${l.title}`, l.detail);
    }
    return m;
  }, [groups]);

  const resolved = docs ? resolvePageMap(groups, docs) : null;
  return (
    <Panel title="Your pages">
      {!resolved ? (
        <Spinner muted />
      ) : (
        <Grid gridTemplateColumns={[1, 2, Math.min(resolved.length, 3)]} gap={4}>
          {resolved.map((g) => (
            <Stack key={g.title} gap={2}>
              <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase' }}>
                {g.title}
              </Text>
              {details.get(g.title) && (
                <Text size={1} muted style={{ lineHeight: 1.5 }}>
                  {details.get(g.title)}
                </Text>
              )}
              <Stack gap={1} paddingTop={1}>
                {g.links.map((l) => {
                  const link = linkTo(l.target);
                  const Icon = icons.get(`${g.title}|${l.title}`);
                  const detail = details.get(`${g.title}|${l.title}`);
                  const draftOnly = 'draftOnly' in l && l.draftOnly;
                  const key = 'doc' in l.target ? publishedIdOf(l.target.doc) + l.title : l.title;
                  return (
                    <Card
                      key={key}
                      as="a"
                      href={link.href}
                      onClick={link.onClick}
                      padding={2}
                      radius={2}
                    >
                      <Flex align="center" gap={2}>
                        {Icon && (
                          <Text size={1} muted>
                            <Icon />
                          </Text>
                        )}
                        <Stack gap={2} flex={1}>
                          <Text size={2} textOverflow="ellipsis">
                            {l.title}
                          </Text>
                          {detail && (
                            <Text size={1} muted textOverflow="ellipsis">
                              {detail}
                            </Text>
                          )}
                        </Stack>
                        {draftOnly && (
                          <Badge tone="caution" fontSize={0} padding={2}>
                            Not published
                          </Badge>
                        )}
                      </Flex>
                    </Card>
                  );
                })}
              </Stack>
            </Stack>
          ))}
        </Grid>
      )}
    </Panel>
  );
}

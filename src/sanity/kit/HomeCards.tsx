// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Home's dashboard cards, round four (Studio kit, PORTS.md card 115; card 132's look)
// =============================================================================
// The cards that bring Home up to the WordPress staff dashboard on the family's
// WordPress sites. HomeTool.tsx lays them out; each fails soft (a quiet
// sentence, never a blank) like the rest of Home. What they decide is pure and
// tested in src/lib/studio-home.ts and src/lib/studio-analytics.ts.
//
//   Quick tiles  Home's ways in (Edit the website, Quick update, How do I...?)
//                and kitConfig.quickActions as job tiles: the colour edge, the
//                art on a stone, a display-font title and one line.
//   Coming up    drafts with a "Publish automatically at" time (card 111's
//                scheduled publishing), soonest first: each a row with its
//                date on a stone (DateBlock), the time in plain words.
//   Recent edits / Pick up where you left off: rows with the document type's
//                art (typeMeaning) and "Not published" as a stone tag. The
//                fetching and the publish and discard operations stay in
//                HomeTool.tsx; the rows are drawn here.
//   Fix-it list  the Checkup's findings by name, each with Edit; the rules are
//                the Checkup's own (useCheckup), never repeated here.
//   Visitors     /api/studio/visitors/ (Cloudflare Web Analytics, or Google
//                Analytics 4 since card 136, through the Worker): the week as a
//                display-font figure against the week before, then the last
//                seven days, the most-read pages and where people came from as
//                bars in the mark colours, each with its number beside it.
//   Found on Google  /api/studio/search/ (Search Console, card 136), drawn
//                right under Visitors and hidden until it is set up: clicks
//                and appearances over four weeks against the four before, the
//                average place, the searches and the pages.
//   Your pages   kitConfig.pages: every page the editor can change, grouped.
//
// Card 132: the presentational pieces (QuickTiles, ComingUpRows, RecentRows,
// DraftRowView, VisitorsBody, SearchBody) take their data and links by props, so the kit
// harness (harness/Surfaces.tsx, part=home) draws them with made-up data.
// =============================================================================

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useClient, useSchema } from 'sanity';
import { Card, Flex, Grid, Stack, Text } from '@sanity/ui';
import { countBySeverity, publishedIdOf, type CheckResult } from '../../lib/studio-checkup';
import { comingUp, fixItList, resolvePageMap, type ComingRow } from '../../lib/studio-home';
import { aiCompare, weekCompare, type VisitorsReport } from '../../lib/studio-analytics';
import {
  periodCompare,
  positionWords,
  windowWords,
  type SearchReport,
} from '../../lib/studio-google';
import { timeAgo, type StudioTarget } from '../../lib/studio-kit';
import { typeIconKey, type BrandIconKey } from '../../lib/studio-icons';
import { ICON_MAPS } from '../brandIcons';
import { API_VERSION, studioToken, useStudioLink, useTypeTitle } from './shared';
import {
  AllClear,
  ArtRow,
  ArtRows,
  DateBlock,
  Figure,
  KitAction,
  KitBox,
  KitLoading,
  KitScope,
  levelOf,
  MarkBars,
  ResultCard,
  SeverityStone,
  StoneTag,
  TileCard,
  type Tone,
} from './ui';
import type { PageMapGroup } from './types';

// -----------------------------------------------------------------------------
// The card frame, shared with HomeTool.tsx
// -----------------------------------------------------------------------------

export function Panel({
  title,
  children,
  action,
  meaning,
  edge,
  tone,
  tour,
}: {
  title: string;
  children: ReactNode;
  /** A small link beside the title ("See the whole list"). */
  action?: ReactNode;
  /** Card 131: the site's art beside the title instead of the marker. */
  meaning?: BrandIconKey;
  /** Card 131: the site's colour edge along the top. */
  edge?: boolean;
  /** Card 131: a gentle callout ground (note) instead of the white card. */
  tone?: Tone;
  /** Card 137: the data-tour hook a spotlight tour anchors to ("home-this-week"). */
  tour?: string;
}) {
  // Card 131: the kit's own card (ui/surfaces.tsx KitBox) in the site's devices.
  return (
    <KitScope>
      <div data-tour={tour}>
        <KitBox title={title} action={action} meaning={meaning} edge={edge} tone={tone}>
          {children}
        </KitBox>
      </div>
    </KitScope>
  );
}

export function Quiet({ children }: { children: ReactNode }) {
  return (
    <Text size={2} muted style={{ lineHeight: 1.6 }}>
      {children}
    </Text>
  );
}

/** A link as useStudioLink() makes it; the harness passes a dead one. */
export interface HomeLink {
  href: string;
  onClick?: (e: { preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean }) => void;
}
export type HomeLinkTo = (target: StudioTarget) => HomeLink;

/** A small router link, for "Open", "Edit" and "See the whole list" (card 131: the kit's pill). */
function LinkButton({
  target,
  text,
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
    <KitAction href={link.href} onClick={link.onClick} quiet={mode === 'bleed'}>
      {text}
    </KitAction>
  );
}

/** The meaning a document type is drawn with: the site's own art for it. */
export const typeMeaning = (type: string): BrandIconKey => typeIconKey(type, ICON_MAPS);

// -----------------------------------------------------------------------------
// Quick tiles (card 132): Home's ways in and quick actions as job tiles
// -----------------------------------------------------------------------------

export interface QuickTile {
  key: string;
  title: string;
  lead?: string;
  meaning?: BrandIconKey;
  icon?: ComponentType;
  link: HomeLink;
  /** Kept for tests and hooks that find a tile by its job. */
  dataQuick?: string;
}

const TILE_GRID: CSSProperties = {
  display: 'grid',
  gap: 14,
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
};

/** The tiles under the banner, in a grid that fits as many across as the width allows. */
export function QuickTiles({ tiles, label }: { tiles: QuickTile[]; label?: string }) {
  if (!tiles.length) return null;
  return (
    <KitScope>
      <nav aria-label={label ?? 'Ways in'} style={TILE_GRID}>
        {tiles.map((tile) => (
          <TileCard
            key={tile.key}
            title={tile.title}
            lead={tile.lead}
            meaning={tile.meaning}
            icon={tile.icon}
            href={tile.link.href}
            onClick={tile.link.onClick}
            dataQuick={tile.dataQuick}
          />
        ))}
      </nav>
    </KitScope>
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

/** The whole date, for a screen reader when the words say "Tomorrow at 9:00 AM". */
export const fullDate = (iso: string) => {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
};

/** Coming up's rows: the date on a stone, the name, then when (in words) and what. */
export function ComingUpRows({
  rows,
  typeTitle,
  linkTo,
}: {
  rows: ComingRow[];
  typeTitle: (type: string) => string;
  linkTo: HomeLinkTo;
}) {
  return (
    <ArtRows label="Publishing by itself">
      {rows.map((r, i) => {
        const link = linkTo({ doc: r.id, type: r.type });
        const whole = fullDate(r.publishAt);
        return (
          <ArtRow
            key={r.id}
            lead={<DateBlock date={r.publishAt} index={i} />}
            title={r.name || typeTitle(r.type)}
            meta={
              <>
                {r.when}
                {whole && <span className="ui-sr">{` (${whole})`}</span>}
                {`, ${typeTitle(r.type)}`}
              </>
            }
            href={link.href}
            onClick={link.onClick}
          />
        );
      })}
    </ArtRows>
  );
}

export function ComingUp({ types, children }: { types: string[]; children?: ReactNode }) {
  const client = useClient({ apiVersion: API_VERSION });
  const typeTitle = useTypeTitle();
  const linkTo = useStudioLink();
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
    <Panel title="Coming up" meaning="event" tour="home-coming-up">
      {failed ? (
        <Quiet>The list could not load just now.</Quiet>
      ) : rows === null ? (
        <KitLoading />
      ) : rows.length === 0 ? (
        <Quiet>
          Nothing is set to publish by itself. To schedule a page, open it, fill in "Publish
          automatically at" under Publishing, and leave it as a draft.
        </Quiet>
      ) : (
        <Stack gap={3}>
          <Quiet>These publish by themselves, within half an hour of the time shown.</Quiet>
          <ComingUpRows rows={rows} typeTitle={typeTitle} linkTo={linkTo} />
        </Stack>
      )}
      {/* Extra rows a site's tools add, like RSVP headcounts (card 127). */}
      {children}
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// Recent edits and Pick up where you left off: the rows (card 132)
// -----------------------------------------------------------------------------

export interface RecentRow {
  _id: string;
  _type: string;
  _updatedAt: string;
  name?: string;
}

/** Recent edits' rows: the type's art, the name, what and when, "Not published" on a draft. */
export function RecentRows({
  rows,
  typeTitle,
  linkTo,
  now,
}: {
  rows: RecentRow[];
  typeTitle: (type: string) => string;
  linkTo: HomeLinkTo;
  now: number;
}) {
  return (
    <ArtRows label="Recent edits">
      {rows.map((r, i) => {
        const link = linkTo({ doc: publishedIdOf(r._id), type: r._type });
        return (
          <ArtRow
            key={r._id}
            meaning={typeMeaning(r._type)}
            seed={i + 3}
            title={r.name || typeTitle(r._type)}
            meta={`${typeTitle(r._type)}, ${timeAgo(r._updatedAt, now)}`}
            tag={
              r._id.startsWith('drafts.') ? (
                <StoneTag tone="tip">Not published</StoneTag>
              ) : undefined
            }
            href={link.href}
            onClick={link.onClick}
          />
        );
      })}
    </ArtRows>
  );
}

/**
 * One unpublished draft on "Pick up where you left off": the row opens it;
 * Publish and Discard changes sit beside it when they are safe to offer here.
 */
export function DraftRowView({
  type,
  name,
  meta,
  why,
  link,
  seed,
  canPublish,
  canDiscard,
  busy,
  onPublish,
  onDiscard,
}: {
  type: string;
  name: string;
  meta: string;
  /** Why Publish is not offered here, when it is not. */
  why?: string | null;
  link: HomeLink;
  seed?: number;
  canPublish: boolean;
  canDiscard: boolean;
  busy: boolean;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  return (
    <ArtRow
      meaning={typeMeaning(type)}
      seed={seed}
      title={name}
      meta={why ? `${meta}. ${why}` : meta}
      tag={<StoneTag tone="tip">Not published</StoneTag>}
      href={link.href}
      onClick={link.onClick}
      action={
        canPublish || canDiscard ? (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {canPublish && (
              <KitAction strong disabled={busy} onClick={onPublish}>
                Publish
              </KitAction>
            )}
            {canDiscard && (
              <KitAction quiet disabled={busy} onClick={onDiscard}>
                Discard changes
              </KitAction>
            )}
          </span>
        ) : undefined
      }
    />
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
    <Panel
      tour="home-fix-it"
      title="Fix-it list"
      meaning="checkup"
      action={list && list.total > 0 ? whole : undefined}
    >
      {failed ? (
        <Quiet>The check could not run just now. Try the Checkup in a minute.</Quiet>
      ) : !list ? (
        <KitLoading />
      ) : list.total === 0 ? (
        <AllClear compact title="All clear" lead="Nothing needs fixing right now." />
      ) : (
        <Stack gap={3}>
          <Flex gap={4} wrap="wrap">
            {(['Needs doing', 'Worth a look'] as const).map((s) =>
              counts?.[s] ? (
                <SeverityStone key={s} level={levelOf(s)}>
                  {`${s}: ${counts[s]}`}
                </SeverityStone>
              ) : null,
            )}
          </Flex>
          {list.rows.map((r) => (
            <ResultCard
              key={r.key}
              dense
              showLevel
              level={levelOf(r.severity)}
              title={r.name}
              detail={r.reason}
              action={
                r.target ? (
                  <LinkButton target={r.target} text={r.targetLabel} tone="primary" />
                ) : undefined
              }
            />
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
  /** Card 136: Google refused the key or the property, a set-up job for the helper. */
  | { kind: 'connect' }
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
        > & { configured?: boolean; error?: string; connect?: boolean };
        if (j && j.configured === false) return { kind: 'not-set-up' } as const;
        if (j && j.connect === true) return { kind: 'connect' } as const;
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

/** "Mon 12" for a UTC chart day. */
const shortDay = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  return `${d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}`;
};

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** Card 136: what a card says when Google refuses the key. Calm, no detail. */
export function ConnectGoogle({ helperName }: { helperName: string }) {
  return (
    <Quiet>{`Ask ${helperName} to finish connecting Google. Nothing is wrong with the website itself.`}</Quiet>
  );
}

export function Visitors({ enabled, helperName }: { enabled: boolean; helperName: string }) {
  const state = useVisitors(enabled);
  return (
    <>
      <Panel title="Visitors" meaning="people" tour="home-visitors">
        {state.kind === 'loading' ? (
          <KitLoading />
        ) : state.kind === 'not-set-up' ? (
          <Quiet>
            {`Not set up yet. Once ${helperName} switches it on, this shows how many people visited the website this week, which pages they read most and how they found it.`}
          </Quiet>
        ) : state.kind === 'signed-out' ? (
          <Quiet>Sign out and back in to the Studio to see visitor numbers.</Quiet>
        ) : state.kind === 'failed' ? (
          <Quiet>The visitor numbers could not load just now. Try again later.</Quiet>
        ) : state.kind === 'connect' ? (
          <ConnectGoogle helperName={helperName} />
        ) : (
          <VisitorsBody report={state.report} />
        )}
      </Panel>
      {/* Card 136: the Search Console card sits right under Visitors, hidden until set up. */}
      <SearchConsole enabled={enabled} helperName={helperName} />
    </>
  );
}

/** A small heading over a column of bars. */
function BarsHead({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 650, color: 'var(--ui-ink)' }}>{children}</h3>
  );
}

/** The figure, the last seven days, the most-read pages and where people came from. */
export function VisitorsBody({ report }: { report: VisitorsReport }) {
  const week = report.days.slice(-7);
  const ai = aiCompare(report.ai);
  return (
    <Stack gap={5}>
      <Grid gridTemplateColumns={[1, 1, 2]} gap={5} style={{ alignItems: 'start' }}>
        <Figure
          value={report.thisWeek.toLocaleString('en-US')}
          label={`${report.thisWeek === 1 ? 'visit' : 'visits'} in the last 7 days`}
          sub={weekCompare(report.thisWeek, report.lastWeek)}
        />
        {week.length > 0 && (
          <Stack gap={3}>
            <BarsHead>Day by day</BarsHead>
            <MarkBars
              label="Visits each day, the last seven days"
              rows={week.map((d) => ({
                label: shortDay(d.date),
                value: d.visits,
                text: plural(d.visits, 'visit', 'visits'),
              }))}
            />
          </Stack>
        )}
      </Grid>
      <Grid gridTemplateColumns={[1, 1, 2]} gap={5} style={{ alignItems: 'start' }}>
        <Stack gap={3}>
          <BarsHead>Most read this week</BarsHead>
          {report.pages.length === 0 ? (
            <Quiet>No page views yet.</Quiet>
          ) : (
            <MarkBars
              label="Page views this week, by page"
              rows={report.pages.map((p) => ({
                label: p.path === '/' ? 'Home page' : p.path,
                value: p.views,
                text: plural(p.views, 'view', 'views'),
              }))}
            />
          )}
        </Stack>
        <Stack gap={3}>
          <BarsHead>How people found the website</BarsHead>
          {report.sources.length === 0 ? (
            <Quiet>Nothing to show yet.</Quiet>
          ) : (
            <MarkBars
              label="Visits this week, by where they came from"
              rows={report.sources.map((s) => ({
                label: s.label,
                value: s.visits,
                text: plural(s.visits, 'visit', 'visits'),
              }))}
            />
          )}
          {/* Card 123: the AI assistants trend, when there is one to tell. */}
          {ai && <Quiet>{ai}</Quiet>}
        </Stack>
      </Grid>
      <p className="ui-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        {report.provider === 'ga4'
          ? 'From Google Analytics, updated a few hours ago. A visit is one sitting on the website, however many pages it takes in.'
          : 'Counted by Cloudflare without cookies. Numbers are close estimates and update every few minutes.'}
      </p>
    </Stack>
  );
}

// -----------------------------------------------------------------------------
// Found on Google (/api/studio/search/, card 136)
// -----------------------------------------------------------------------------

/** The route's path. */
export const SEARCH_PATH = '/api/studio/search/';

type SearchState =
  | { kind: 'hidden' }
  | { kind: 'failed' }
  | { kind: 'connect' }
  | { kind: 'ok'; report: SearchReport };

function useSearch(enabled: boolean): SearchState {
  const client = useClient({ apiVersion: API_VERSION });
  // Starts hidden, not loading: a site without Search Console never sees the card flash in.
  const [state, setState] = useState<SearchState>({ kind: 'hidden' });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const token = studioToken(client);
    fetch(SEARCH_PATH, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        // Signed out, no route, or not set up: stay hidden (Visitors already says sign in).
        if (r.status === 401 || r.status === 403 || r.status === 404) {
          return { kind: 'hidden' } as const;
        }
        const j = (await r.json().catch(() => null)) as
          | (Partial<Omit<SearchReport, 'configured'>> & {
              configured?: boolean;
              error?: string;
              connect?: boolean;
            })
          | null;
        if (j && j.configured === false) return { kind: 'hidden' } as const;
        if (j && j.connect === true) return { kind: 'connect' } as const;
        if (!r.ok || !j || j.error || !Array.isArray(j.queries)) return { kind: 'failed' } as const;
        return { kind: 'ok', report: j as SearchReport } as const;
      })
      .catch(() => ({ kind: 'failed' }) as const)
      .then((s) => !cancelled && setState(s));
    return () => {
      cancelled = true;
    };
  }, [client, enabled]);

  return state;
}

export function SearchConsole({ enabled, helperName }: { enabled: boolean; helperName: string }) {
  const state = useSearch(enabled);
  if (state.kind === 'hidden') return null;
  return (
    <Panel title="Found on Google" meaning="search">
      {state.kind === 'failed' ? (
        <Quiet>The search numbers could not load just now. Try again later.</Quiet>
      ) : state.kind === 'connect' ? (
        <ConnectGoogle helperName={helperName} />
      ) : (
        <SearchBody report={state.report} />
      )}
    </Panel>
  );
}

/** Clicks and appearances against the four weeks before, the average place, the searches and the pages. */
export function SearchBody({ report }: { report: SearchReport }) {
  return (
    <Stack gap={5}>
      <Grid gridTemplateColumns={[1, 1, 3]} gap={5} style={{ alignItems: 'start' }}>
        <Figure
          value={report.clicks.toLocaleString('en-US')}
          label="Clicks from Google"
          sub={periodCompare(report.clicks, report.clicksBefore, 'click', 'clicks')}
        />
        <Figure
          value={report.impressions.toLocaleString('en-US')}
          label="Times you appeared"
          sub={periodCompare(report.impressions, report.impressionsBefore, 'time', 'times')}
        />
        <Figure
          value={report.position === null ? 'None yet' : report.position.toLocaleString('en-US')}
          label="Average place in the results"
          sub={positionWords(report.position, report.positionBefore)}
        />
      </Grid>
      <Grid gridTemplateColumns={[1, 1, 2]} gap={5} style={{ alignItems: 'start' }}>
        <Stack gap={3}>
          <BarsHead>Searches that found you</BarsHead>
          {report.queries.length === 0 ? (
            <Quiet>No searches to show yet.</Quiet>
          ) : (
            <MarkBars
              label="Clicks from Google over four weeks, by what people searched for"
              rows={report.queries.map((q) => ({
                label: q.query,
                value: q.clicks,
                text: plural(q.clicks, 'click', 'clicks'),
              }))}
            />
          )}
        </Stack>
        <Stack gap={3}>
          <BarsHead>Pages people opened from Google</BarsHead>
          {report.pages.length === 0 ? (
            <Quiet>No pages to show yet.</Quiet>
          ) : (
            <MarkBars
              label="Clicks from Google over four weeks, by page"
              rows={report.pages.map((p) => ({
                label: p.path === '/' ? 'Home page' : p.path,
                value: p.clicks,
                text: plural(p.clicks, 'click', 'clicks'),
              }))}
            />
          )}
        </Stack>
      </Grid>
      <p className="ui-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        {`From Google Search Console, ${windowWords(report.from, report.to)}, against the four weeks before. Google's search figures run about three days behind, so the newest days are not in yet.`}
      </p>
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
        `*[_type in $types && !(_id in path("versions.**"))]{ _id, _type, "name": coalesce(title, name, heading, internalTitle) + select(hideFromSearch == true => " (hidden)", "") }`,
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
    <Panel title="Your pages" meaning="content" tour="home-pages">
      {!resolved ? (
        <KitLoading />
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
                        {draftOnly && <StoneTag tone="tip">Not published</StoneTag>}
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

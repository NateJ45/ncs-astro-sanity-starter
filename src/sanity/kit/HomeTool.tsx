// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Home: the Studio's landing page (Studio kit, 2026-10-17)
// =============================================================================
// The Sanity version of the WordPress staff Home on the family's WordPress sites.
// It is the first tool in the top bar, so the Studio opens here. Cards, in the
// order an editor needs them:
//
//   1. Welcome, by first name, with the one reassurance that matters most.
//   2. This week: the site's recurring jobs (kit.config.ts), each ticked off by
//      a GROQ check, so a done job shows done without anyone ticking it.
//   3. Is it live? The build time from /build-info.json against the newest
//      published change (liveStatus in src/lib/studio-kit.ts).
//   4. Site health: the Checkup's counts, with a link to the Checkup.
//   5. Recent edits: the last few things changed, unpublished ones flagged.
//   6. Visitors: a calm "not set up yet" until the analytics route exists.
//   7. Ask for help, the tour again, and the staff view switch.
//
// Every card fails soft: a failed fetch shows a quiet sentence, never a blank.
// =============================================================================

import { useEffect, useState, type ReactNode } from 'react';
import { useClient, useCurrentUser } from 'sanity';
import { HomeIcon } from '@sanity/icons/Home';
import { Badge, Box, Button, Card, Flex, Grid, Heading, Spinner, Stack, Text } from '@sanity/ui';
import {
  firstName,
  isDone,
  liveStatus,
  timeAgo,
  weekStart,
  type LiveState,
} from '../../lib/studio-kit';
import { countBySeverity, isAllClear, publishedIdOf } from '../../lib/studio-checkup';
import {
  API_VERSION,
  TOUR_OPEN_EVENT,
  ToolHeading,
  useCheckup,
  useStaffView,
  useStudioLink,
  useTypeTitle,
} from './shared';
import { SEVERITY_TONE } from './CheckupTool';
import type { KitConfig, ThisWeekTask } from './types';

const NOT_SYSTEM = `!(_type match "sanity.*") && !(_type match "system.*") && !(_type match "media.*") && !(_id in path("versions.**")) && !(_id match "_.**")`;

function CardTitle({ children }: { children: string }) {
  return (
    <Heading as="h2" size={1}>
      {children}
    </Heading>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card padding={4} radius={3} border>
      <Stack gap={4}>
        <CardTitle>{title}</CardTitle>
        {children}
      </Stack>
    </Card>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return (
    <Text size={2} muted style={{ lineHeight: 1.6 }}>
      {children}
    </Text>
  );
}

// -----------------------------------------------------------------------------

function ThisWeek({ tasks, firstDay }: { tasks: ThisWeekTask[]; firstDay: 0 | 1 }) {
  const client = useClient({ apiVersion: API_VERSION });
  const linkTo = useStudioLink();
  const [done, setDone] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = { weekStart: weekStart(new Date(), firstDay), now: new Date().toISOString() };
    Promise.all(
      tasks.map((t) =>
        client
          .fetch(t.query, params)
          .then((answer) => [t.id, isDone(answer)] as const)
          .catch(() => [t.id, false] as const),
      ),
    ).then((pairs) => {
      if (!cancelled) setDone(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [client, tasks, firstDay]);

  return (
    <Panel title="This week">
      {done === null ? (
        <Spinner muted />
      ) : (
        <Stack gap={4}>
          {tasks.map((t) => {
            const ok = done[t.id];
            const link = linkTo(t.target);
            return (
              <Flex key={t.id} gap={3} align="flex-start">
                <Box style={{ flexShrink: 0, paddingTop: 2 }}>
                  <Badge tone={ok ? 'positive' : 'default'} fontSize={1} padding={2}>
                    {ok ? 'Done' : 'To do'}
                  </Badge>
                </Box>
                <Stack gap={2} flex={1}>
                  <Text size={2} weight="semibold">
                    {t.title}
                  </Text>
                  <Text size={1} muted style={{ lineHeight: 1.5 }}>
                    {t.detail}
                  </Text>
                </Stack>
                {!ok && (
                  <Button
                    as="a"
                    href={link.href}
                    onClick={link.onClick}
                    text={t.targetLabel ?? 'Do it'}
                    mode="ghost"
                    tone="primary"
                    fontSize={1}
                    padding={2}
                  />
                )}
              </Flex>
            );
          })}
        </Stack>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------

const LIVE_TONE: Record<LiveState, 'positive' | 'primary' | 'caution' | 'default'> = {
  live: 'positive',
  'on-its-way': 'primary',
  slow: 'caution',
  unknown: 'default',
};
const LIVE_BADGE: Record<LiveState, string> = {
  live: 'Up to date',
  'on-its-way': 'Updating',
  slow: 'Taking a while',
  unknown: 'Not sure',
};

function IsItLive({ slowAfter }: { slowAfter: number }) {
  const client = useClient({ apiVersion: API_VERSION });
  const [state, setState] = useState<{ builtAt: string | null; lastPublish: string | null } | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const builtAt = await fetch('/build-info.json', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { builtAt?: string } | null) => j?.builtAt ?? null)
        .catch(() => null);
      const lastPublish = await client
        .fetch<string | null>(
          `*[${NOT_SYSTEM} && !(_id in path("drafts.**"))] | order(_updatedAt desc)[0]._updatedAt`,
        )
        .catch(() => null);
      if (!cancelled) {
        setState({ builtAt, lastPublish });
        setNow(Date.now());
      }
    };
    void load();
    // Check again every minute while Home is open, so "Updating" turns into
    // "Up to date" without a reload.
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [client]);

  const status = state ? liveStatus(state.builtAt, state.lastPublish, now, slowAfter) : null;
  return (
    <Panel title="Is it live?">
      {!status || !state ? (
        <Spinner muted />
      ) : (
        <Stack gap={3}>
          <Flex>
            <Badge tone={LIVE_TONE[status.state]} fontSize={1} padding={2}>
              {LIVE_BADGE[status.state]}
            </Badge>
          </Flex>
          <Text size={2} style={{ lineHeight: 1.6 }}>
            {status.message}
          </Text>
          {state.builtAt && <Quiet>Website last updated {timeAgo(state.builtAt, now)}.</Quiet>}
        </Stack>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------

function SiteHealth({ config }: { config: KitConfig }) {
  const { results, failed } = useCheckup(config);
  const linkTo = useStudioLink();
  const link = linkTo({ tool: 'checkup' });
  const counts = results ? countBySeverity(results) : null;
  return (
    <Panel title="Site health">
      {failed ? (
        <Quiet>The check could not run just now. Try the Checkup in a minute.</Quiet>
      ) : !results || !counts ? (
        <Spinner muted />
      ) : (
        <Stack gap={4}>
          {isAllClear(results) ? (
            <Text size={2}>All clear. Nothing needs fixing right now.</Text>
          ) : (
            <Flex gap={2} wrap="wrap">
              {(['Needs doing', 'Worth a look'] as const).map((s) =>
                counts[s] ? (
                  <Badge key={s} tone={SEVERITY_TONE[s]} fontSize={1} padding={2}>
                    {s}: {counts[s]}
                  </Badge>
                ) : null,
              )}
            </Flex>
          )}
          <Flex>
            <Button
              as="a"
              href={link.href}
              onClick={link.onClick}
              text="Open the Checkup"
              mode="ghost"
              fontSize={1}
              padding={2}
            />
          </Flex>
        </Stack>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------

interface Row {
  _id: string;
  _type: string;
  _updatedAt: string;
  name?: string;
}

function RecentEdits({ ignoreTypes }: { ignoreTypes: string[] }) {
  const client = useClient({ apiVersion: API_VERSION });
  const typeTitle = useTypeTitle();
  const linkTo = useStudioLink();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .fetch<Row[]>(
        `*[${NOT_SYSTEM} && !(_type in $ignore)] | order(_updatedAt desc)[0...24]{ _id, _type, _updatedAt, "name": coalesce(title, name, heading, question, label, internalTitle) }`,
        { ignore: ignoreTypes },
      )
      .then((r) => {
        if (cancelled) return;
        // One row per document: its newest copy (a draft beats an older publish).
        const seen = new Set<string>();
        setRows(
          (r ?? [])
            .filter((d) => {
              const id = publishedIdOf(d._id);
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            })
            .slice(0, 8),
        );
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [client, ignoreTypes]);

  const now = Date.now();
  return (
    <Panel title="Recent edits">
      {failed ? (
        <Quiet>The list could not load just now.</Quiet>
      ) : rows === null ? (
        <Spinner muted />
      ) : rows.length === 0 ? (
        <Quiet>Nothing has been edited yet.</Quiet>
      ) : (
        <Stack gap={1}>
          {rows.map((r) => {
            const link = linkTo({ doc: publishedIdOf(r._id), type: r._type });
            const draft = r._id.startsWith('drafts.');
            return (
              <Card
                key={r._id}
                as="a"
                href={link.href}
                onClick={link.onClick}
                padding={2}
                radius={2}
              >
                <Flex align="center" gap={3}>
                  <Stack gap={2} flex={1}>
                    <Text size={2} textOverflow="ellipsis">
                      {r.name || typeTitle(r._type)}
                    </Text>
                    <Text size={1} muted>
                      {typeTitle(r._type)}, {timeAgo(r._updatedAt, now)}
                    </Text>
                  </Stack>
                  {draft && (
                    <Badge tone="caution" fontSize={0} padding={2}>
                      Not published
                    </Badge>
                  )}
                </Flex>
              </Card>
            );
          })}
        </Stack>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------

export function makeHomeTool(config: KitConfig) {
  return function HomeTool() {
    const user = useCurrentUser();
    const { staffView, switchTo, reset, overridden } = useStaffView(config);
    const ignore = config.checkup.ignoreTypes;
    const linkTo = useStudioLink();
    const guide = linkTo({ tool: 'site-guide' });
    const content = linkTo({ tool: 'structure' });

    const ask = config.helper.email
      ? `mailto:${config.helper.email}?subject=${encodeURIComponent(`Help with ${config.siteName}`)}&body=${encodeURIComponent(
          `What I was trying to do:\n\nWhat happened:\n\n(Sent from the website editor, ${typeof window === 'undefined' ? '' : window.location.href})`,
        )}`
      : null;

    return (
      <Box padding={[4, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
        <Stack gap={5} style={{ maxWidth: 1040, margin: '0 auto' }}>
          <ToolHeading
            icon={HomeIcon}
            lead={`This is where you look after ${config.siteName}. Nothing you change here is public until you press Publish, so it is safe to look around.`}
          >
            {`Welcome, ${firstName(user?.name)}`}
          </ToolHeading>

          <Flex gap={2} wrap="wrap">
            <Button
              as="a"
              href={content.href}
              onClick={content.onClick}
              text="Edit the website"
              tone="primary"
              fontSize={2}
              padding={3}
            />
            {config.features.guide && (
              <Button
                as="a"
                href={guide.href}
                onClick={guide.onClick}
                text="How do I...?"
                mode="ghost"
                fontSize={2}
                padding={3}
              />
            )}
          </Flex>

          <Grid gridTemplateColumns={[1, 1, 2]} gap={4} style={{ alignItems: 'start' }}>
            {config.thisWeek.length > 0 && (
              <ThisWeek tasks={config.thisWeek} firstDay={config.weekStartsOn} />
            )}
            <IsItLive slowAfter={config.liveSlowAfterMinutes} />
            {config.features.checkup && <SiteHealth config={config} />}
            <RecentEdits ignoreTypes={ignore} />
            <Panel title="Visitors">
              {config.features.visitors ? (
                <Quiet>Loading visitor numbers...</Quiet>
              ) : (
                <Quiet>
                  Not set up yet. Once it is, this shows how many people visited the website this
                  week and which pages they read most.
                </Quiet>
              )}
            </Panel>
            <Panel title={`Ask ${config.helper.name}`}>
              <Quiet>
                Stuck, or something looks wrong? Say what you were trying to do and what happened.
                Nothing is ever lost by asking.
              </Quiet>
              {ask && (
                <Flex>
                  <Button
                    as="a"
                    href={ask}
                    text={`Email ${config.helper.name}`}
                    mode="ghost"
                    fontSize={1}
                    padding={2}
                  />
                </Flex>
              )}
            </Panel>
          </Grid>

          <Flex gap={2} wrap="wrap">
            {config.features.tour && (
              <Button
                text="Take the tour again"
                mode="bleed"
                fontSize={1}
                padding={2}
                onClick={() => window.dispatchEvent(new Event(TOUR_OPEN_EVENT))}
              />
            )}
            {staffView ? (
              <Button
                text="Show the full Studio"
                mode="bleed"
                fontSize={1}
                padding={2}
                onClick={() => (overridden ? reset() : switchTo('full'))}
              />
            ) : (
              <Button
                text="See the staff view"
                mode="bleed"
                fontSize={1}
                padding={2}
                onClick={() => (overridden ? reset() : switchTo('staff'))}
              />
            )}
          </Flex>
        </Stack>
      </Box>
    );
  };
}

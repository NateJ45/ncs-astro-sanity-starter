// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Home: the Studio's landing page (Studio kit, 2026-10-17)
// =============================================================================
// The Sanity version of the WordPress staff Home on the family's WordPress sites.
// It is the first tool in the top bar, so the Studio opens here. Cards, in the
// order an editor needs them:
//
//   1. Welcome: a greeting by first name and the site's name in the display
//      font, on a soft brand tint, with the one reassurance that matters most.
//      Then this site's quick actions (kitConfig.quickActions, card 110).
//   1b. Pick up where you left off: unpublished drafts with Open, Publish and
//      Discard (card 110). Publish here is the stock publish operation, so it
//      is offered only when the draft is valid and its web address is
//      unchanged; anything else opens the document, where the full Publish
//      (with the safe-rename redirect) runs.
//   2. This week: the site's recurring jobs (kit.config.ts), each ticked off by
//      a GROQ check, so a done job shows done without anyone ticking it. Card
//      111 added jobs ticked by the Checkup being clear, and jobs ticked by
//      hand, kept on one small document per week (WEEK_TYPE), so the list
//      starts fresh each week without anything being reset.
//   3. Is it live? The build time from /build-info.json against the newest
//      published change (liveStatus in src/lib/studio-kit.ts). Card 111: a
//      FAILED deploy (the deploy route) says so, with "Try again".
//   4. Fix-it list (card 115, was Site health): the Checkup's findings by
//      name, each with Edit, and "See the whole list".
//   4b. Coming up (card 115): what will publish by itself, soonest first.
//   5. Recent edits: the last few things changed, unpublished ones flagged.
//   6. Visitors (card 115): Cloudflare Web Analytics through the Worker route
//      /api/studio/visitors/, or a calm "not set up yet".
//   6b. Your pages (card 115, kitConfig.pages) and "Watch how it is done"
//      (guide videos; hidden when no guide has one).
//   7. Ask for help, "Need help?" line, the tour again, the staff view switch.
// Card 115's cards live in HomeCards.tsx and GuideVideos.tsx; the dated
// greeting line ("Sunday, October 18") is todayLine() in src/lib/studio-home.ts.
//
// Every card fails soft: a failed fetch shows a quiet sentence, never a blank.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useClient,
  useCurrentUser,
  useDocumentOperation,
  useValidationStatus,
  useWorkspace,
} from 'sanity';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Grid,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@sanity/ui';
import { useToast } from '@sanity/ui/toast';
import {
  checklist,
  deployProblem,
  firstName,
  greeting,
  liveStatus,
  timeAgo,
  weekDocId,
  weekKey,
  weekStart,
  WEEK_TYPE,
  type LiveState,
} from '../../lib/studio-kit';
import { publishedIdOf, type CheckResult } from '../../lib/studio-checkup';
import { todayLine } from '../../lib/studio-home';
import {
  API_VERSION,
  PUBLISHED_EVENT,
  TOUR_OPEN_EVENT,
  useCheckup,
  useLiveData,
  useStaffView,
  useStudioLink,
  useTryAgain,
  useTypeTitle,
} from './shared';
import {
  ComingUp,
  FixItList,
  PagesMap,
  Panel,
  Quiet,
  useScheduledTypes,
  Visitors,
} from './HomeCards';
import { GuideVideos } from './GuideVideos';
import type { KitConfig, QuickAction, ThisWeekTask } from './types';

const NOT_SYSTEM = `!(_type match "sanity.*") && !(_type match "system.*") && !(_type match "media.*") && !(_id in path("versions.**")) && !(_id match "_.**")`;

// -----------------------------------------------------------------------------

function ThisWeek({
  tasks,
  firstDay,
  title,
  checkupResults,
}: {
  tasks: ThisWeekTask[];
  firstDay: 0 | 1;
  title: string;
  /** The Checkup's findings, shared with Site health; null while it runs. */
  checkupResults: CheckResult[] | null;
}) {
  const client = useClient({ apiVersion: API_VERSION });
  const linkTo = useStudioLink();
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, unknown> | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const key = weekKey(new Date(), firstDay);
  const docId = weekDocId(key);

  useEffect(() => {
    let cancelled = false;
    const params = { weekStart: weekStart(new Date(), firstDay), now: new Date().toISOString() };
    Promise.all([
      Promise.all(
        tasks
          .filter((t) => t.query)
          .map((t) =>
            client
              .fetch(t.query as string, params)
              .then((answer) => [t.id, answer] as const)
              .catch(() => [t.id, false] as const),
          ),
      ),
      client.fetch<string[] | null>(`*[_id == $id][0].ticked`, { id: docId }).catch(() => null),
    ]).then(([pairs, hand]) => {
      if (cancelled) return;
      setAnswers(Object.fromEntries(pairs));
      setTicked(hand ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [client, tasks, firstDay, docId]);

  // Hand ticks go on this week's own small document. Created on the first tick;
  // a new week has a new id, so last week's ticks simply stop counting.
  const toggle = async (id: string, on: boolean) => {
    setSaving(id);
    const before = ticked;
    setTicked(on ? [...ticked.filter((t) => t !== id), id] : ticked.filter((t) => t !== id));
    try {
      await client.createIfNotExists({ _id: docId, _type: WEEK_TYPE, weekOf: key, ticked: [] });
      const patch = client
        .patch(docId)
        .setIfMissing({ ticked: [] })
        .unset([`ticked[@ == "${id}"]`]);
      await (on ? patch.append('ticked', [id]) : patch).commit({ autoGenerateArrayKeys: false });
    } catch {
      setTicked(before);
      toast.push({ status: 'error', title: 'That tick did not save. Try again in a moment.' });
    } finally {
      setSaving(null);
    }
  };

  const clear = checkupResults ? !checkupResults.some((r) => r.severity === 'Needs doing') : null;
  const rows = answers ? checklist(tasks, answers, ticked, clear) : null;
  const firstDayName = firstDay === 0 ? 'Sunday' : 'Monday';

  return (
    <Panel title={title}>
      {rows === null ? (
        <Spinner muted />
      ) : (
        <Stack gap={4}>
          {tasks.map((t, i) => {
            const row = rows[i];
            const link = t.target ? linkTo(t.target) : null;
            return (
              <Flex key={t.id} gap={3} align="flex-start">
                <Box style={{ flexShrink: 0, paddingTop: 2 }}>
                  {row.tickable ? (
                    <Checkbox
                      id={`week-${t.id}`}
                      checked={row.done}
                      disabled={saving === t.id}
                      onChange={(e) => void toggle(t.id, e.currentTarget.checked)}
                      style={{ width: 24, height: 24 }}
                    />
                  ) : (
                    <Badge tone={row.done ? 'positive' : 'default'} fontSize={1} padding={2}>
                      {row.done ? 'Done' : 'To do'}
                    </Badge>
                  )}
                </Box>
                <Stack gap={2} flex={1}>
                  <Text size={2} weight="semibold">
                    {row.tickable ? <label htmlFor={`week-${t.id}`}>{t.title}</label> : t.title}
                  </Text>
                  <Text size={1} muted style={{ lineHeight: 1.5 }}>
                    {t.detail}
                    {row.by === 'content' || row.by === 'checkup' ? ' Ticked for you.' : ''}
                  </Text>
                </Stack>
                {!row.done && link && (
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
          <Quiet>{`The list starts fresh every ${firstDayName}.`}</Quiet>
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

function IsItLive({ slowAfter, helperName }: { slowAfter: number; helperName: string }) {
  // Shared with the navbar line (NavbarStatus.tsx), so the two never disagree.
  const state = useLiveData();
  const retry = useTryAgain();
  const now = state?.now ?? Date.now();

  const status = state ? liveStatus(state.builtAt, state.lastPublish, now, slowAfter) : null;
  const problem = state ? deployProblem(state.deploy, helperName) : null;
  return (
    <Panel title="Is it live?">
      {!status || !state ? (
        <Spinner muted />
      ) : problem ? (
        // Card 111: the newest deploy failed. Nothing is on its way, so say so.
        <Stack gap={3}>
          <Flex>
            <Badge tone="critical" fontSize={1} padding={2}>
              Did not go through
            </Badge>
          </Flex>
          <Text size={2} style={{ lineHeight: 1.6 }}>
            {problem.message}
          </Text>
          <Flex>
            <Button
              text="Try again"
              tone="critical"
              fontSize={1}
              padding={2}
              disabled={retry.busy}
              onClick={() => void retry.tryAgain()}
            />
          </Flex>
          {retry.note && <Quiet>{retry.note}</Quiet>}
        </Stack>
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
// The header: greeting, the site's name, the reassurance (card 110)
// -----------------------------------------------------------------------------

function Welcome({ config }: { config: KitConfig }) {
  const user = useCurrentUser();
  const { title } = useWorkspace();
  return (
    // tone="primary" is the branded accent at its softest tint (studioTheme.ts),
    // so the header carries the brand without a literal colour or a gradient.
    <Card tone="primary" padding={[4, 5, 6]} radius={4}>
      <Stack gap={4}>
        <Stack gap={3}>
          <Text size={1} muted weight="semibold">
            {todayLine(new Date())}
          </Text>
          <Text size={2} muted>
            {`${greeting(new Date())}, ${firstName(user?.name)}`}
          </Text>
        </Stack>
        {/* Heading uses the theme's heading font: the site's display face. */}
        <Heading as="h1" size={[3, 4, 5]} style={{ lineHeight: 1.15 }}>
          {title}
        </Heading>
        <Box style={{ maxWidth: 620 }}>
          <Text size={2} muted style={{ lineHeight: 1.6 }}>
            {`This is where you look after ${config.siteName}. Nothing you change here is public until you press Publish, so it is safe to look around.`}
          </Text>
        </Box>
      </Stack>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Quick actions (kitConfig.quickActions, card 110)
// -----------------------------------------------------------------------------

function QuickActionCard({ action }: { action: QuickAction }) {
  const linkTo = useStudioLink();
  const link = linkTo(action.target);
  const Icon = action.icon;
  return (
    <Card as="a" href={link.href} onClick={link.onClick} padding={4} radius={3} border>
      <Flex gap={3} align="flex-start">
        {Icon && (
          <Text size={3} muted>
            <Icon />
          </Text>
        )}
        <Stack gap={2} flex={1}>
          <Text size={2} weight="semibold">
            {action.title}
          </Text>
          {action.detail && (
            <Text size={1} muted style={{ lineHeight: 1.5 }}>
              {action.detail}
            </Text>
          )}
        </Stack>
      </Flex>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Pick up where you left off (card 110)
// -----------------------------------------------------------------------------
// Every unpublished draft, newest first. Sanity documents carry no author, so
// on a site with several editors this lists everyone's drafts; the names and
// times make clear whose is whose.

interface DraftRow {
  _id: string;
  _type: string;
  _updatedAt: string;
  name?: string;
  slug?: unknown;
  /** The published copy's slug, when there is a published copy. */
  publishedSlug?: unknown;
  hasPublished: boolean;
}

const sameSlug = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function DraftItem({ row, onDone }: { row: DraftRow; onDone: () => void }) {
  const id = publishedIdOf(row._id);
  const ops = useDocumentOperation(id, row._type);
  // Validate the draft itself, as Publish does (references must be published).
  const { validation, isValidating } = useValidationStatus(row._id, row._type, true);
  const toast = useToast();
  const typeTitle = useTypeTitle();
  const linkTo = useStudioLink();
  const link = linkTo({ doc: id, type: row._type });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasErrors = validation.some((m) => m.level === 'error');
  const addressChanged = row.hasPublished && !sameSlug(row.slug, row.publishedSlug);
  const canPublish = !ops.publish.disabled && !hasErrors && !isValidating && !addressChanged;
  const canDiscard = row.hasPublished && !ops.discardChanges.disabled;
  const why = hasErrors
    ? 'Something needs filling in first. Open it to see what.'
    : addressChanged
      ? 'The web address changed, so publish it from its own page.'
      : null;
  const name = row.name || typeTitle(row._type);

  const publish = () => {
    setBusy(true);
    ops.publish.execute();
    window.dispatchEvent(new Event(PUBLISHED_EVENT));
    toast.push({
      status: 'success',
      title: 'Published',
      description: 'The website updates itself in a few minutes.',
      closable: true,
    });
    window.setTimeout(onDone, 1500);
  };
  const discard = () => {
    setConfirming(false);
    setBusy(true);
    ops.discardChanges.execute();
    toast.push({ status: 'info', title: 'Changes thrown away', closable: true });
    window.setTimeout(onDone, 1500);
  };

  return (
    <Card padding={3} radius={2} border>
      <Stack gap={3}>
        <Stack gap={2}>
          <Text size={2} weight="semibold" textOverflow="ellipsis">
            {name}
          </Text>
          <Text size={1} muted>
            {typeTitle(row._type)}, changed {timeAgo(row._updatedAt, Date.now())}
            {row.hasPublished ? '' : ', never published'}
          </Text>
          {why && (
            <Text size={1} muted style={{ lineHeight: 1.5 }}>
              {why}
            </Text>
          )}
        </Stack>
        <Flex gap={2} wrap="wrap">
          <Button
            as="a"
            href={link.href}
            onClick={link.onClick}
            text="Open"
            mode="ghost"
            fontSize={1}
            padding={2}
          />
          {canPublish && (
            <Button
              text="Publish"
              tone="positive"
              fontSize={1}
              padding={2}
              disabled={busy}
              onClick={publish}
            />
          )}
          {canDiscard && (
            <Button
              text="Discard changes"
              mode="bleed"
              tone="critical"
              fontSize={1}
              padding={2}
              disabled={busy}
              onClick={() => setConfirming(true)}
            />
          )}
        </Flex>
      </Stack>
      {confirming && (
        <Dialog
          id={`discard-${id}`}
          header="Throw away these changes?"
          onClose={() => setConfirming(false)}
          width={1}
          footer={
            <Flex justify="flex-end" gap={2} padding={3}>
              <Button text="Keep them" mode="ghost" onClick={() => setConfirming(false)} />
              <Button text="Throw them away" tone="critical" onClick={discard} />
            </Flex>
          }
        >
          <Box padding={4}>
            <Text size={2} style={{ lineHeight: 1.6 }}>
              {`Your unpublished changes to "${name}" will be gone. The published version on the website stays exactly as it is.`}
            </Text>
          </Box>
        </Dialog>
      )}
    </Card>
  );
}

function PickUp({ ignoreTypes }: { ignoreTypes: string[] }) {
  const client = useClient({ apiVersion: API_VERSION });
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<DraftRow[]> => {
      const drafts = await client.fetch<Omit<DraftRow, 'publishedSlug' | 'hasPublished'>[]>(
        `*[${NOT_SYSTEM} && _id in path("drafts.**") && !(_type in $ignore)] | order(_updatedAt desc)[0...6]{ _id, _type, _updatedAt, slug, "name": coalesce(title, name, heading, question, label, internalTitle) }`,
        { ignore: ignoreTypes },
      );
      const ids = (drafts ?? []).map((d) => publishedIdOf(d._id));
      const published = ids.length
        ? await client.fetch<{ _id: string; slug?: unknown }[]>(`*[_id in $ids]{ _id, slug }`, {
            ids,
          })
        : [];
      const byId = new Map((published ?? []).map((p) => [p._id, p]));
      return (drafts ?? []).map((d) => {
        const pub = byId.get(publishedIdOf(d._id));
        return { ...d, hasPublished: Boolean(pub), publishedSlug: pub?.slug };
      });
    };
    load()
      .then((r) => !cancelled && setRows(r))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [client, ignoreTypes, tick]);

  // Nothing waiting: say nothing. Home stays calm when there is nothing to do.
  if (!failed && rows && rows.length === 0) return null;
  return (
    <Panel title="Pick up where you left off">
      {failed ? (
        <Quiet>The list of unpublished changes could not load just now.</Quiet>
      ) : rows === null ? (
        <Spinner muted />
      ) : (
        <Stack gap={3}>
          <Quiet>
            These have changes that are saved but not on the website yet. Publish them, or open them
            to carry on.
          </Quiet>
          {rows.map((r) => (
            <DraftItem key={r._id} row={r} onDone={refresh} />
          ))}
        </Stack>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------

export function makeHomeTool(config: KitConfig) {
  return function HomeTool() {
    const { staffView, switchTo, reset, overridden } = useStaffView(config);
    const quick = config.quickActions ?? [];
    // The kit's weekly tick documents (card 111) are bookkeeping, never an edit.
    const ignore = useMemo(() => [...config.checkup.ignoreTypes, WEEK_TYPE], []); // config is fixed for the Studio's life
    const linkTo = useStudioLink();
    const guide = linkTo({ tool: 'site-guide' });
    const content = linkTo({ tool: 'structure' });
    const quickUpdate = linkTo({ tool: 'quick-update' });
    // One Checkup run, shared by the Fix-it list and a "Checkup clear" job (card 111).
    const checkup = useCheckup(config);
    // Coming up shows only where some type has "Publish automatically at" (card 115).
    const scheduledTypes = useScheduledTypes();
    const pages = config.pages ?? [];

    const ask = config.helper.email
      ? `mailto:${config.helper.email}?subject=${encodeURIComponent(`Help with ${config.siteName}`)}&body=${encodeURIComponent(
          `What I was trying to do:\n\nWhat happened:\n\n(Sent from the website editor, ${typeof window === 'undefined' ? '' : window.location.href})`,
        )}`
      : null;

    return (
      <Box padding={[4, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
        <Stack gap={5} style={{ maxWidth: 1040, margin: '0 auto' }}>
          <Welcome config={config} />

          {quick.length > 0 && (
            <Grid gridTemplateColumns={[1, 2, Math.min(quick.length, 4)]} gap={3}>
              {quick.map((a) => (
                <QuickActionCard key={a.title} action={a} />
              ))}
            </Grid>
          )}

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
            {(config.quickUpdate?.length ?? 0) > 0 && (
              <Button
                as="a"
                href={quickUpdate.href}
                onClick={quickUpdate.onClick}
                text="Quick update"
                mode="ghost"
                tone="primary"
                fontSize={2}
                padding={3}
              />
            )}
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

          <PickUp ignoreTypes={ignore} />

          <Grid gridTemplateColumns={[1, 1, 2]} gap={4} style={{ alignItems: 'start' }}>
            {config.thisWeek.length > 0 && (
              <ThisWeek
                tasks={config.thisWeek}
                firstDay={config.weekStartsOn}
                title={config.thisWeekTitle ?? 'This week'}
                checkupResults={config.features.checkup ? checkup.results : null}
              />
            )}
            <IsItLive slowAfter={config.liveSlowAfterMinutes} helperName={config.helper.name} />
            {config.features.checkup && (
              <FixItList results={checkup.results} failed={checkup.failed} />
            )}
            {config.features.comingUp !== false && scheduledTypes.length > 0 && (
              <ComingUp types={scheduledTypes} />
            )}
            <RecentEdits ignoreTypes={ignore} />
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

          <Visitors enabled={config.features.visitors} helperName={config.helper.name} />

          {pages.length > 0 && <PagesMap groups={pages} />}

          {config.features.guide && config.guide.guides.some((g) => g.video) && (
            <Panel title="Watch how it is done">
              <GuideVideos
                guides={config.guide.guides}
                max={3}
                footer={(hidden) =>
                  hidden > 0 ? (
                    <Flex>
                      <Button
                        as="a"
                        href={guide.href}
                        onClick={guide.onClick}
                        text={`${hidden} more in the Site Guide`}
                        mode="bleed"
                        fontSize={1}
                        padding={2}
                      />
                    </Flex>
                  ) : null
                }
              />
            </Panel>
          )}

          <Flex gap={2} align="center" wrap="wrap">
            <Text size={2} muted>
              Need help?
            </Text>
            {config.features.guide && (
              <Button
                as="a"
                href={guide.href}
                onClick={guide.onClick}
                text="Site Guide"
                mode="bleed"
                tone="primary"
                fontSize={2}
                padding={2}
              />
            )}
            {config.features.guide && (
              <Text size={2} muted>
                or
              </Text>
            )}
            {ask ? (
              <Button
                as="a"
                href={ask}
                text={`Ask ${config.helper.name}`}
                mode="bleed"
                tone="primary"
                fontSize={2}
                padding={2}
              />
            ) : (
              <Text size={2} muted>{`Ask ${config.helper.name}`}</Text>
            )}
          </Flex>

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

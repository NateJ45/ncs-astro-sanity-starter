// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// Home: the Studio's landing page (Studio kit, 2026-10-17)
// =============================================================================
// The Sanity version of the WordPress staff Home on the family's WordPress sites.
// It is the first tool in the top bar, so the Studio opens here. Cards, in the
// order an editor needs them:
//
//   1. Welcome: the navy banner (HomeBanner.tsx, card 118): the date, a
//      greeting by first name, the site's name in the display font, the one
//      reassurance that matters most, and "View the website".
//      Then the ways in as job tiles (card 132, HomeCards.tsx QuickTiles):
//      this site's quick actions (kitConfig.quickActions, card 110), then
//      Edit the website, Quick update and How do I...?, each with its art.
//   1b. Pick up where you left off: unpublished drafts as rows (the row opens
//      it) with Publish and Discard (card 110; rows drawn by HomeCards.tsx
//      DraftRowView, card 132). Publish here is the stock publish operation, so it
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
//   5. Recent edits: the last few things changed, each with its type's art,
//      unpublished ones tagged (HomeCards.tsx RecentRows, card 132).
//   6. Visitors (card 115): Cloudflare Web Analytics through the Worker route
//      /api/studio/visitors/, or a calm "not set up yet".
//   6b. Your pages (card 115, kitConfig.pages) and "Watch how it is done"
//      (guide videos; hidden when no guide has one).
//   7. Ask for help, "Need help?" line, the tour again, the staff view switch.
// Card 115's cards live in HomeCards.tsx and GuideVideos.tsx; the dated
// greeting line ("Sunday, October 18") is todayLine() in src/lib/studio-home.ts;
// the banner is HomeBanner.tsx (card 118).
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
import { Box, Button, Dialog, Flex, Grid, Stack, Text } from '@sanity/ui';
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
} from '../../lib/studio-kit';
import { publishedIdOf, type CheckResult } from '../../lib/studio-checkup';
import {
  API_VERSION,
  PUBLISHED_EVENT,
  useCheckup,
  useLiveData,
  useStaffView,
  useStudioLink,
  useTryAgain,
  useTypeTitle,
} from './shared';
import {
  ComingUp,
  DraftRowView,
  FixItList,
  PagesMap,
  Panel,
  QuickTiles,
  Quiet,
  RecentRows,
  useScheduledTypes,
  Visitors,
  type QuickTile,
  type RecentRow,
} from './HomeCards';
import { GuideVideos, hasVideo } from './GuideVideos';
import { TourButton, WHATS_NEW_EVENT, startTour } from './StudioTour';
import { ArtRows, CheckPath, KitAction, KitLoading, KitScope, LiveSteps } from './ui';
import { LIVE_STEP_WORDS, liveSteps, pathProgress } from '../../lib/studio-look';
import { HomeBanner } from './HomeBanner';
import { NewsletterCard, RsvpComingUp } from '../mail/MailHome';
import type { KitConfig, QuickAction, ThisWeekTask } from './types';
import { ICON_MAPS } from '../brandIcons';
import type { StudioTarget } from '../../lib/studio-kit';
import { recentEditsIgnore } from '../../lib/studio-signin';

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
    <Panel
      tour="home-this-week"
      title={title}
      edge
      action={
        rows ? (
          <span className="ui-muted">{pathProgress(rows.map((r) => r.done)).text}</span>
        ) : undefined
      }
    >
      {rows === null ? (
        <KitLoading />
      ) : (
        <Stack gap={4}>
          {/* Card 131: the list as a path; each stone is the tick and fills when done. */}
          <CheckPath
            idPrefix="week"
            onToggle={(id, on) => void toggle(id, on)}
            items={tasks.map((t, i) => {
              const row = rows[i];
              const link = t.target ? linkTo(t.target) : null;
              return {
                id: t.id,
                title: t.title,
                detail: t.detail,
                done: row.done,
                tickable: row.tickable,
                busy: saving === t.id,
                note: row.by === 'content' || row.by === 'checkup' ? 'Ticked for you.' : undefined,
                action: link ? (
                  <KitAction href={link.href} onClick={link.onClick}>
                    {t.targetLabel ?? 'Do it'}
                  </KitAction>
                ) : undefined,
              };
            })}
          />
          <Quiet>{`The list starts fresh every ${firstDayName}.`}</Quiet>
        </Stack>
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------

function IsItLive({ slowAfter, helperName }: { slowAfter: number; helperName: string }) {
  // Shared with the navbar line (NavbarStatus.tsx), so the two never disagree.
  const state = useLiveData();
  const retry = useTryAgain();
  const now = state?.now ?? Date.now();

  const status = state ? liveStatus(state.builtAt, state.lastPublish, now, slowAfter) : null;
  const problem = state ? deployProblem(state.deploy, helperName) : null;
  return (
    <Panel title="Is it live?" meaning="publishing" tour="home-is-it-live">
      {!status || !state ? (
        <KitLoading />
      ) : problem ? (
        // Card 111: the newest deploy failed. Nothing is on its way, so say so.
        // Card 131: the middle stone did not go down.
        <Stack gap={4}>
          <LiveSteps states={liveSteps('failed')} words={LIVE_STEP_WORDS} />
          <Text size={2} style={{ lineHeight: 1.6 }}>
            {problem.message}
          </Text>
          <Flex>
            <KitAction strong disabled={retry.busy} onClick={() => void retry.tryAgain()}>
              Try again
            </KitAction>
          </Flex>
          {retry.note && <Quiet>{retry.note}</Quiet>}
        </Stack>
      ) : (
        <Stack gap={4}>
          <LiveSteps states={liveSteps(status.state)} words={LIVE_STEP_WORDS} />
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

type Row = RecentRow;

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
    <Panel title="Recent edits" meaning="document" tour="home-recent">
      {failed ? (
        <Quiet>The list could not load just now.</Quiet>
      ) : rows === null ? (
        <KitLoading />
      ) : rows.length === 0 ? (
        <Quiet>Nothing has been edited yet.</Quiet>
      ) : (
        <RecentRows rows={rows} typeTitle={typeTitle} linkTo={linkTo} now={now} />
      )}
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// The header: the navy welcome banner (card 118, was card 110's tinted card)
// -----------------------------------------------------------------------------

function Welcome({ config }: { config: KitConfig }) {
  const user = useCurrentUser();
  const { title } = useWorkspace();
  const now = new Date();
  return (
    <HomeBanner
      now={now}
      hello={greeting(now)}
      firstName={firstName(user?.name)}
      title={title}
      intro={`This is where you look after ${config.siteName}. Nothing you change here is public until you press Publish, so it is safe to look around.`}
      banner={config.homeBanner}
    />
  );
}

// -----------------------------------------------------------------------------
// Quick actions (kitConfig.quickActions, card 110)
// -----------------------------------------------------------------------------

/** The meaning a quick action's target is drawn with, when the site maps one (else its icon). */
function targetMeaning(target: StudioTarget) {
  if ('doc' in target) return ICON_MAPS.types[target.type ?? target.doc];
  if ('create' in target) return ICON_MAPS.types[target.create];
  if ('tool' in target) return ICON_MAPS.tools[target.tool];
  return undefined;
}

/** A config quick action as a job tile (card 132). */
function quickTile(action: QuickAction, link: QuickTile['link']): QuickTile {
  const meaning = targetMeaning(action.target);
  return {
    key: action.title,
    title: action.title,
    lead: action.detail,
    meaning: meaning ?? (action.icon ? undefined : 'document'),
    icon: action.icon,
    link,
  };
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
    <>
      <DraftRowView
        type={row._type}
        name={name}
        meta={`${typeTitle(row._type)}, changed ${timeAgo(row._updatedAt, Date.now())}${row.hasPublished ? '' : ', never published'}`}
        why={why}
        link={link}
        seed={name.length}
        canPublish={canPublish}
        canDiscard={canDiscard}
        busy={busy}
        onPublish={publish}
        onDiscard={() => setConfirming(true)}
      />
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
    </>
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
    <Panel title="Pick up where you left off" meaning="step" tour="home-pick-up">
      {failed ? (
        <Quiet>The list of unpublished changes could not load just now.</Quiet>
      ) : rows === null ? (
        <KitLoading />
      ) : (
        <Stack gap={3}>
          <Quiet>
            These have changes that are saved but not on the website yet. Publish them, or open them
            to carry on.
          </Quiet>
          <ArtRows label="Unpublished changes">
            {rows.map((r) => (
              <DraftItem key={r._id} row={r} onDone={refresh} />
            ))}
          </ArtRows>
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
    const ignore = useMemo(
      () => recentEditsIgnore(config.checkup.ignoreTypes, config.recentIgnoreTypes, WEEK_TYPE),
      [],
    ); // config is fixed for the Studio's life
    const linkTo = useStudioLink();
    const guide = linkTo({ tool: 'site-guide' });
    const content = linkTo({ tool: 'structure' });
    const quickUpdate = linkTo({ tool: 'quick-update' });
    // One Checkup run, shared by the Fix-it list and a "Checkup clear" job (card 111).
    const checkup = useCheckup(config);
    // Coming up shows only where some type has "Publish automatically at" (card 115).
    const scheduledTypes = useScheduledTypes();
    const pages = config.pages ?? [];
    const tiles: QuickTile[] = [
      ...quick.map((a) => quickTile(a, linkTo(a.target))),
      {
        key: 'edit-the-website',
        title: 'Edit the website',
        lead: 'Every page, section and setting, in one place.',
        meaning: 'pages',
        link: content,
      },
      ...((config.quickUpdate?.length ?? 0) > 0
        ? [
            {
              key: 'quick-update',
              title: 'Quick update',
              lead: 'The everyday jobs, a few taps each.',
              meaning: 'quickUpdate',
              link: quickUpdate,
            } satisfies QuickTile,
          ]
        : []),
      ...(config.features.guide
        ? [
            {
              key: 'how-do-i',
              title: 'How do I...?',
              lead: 'Step-by-step help for every job on the website.',
              meaning: 'guide',
              link: guide,
            } satisfies QuickTile,
          ]
        : []),
    ];

    const ask = config.helper.email
      ? `mailto:${config.helper.email}?subject=${encodeURIComponent(`Help with ${config.siteName}`)}&body=${encodeURIComponent(
          `What I was trying to do:\n\nWhat happened:\n\n(Sent from the website editor, ${typeof window === 'undefined' ? '' : window.location.href})`,
        )}`
      : null;

    return (
      <Box padding={[4, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
        <Stack gap={5} style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div data-tour="home-banner">
            <Welcome config={config} />
          </div>

          {/* Card 132: the quick actions and the ways in, as job tiles. */}
          <div data-tour="home-quick-actions">
            <QuickTiles tiles={tiles} />
          </div>

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
              <ComingUp types={scheduledTypes}>{config.features.mail && <RsvpComingUp />}</ComingUp>
            )}
            {config.features.mail && <NewsletterCard helperName={config.helper.name} />}
            <RecentEdits ignoreTypes={ignore} />
            <Panel title={`Ask ${config.helper.name}`} meaning="message" tour="home-ask">
              <Quiet>
                Stuck, or something looks wrong? Say what you were trying to do and what happened.
                Nothing is ever lost by asking.
              </Quiet>
              {ask && (
                <Flex paddingTop={3}>
                  <KitAction href={ask}>{`Email ${config.helper.name}`}</KitAction>
                </Flex>
              )}
            </Panel>
          </Grid>

          <Visitors enabled={config.features.visitors} helperName={config.helper.name} />

          {pages.length > 0 && <PagesMap groups={pages} />}

          {config.features.guide && config.guide.guides.some(hasVideo) && (
            <Panel title="Watch how it is done" meaning="preview" tour="home-videos">
              <GuideVideos
                guides={config.guide.guides}
                max={3}
                footer={(hidden) =>
                  hidden > 0 ? (
                    <Flex>
                      <KitAction quiet href={guide.href} onClick={guide.onClick}>
                        {`${hidden} more in the Site Guide`}
                      </KitAction>
                    </Flex>
                  ) : null
                }
              />
            </Panel>
          )}

          {/* Card 132: the help line and the switches as the kit's quiet links. */}
          <KitScope>
            <div style={{ display: 'grid', gap: 14 }} data-tour="home-help">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="ui-muted">Need help?</span>
                {config.features.guide && (
                  <KitAction href={guide.href} onClick={guide.onClick}>
                    Site Guide
                  </KitAction>
                )}
                {config.features.guide && <span className="ui-muted">or</span>}
                {ask ? (
                  <KitAction href={ask}>{`Ask ${config.helper.name}`}</KitAction>
                ) : (
                  <span className="ui-muted">{`Ask ${config.helper.name}`}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {/* Card 137: the person's first-run tour, this screen's, and the changelog. */}
                {config.features.tour && (
                  <KitAction quiet onClick={() => startTour()}>
                    Show me around
                  </KitAction>
                )}
                {config.features.tour && <TourButton tool="home" staff={staffView} />}
                {config.features.tour && config.whatsNew?.length ? (
                  <KitAction quiet onClick={() => window.dispatchEvent(new Event(WHATS_NEW_EVENT))}>
                    What&apos;s new
                  </KitAction>
                ) : null}
                {staffView ? (
                  <KitAction quiet onClick={() => (overridden ? reset() : switchTo('full'))}>
                    Show the full Studio
                  </KitAction>
                ) : (
                  <KitAction quiet onClick={() => (overridden ? reset() : switchTo('staff'))}>
                    See the staff view
                  </KitAction>
                )}
              </div>
            </div>
          </KitScope>
        </Stack>
      </Box>
    );
  };
}

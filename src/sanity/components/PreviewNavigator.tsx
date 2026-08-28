// Foundation, edit with care
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import { usePresentationNavigate, usePresentationParams } from 'sanity/presentation';
import {
  Box,
  Button,
  Card,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@sanity/ui';
import {
  AddIcon,
  ArchiveIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  LaunchIcon,
  RestoreIcon,
  ShareIcon,
} from '@sanity/icons';
import { SINGLETON_PREVIEW_PATHS } from '../resolve';
import { addSectionToPage, duplicatePage, setPageArchived, type PageOpsClient } from '../pageOps';
import { SECTION_HOST_TYPES } from '../pageBuilderConfig';
import { sectionLabel } from '../../lib/page-checks';
import { startNav, stepNav, type PendingNav } from '../../lib/preview-navigation';
import { SHARE_LINK_TTL_PHRASE, useShareDraftLink } from './shareDraftLink';
import { LiveDraftBridge } from './LiveDraftBridge';

// =============================================================================
// PreviewNavigator - the Squarespace-style page list beside the live preview
// (ported from presacademy 2026-08-28; original lineage: the WCP site)
// =============================================================================
// Docked to the left of the Presentation tool (components.unstable_navigator).
// Click a page and the preview jumps there while the edit panel follows
// (Presentation resolves the URL through resolve.mainDocuments).
//
//  - Status dots: amber = published with unpublished edits, hollow = never
//    published. Answers "did my change go live?" at a glance.
//  - Grouping: "Main pages" (the built-in singletons, in site-nav order) and
//    "Custom pages" (`page` docs an editor created).
//  - A live-page link per published row.
//  - A "Copy share link" button per row: mints a one-hour link that shows the
//    CURRENT DRAFT of that page to someone with no Sanity login. See
//    ./shareDraftLink.tsx for the handshake and why an hour is the ceiling.
//  - "New page": creates a fresh `page` DRAFT and opens it right here.
//  - A per-row "..." menu on custom pages (PORTS.md card 21):
//      Duplicate - copies the page into a NEW DRAFT at a free web address.
//      Archive / Restore - sets `archived` on both twins. Every live-site query
//      skips an archived page, but nothing is deleted, so Restore is complete.
//      Archived rows collect in a group at the bottom of the list.
//    Both verbs are ../pageOps.ts, shared with the publish-menu actions.
//  - Site settings pinned at the bottom.
//
// Saved sections (PORTS.md card 24): a collapsible group under the page list
// showing every `sectionPreset` document, each with an "add to the page you are
// looking at" button. It lives here because the page form's own "+ Add section"
// picker can only offer schema TYPES, never documents.
//
// The custom-page list LIVE-refreshes through client.listen, so a rename, a new
// page, or a publish shows up without reopening the tool.
// =============================================================================

const APIV = '2026-05-01';

// Main pages in the order a visitor meets them. Labels are static; the doc id
// equals the type (the desk structure's singleton convention).
const MAIN_PAGES: { type: string; label: string }[] = [
  { type: 'homePage', label: 'Home' },
  { type: 'aboutPage', label: 'About' },
  { type: 'servicesPage', label: 'Services' },
  { type: 'processPage', label: 'Process' },
  { type: 'journalPage', label: 'Journal' },
  { type: 'faqPage', label: 'FAQ' },
  { type: 'contactPage', label: 'Contact' },
  { type: 'privacyPage', label: 'Privacy' },
  { type: 'notFoundPage', label: '404 page' },
];

// Live path per singleton (preview path minus the /preview prefix).
const livePathFor = (type: string) => {
  const href = SINGLETON_PREVIEW_PATHS[type];
  if (!href) return undefined;
  return href === '/preview' ? '/' : href.replace(/^\/preview/, '');
};

/** The list groups, in display order. Archived last: it is the drawer, not the
 *  desk. */
const GROUPS = ['Main pages', 'Custom pages', 'Archived'] as const;
type Group = (typeof GROUPS)[number];

interface NavRow {
  id: string;
  type: string;
  label: string;
  href: string;
  liveHref?: string;
  hasDraft: boolean;
  hasPublished: boolean;
  archived: boolean;
  group: Group;
}

/** One saved section (a `sectionPreset` document), ready to add to a page. */
interface PresetRow {
  id: string;
  title: string;
  sectionType: string;
  /** The captured section object, exactly as it will be appended. */
  section: Record<string, unknown> | null;
}

/** A raw sectionPreset document, as the list query returns it. */
interface PresetDoc {
  _id: string;
  title?: string;
  sectionType?: string;
  section?: unknown;
}

/** Past this many saved sections the list stops being scannable - say so. */
const PRESET_SOFT_CAP = 30;

// Collapse draft + published twins of one document into a single row's status.
function collapse<T extends { _id: string }>(
  docs: T[],
): Map<string, { doc: T; draft: boolean; published: boolean }> {
  const byId = new Map<string, { doc: T; draft: boolean; published: boolean }>();
  for (const d of docs) {
    const isDraft = d._id.startsWith('drafts.');
    const id = d._id.replace(/^drafts\./, '');
    const entry = byId.get(id) ?? { doc: d, draft: false, published: false };
    if (isDraft) {
      entry.draft = true;
      entry.doc = d; // the draft's field values are what the editor last typed
    } else {
      entry.published = true;
      if (!entry.draft) entry.doc = d;
    }
    byId.set(id, entry);
  }
  return byId;
}

async function fetchRows(client: ReturnType<typeof useClient>): Promise<NavRow[]> {
  // Raw perspective on purpose: we need BOTH twins for the status dots.
  const singletonTypes = MAIN_PAGES.map((p) => p.type);
  const [singletons, pages] = await Promise.all([
    client.fetch<{ _id: string; _type: string }[]>('*[_type in $types]{ _id, _type }', {
      types: singletonTypes,
    }),
    client.fetch<
      {
        _id: string;
        _type: string;
        title?: string;
        slug?: { current?: string };
        archived?: boolean;
      }[]
    >('*[_type == "page"]{ _id, _type, title, slug, archived }'),
  ]);

  const byType = new Map<string, { draft: boolean; published: boolean }>();
  for (const [, entry] of collapse(singletons)) {
    const t = entry.doc._type;
    const prev = byType.get(t) ?? { draft: false, published: false };
    byType.set(t, {
      draft: prev.draft || entry.draft,
      published: prev.published || entry.published,
    });
  }

  const rows: NavRow[] = MAIN_PAGES.map(({ type, label }) => ({
    id: type, // singleton doc id == type
    type,
    label,
    href: SINGLETON_PREVIEW_PATHS[type],
    liveHref: byType.get(type)?.published ? livePathFor(type) : undefined,
    hasDraft: byType.get(type)?.draft ?? false,
    hasPublished: byType.get(type)?.published ?? false,
    archived: false,
    group: 'Main pages',
  }));

  for (const [id, { doc, draft, published }] of collapse(pages)) {
    const slug = doc.slug?.current;
    if (!slug) continue;
    const archived = doc.archived === true;
    rows.push({
      id,
      type: 'page',
      label: doc.title || slug,
      href: `/preview/${slug}`,
      // No live link for an archived page: it is not built any more.
      liveHref: published && !archived ? `/${slug}` : undefined,
      hasDraft: draft,
      hasPublished: published,
      archived,
      group: archived ? 'Archived' : 'Custom pages',
    });
  }
  return rows;
}

/**
 * Collapse the saved-section documents into rows, newest wording first (the
 * draft twin wins, same rule as the page list), sorted by name.
 */
function buildPresets(docs: PresetDoc[]): PresetRow[] {
  const rows: PresetRow[] = [];
  for (const [id, { doc }] of collapse(docs)) {
    const held = Array.isArray(doc.section) ? doc.section[0] : null;
    const section =
      held && typeof held === 'object' && !Array.isArray(held)
        ? (held as Record<string, unknown>)
        : null;
    const type =
      doc.sectionType || (section && typeof section._type === 'string' ? section._type : '');
    rows.push({ id, title: doc.title || '(unnamed saved section)', sectionType: type, section });
  }
  rows.sort((a, b) => a.title.localeCompare(b.title));
  return rows;
}

/** Every saved section, whole: adding one to a page is a plain copy of it. */
async function fetchPresets(client: ReturnType<typeof useClient>): Promise<PresetRow[]> {
  const docs = await client.fetch<PresetDoc[]>(
    '*[_type == "sectionPreset"]{ _id, title, sectionType, section }',
  );
  return buildPresets(docs ?? []);
}

/** Amber = live page with unpublished edits; hollow = never published. */
function StatusDot({ row }: { row: NavRow }) {
  if (!row.hasDraft) return null;
  const unpublished = !row.hasPublished;
  return (
    <span
      title={unpublished ? 'Not published yet' : 'Has unpublished edits'}
      style={{
        flexShrink: 0,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: unpublished ? 'transparent' : '#f59e0b',
        border: unpublished ? '1.5px solid #9aa4b2' : 'none',
      }}
    />
  );
}

export function PreviewNavigator() {
  const client = useClient({ apiVersion: APIV });
  const navigate = usePresentationNavigate();
  const params = usePresentationParams();
  const [rows, setRows] = useState<NavRow[] | null>(null);
  const [presets, setPresets] = useState<PresetRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();
  const { share, sharing } = useShareDraftLink();

  const refetch = useCallback(() => {
    fetchRows(client)
      .then(setRows)
      .catch(() => setRows([]));
    fetchPresets(client)
      .then(setPresets)
      .catch(() => setPresets([]));
  }, [client]);

  useEffect(() => {
    refetch();
    // Live refresh: any page or saved-section mutation (rename, publish, new
    // page, a section just saved) triggers a refetch after a short settle.
    // visibility:'query' waits until it is actually queryable.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = client
      .listen(
        '*[_type in ["page", "sectionPreset"]]',
        {},
        { visibility: 'query', events: ['mutation'] },
      )
      .subscribe(() => {
        clearTimeout(timer);
        timer = setTimeout(refetch, 800);
      });
    return () => {
      clearTimeout(timer);
      sub.unsubscribe();
    };
  }, [client, refetch]);

  // params.preview is the iframe's current URL; compare pathnames only.
  const current = (params.preview ?? '').split('?')[0];

  // BOUNCE-AWARE navigation (ported from presacademy 2026-08-28, editor
  // feedback). Clicking a page took two clicks every time: the panel changed,
  // the iframe did not, the panel bounced back, and the second click worked. The
  // whole rule set, and the host sources it was read out of, live in
  // ../../lib/preview-navigation.ts; this is only the timer and the navigate
  // call. It replaces an older sticky retry that re-issued navigate() with the
  // SAME href, which left params.preview where it already was and so never
  // re-ran the host effect that posts to the iframe at all.
  //
  // `pending` also drives the row highlight, and because it now survives the
  // bounce the list stays put instead of flickering back and forth.
  const [pending, setPending] = useState<PendingNav | null>(null);
  const go = useCallback(
    (href: string, type: string, id: string) => {
      setPending(startNav(href, type, id, current, Date.now()));
      navigate(href, { type, id });
    },
    [navigate, current],
  );
  useEffect(() => {
    if (!pending) return undefined;
    const step = () => {
      const next = stepNav(pending, current, Date.now());
      if (next.action === 'settle') {
        setPending(null);
        return;
      }
      if (next.action === 'retry' && next.pending) {
        setPending(next.pending);
        navigate(next.pending.href, { type: next.pending.type, id: next.pending.id });
        return;
      }
      // Identity is the signal: stepNav hands back the same object when nothing
      // moved, which is what keeps this effect from re-running itself forever.
      if (next.pending !== pending) setPending(next.pending);
    };
    step();
    // The window has to close on its own: params.preview can sit still for the
    // whole of it, and a stale `pending` would pin the row highlight.
    const timer = setInterval(step, 400);
    return () => clearInterval(timer);
  }, [pending, current, navigate]);

  // "New page": create an empty DRAFT (so nothing half-made ever publishes
  // itself) and open it in the edit panel right here.
  const createPage = useCallback(async () => {
    setCreating(true);
    try {
      const id = crypto.randomUUID();
      await client.create({ _id: `drafts.${id}`, _type: 'page' });
      navigate(current || '/preview', { type: 'page', id });
      refetch();
    } finally {
      setCreating(false);
    }
  }, [client, navigate, current, refetch]);

  // ---------------------------------------------------------------------------
  // Duplicate / Archive / Restore (PORTS.md card 21)
  // ---------------------------------------------------------------------------
  // The logic is ../pageOps.ts, shared with the publish-menu actions, so the
  // same click does the same thing from either surface. Everything here is the
  // reporting: a busy row, a toast, and a refetch.
  const duplicateRow = useCallback(
    async (row: NavRow) => {
      setBusyId(row.id);
      try {
        const newId = await duplicatePage(
          client as unknown as PageOpsClient,
          row.type,
          row.id,
          row.label,
        );
        refetch();
        navigate(current || '/preview', { type: row.type, id: newId });
        toast.push({
          status: 'success',
          title: `Copied "${row.label}"`,
          description: 'The copy is a draft. Change what you need, then Publish it.',
          duration: 8000,
        });
      } catch (err) {
        console.error('[navigator] duplicate failed', err);
        toast.push({ status: 'error', title: 'Could not copy that page. Please try again.' });
      } finally {
        setBusyId(null);
      }
    },
    [client, current, navigate, refetch, toast],
  );

  const archiveRow = useCallback(
    async (row: NavRow, archived: boolean) => {
      setBusyId(row.id);
      try {
        await setPageArchived(client as unknown as PageOpsClient, row.id, archived);
        refetch();
        toast.push({
          status: 'success',
          title: archived ? `Archived "${row.label}"` : `Restored "${row.label}"`,
          description: archived
            ? 'It is off the site and kept here. Publish to make that live.'
            : 'It is back on the site. Publish to make that live.',
          duration: 8000,
        });
      } catch (err) {
        console.error('[navigator] archive failed', err);
        toast.push({ status: 'error', title: 'Could not do that. Please try again.' });
      } finally {
        setBusyId(null);
      }
    },
    [client, refetch, toast],
  );

  const grouped = useMemo(() => {
    if (!rows) return null;
    return GROUPS.map((g) => ({ title: g, rows: rows.filter((r) => r.group === g) })).filter(
      (g) => g.rows.length > 0,
    );
  }, [rows]);

  // ---------------------------------------------------------------------------
  // Saved sections (PORTS.md card 24)
  // ---------------------------------------------------------------------------
  // The "+ Add section" picker inside a page can only offer schema TYPES, so a
  // saved section (a `sectionPreset` DOCUMENT) has no way in there. This panel
  // already knows which page the preview is on, so it is the one place that can
  // say "add this to the page you are looking at".
  const [presetsOpen, setPresetsOpen] = useState(false);

  // Which page the preview is showing, as a row. `pending` wins so a click and
  // an immediate "Add" land on the same page. An exact href match first; the
  // endsWith fallback is the same one the row highlight uses.
  const currentRow = useMemo(() => {
    if (!rows) return null;
    const href = pending?.href ?? current;
    if (!href) return null;
    return rows.find((r) => r.href === href) ?? rows.find((r) => href.endsWith(r.href)) ?? null;
  }, [rows, pending, current]);

  // The page-builder array on the page in view, or undefined when that page has
  // none (a settings-shaped singleton, say). Undefined disables the button.
  const currentField = currentRow ? SECTION_HOST_TYPES[currentRow.type] : undefined;

  const addPreset = useCallback(
    async (preset: PresetRow) => {
      if (!currentRow || !currentField || !preset.section) return;
      setBusyId(preset.id);
      try {
        await addSectionToPage(
          client as unknown as PageOpsClient,
          currentRow.id,
          currentField,
          preset.section,
        );
        refetch();
        toast.push({
          status: 'success',
          title: `Added "${preset.title}" to ${currentRow.label}`,
          description: 'It is at the bottom of the page. Drag it where you want it, then Publish.',
          duration: 8000,
        });
      } catch (err) {
        console.error('[navigator] add preset failed', err);
        toast.push({
          status: 'error',
          title: 'Could not add that saved section. Please try again.',
        });
      } finally {
        setBusyId(null);
      }
    },
    [client, currentRow, currentField, refetch, toast],
  );

  return (
    <Flex direction="column" style={{ height: '100%' }}>
      {/* KEYSTROKE-INSTANT PREVIEW (2026-08-28). Renders nothing. It lives here
          because this panel is the one place inside Presentation that already
          knows WHICH page the preview is showing, and it is always mounted
          alongside the preview iframe it posts into. See ./LiveDraftBridge.tsx
          for what it sends and src/lib/preview-live-draft.ts for the contract. */}
      {currentRow && (
        <LiveDraftBridge
          key={currentRow.id}
          documentId={currentRow.id}
          documentType={currentRow.type}
        />
      )}
      <Box flex={1} padding={3} style={{ overflowY: 'auto' }}>
        <Stack space={4}>
          {grouped === null ? (
            <Flex align="center" gap={2} padding={2}>
              <Spinner muted />
              <Text size={1} muted>
                Loading
              </Text>
            </Flex>
          ) : (
            grouped.map((group) => (
              <Stack key={group.title} space={2}>
                <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase' }}>
                  {group.title}
                </Text>
                <Stack space={1}>
                  {group.rows.map((r) => {
                    const active = pending
                      ? pending.href === r.href
                      : current === r.href || (r.href !== '/preview' && current.endsWith(r.href));
                    return (
                      <Flex key={r.id} align="center" gap={1}>
                        <Card
                          as="button"
                          flex={1}
                          padding={2}
                          radius={2}
                          tone={active ? 'primary' : 'default'}
                          pressed={active}
                          style={{
                            cursor: 'pointer',
                            textAlign: 'left',
                            minWidth: 0,
                            // Archived rows stay readable but visibly set aside.
                            opacity: r.archived ? 0.6 : 1,
                          }}
                          onClick={() => go(r.href, r.type, r.id)}
                        >
                          <Flex align="center" gap={2}>
                            <Text
                              size={1}
                              weight={active ? 'semibold' : 'regular'}
                              textOverflow="ellipsis"
                              style={{ flex: 1, minWidth: 0 }}
                            >
                              {r.label}
                            </Text>
                            <StatusDot row={r} />
                          </Flex>
                        </Card>
                        {/* Outside the row button for the same reason as the
                            live link below: no nested interactive elements. */}
                        <Button
                          mode="bleed"
                          padding={2}
                          icon={ShareIcon}
                          disabled={sharing}
                          onClick={() => void share(r.href, r.label)}
                          title={`Copy a link that shows this page's draft to someone without a Sanity login. ${SHARE_LINK_TTL_PHRASE}`}
                          aria-label={`Copy a draft share link for ${r.label}`}
                        />
                        {r.liveHref && (
                          /* Outside the row button: a button may not nest a
                             link. Opens the REAL page in a new tab. */
                          <Button
                            as="a"
                            href={r.liveHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            mode="bleed"
                            padding={2}
                            icon={LaunchIcon}
                            title={`Open the live page (${r.liveHref})`}
                            aria-label={`Open the live page for ${r.label}`}
                          />
                        )}
                        {/* Page verbs. Only custom pages: a singleton is
                            one-per-site, so copying or archiving one would
                            leave the site with a route and no document. */}
                        {r.type === 'page' && (
                          <MenuButton
                            id={`page-ops-${r.id}`}
                            button={
                              <Button
                                mode="bleed"
                                padding={2}
                                icon={EllipsisVerticalIcon}
                                disabled={busyId === r.id}
                                title="Copy or archive this page"
                                aria-label={`More actions for ${r.label}`}
                              />
                            }
                            menu={
                              <Menu>
                                <MenuItem
                                  icon={CopyIcon}
                                  text="Duplicate"
                                  onClick={() => void duplicateRow(r)}
                                />
                                {r.archived ? (
                                  <MenuItem
                                    icon={RestoreIcon}
                                    text="Restore"
                                    tone="positive"
                                    onClick={() => void archiveRow(r, false)}
                                  />
                                ) : (
                                  <MenuItem
                                    icon={ArchiveIcon}
                                    text="Archive"
                                    tone="caution"
                                    onClick={() => void archiveRow(r, true)}
                                  />
                                )}
                              </Menu>
                            }
                            popover={{ portal: true, placement: 'bottom-end' }}
                          />
                        )}
                      </Flex>
                    );
                  })}
                </Stack>
              </Stack>
            ))
          )}
          <Button
            icon={AddIcon}
            text="New page"
            mode="ghost"
            tone="primary"
            disabled={creating}
            onClick={() => void createPage()}
          />

          {/* Saved sections - closed by default, so the page list stays the
              thing this panel is about. */}
          <Stack space={2}>
            <Button
              mode="bleed"
              padding={2}
              justify="flex-start"
              onClick={() => setPresetsOpen((v) => !v)}
              text={`${presetsOpen ? '▾' : '▸'} Saved sections${
                presets?.length ? ` (${presets.length})` : ''
              }`}
              aria-expanded={presetsOpen}
              title="Sections you kept from another page, ready to add to this one."
            />
            {presetsOpen && (
              <Stack space={2}>
                {!presets || presets.length === 0 ? (
                  <Text size={1} muted>
                    None yet. Open a page, then use "Save a section as preset..." in its publish
                    menu to keep one here.
                  </Text>
                ) : (
                  <>
                    {presets.length > PRESET_SOFT_CAP && (
                      <Text size={1} muted>
                        That is a lot of saved sections. Deleting the ones nobody uses makes this
                        list findable again.
                      </Text>
                    )}
                    {!currentField && (
                      <Text size={1} muted>
                        {currentRow
                          ? 'This page does not build itself from sections, so a saved section cannot go on it.'
                          : 'Open a page first, then add one to it.'}
                      </Text>
                    )}
                    {presets.map((p) => (
                      <Flex key={p.id} align="center" gap={1}>
                        <Card
                          as="button"
                          flex={1}
                          padding={2}
                          radius={2}
                          style={{ cursor: 'pointer', textAlign: 'left', minWidth: 0 }}
                          onClick={() =>
                            navigate(current || '/preview', { type: 'sectionPreset', id: p.id })
                          }
                          title={`Open "${p.title}" to change it`}
                        >
                          <Stack space={1}>
                            <Text size={1} textOverflow="ellipsis">
                              {p.title}
                            </Text>
                            {p.sectionType && (
                              <Text size={0} muted textOverflow="ellipsis">
                                {sectionLabel(p.sectionType)}
                              </Text>
                            )}
                          </Stack>
                        </Card>
                        <Button
                          mode="ghost"
                          padding={2}
                          icon={AddIcon}
                          disabled={!currentField || !p.section || busyId === p.id}
                          title={
                            !p.section
                              ? 'This saved section is empty. Open it and put a section in it.'
                              : currentField
                                ? `Add "${p.title}" to ${currentRow?.label}`
                                : 'Open a page first, then add it.'
                          }
                          aria-label={
                            currentField
                              ? `Add ${p.title} to ${currentRow?.label}`
                              : `Add ${p.title}`
                          }
                          onClick={() => void addPreset(p)}
                        />
                      </Flex>
                    ))}
                  </>
                )}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Box>
      {/* Pinned under the page list so "edit the settings" never needs a trip
          back to the Structure tool. */}
      <Box padding={3} style={{ borderTop: '1px solid var(--card-border-color, #e2e8f0)' }}>
        <Stack space={1}>
          <Card
            as="button"
            padding={2}
            radius={2}
            style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
            onClick={() =>
              navigate(current || '/preview', { type: 'siteSettings', id: 'siteSettings' })
            }
          >
            <Text size={1}>Site settings</Text>
          </Card>
        </Stack>
      </Box>
    </Flex>
  );
}

// Foundation, edit with care
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import { usePresentationNavigate, usePresentationParams } from 'sanity/presentation';
import { Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import { AddIcon, LaunchIcon, ShareIcon } from '@sanity/icons';
import { SINGLETON_PREVIEW_PATHS } from '../resolve';
import { SHARE_LINK_TTL_PHRASE, useShareDraftLink } from './shareDraftLink';

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
//  - Site settings pinned at the bottom.
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

interface NavRow {
  id: string;
  type: string;
  label: string;
  href: string;
  liveHref?: string;
  hasDraft: boolean;
  hasPublished: boolean;
  group: 'Main pages' | 'Custom pages';
}

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
    client.fetch<{ _id: string; _type: string; title?: string; slug?: { current?: string } }[]>(
      '*[_type == "page"]{ _id, _type, title, slug }',
    ),
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
    group: 'Main pages',
  }));

  for (const [id, { doc, draft, published }] of collapse(pages)) {
    const slug = doc.slug?.current;
    if (!slug) continue;
    rows.push({
      id,
      type: 'page',
      label: doc.title || slug,
      href: `/preview/${slug}`,
      liveHref: published ? `/${slug}` : undefined,
      hasDraft: draft,
      hasPublished: published,
      group: 'Custom pages',
    });
  }
  return rows;
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
  const [creating, setCreating] = useState(false);
  const { share, sharing } = useShareDraftLink();

  const refetch = useCallback(() => {
    fetchRows(client)
      .then(setRows)
      .catch(() => setRows([]));
  }, [client]);

  useEffect(() => {
    refetch();
    // Live refresh: any page mutation (rename, publish, new page) triggers a
    // refetch after a short settle. visibility:'query' waits until it is
    // actually queryable.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = client
      .listen('*[_type == "page"]', {}, { visibility: 'query', events: ['mutation'] })
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

  // STICKY navigation (2026-08-28, editor feedback on presacademy): every
  // preview page change is a full document load, and Presentation can only
  // hand the iframe its next URL once the NEW page's visual-editing script
  // has reconnected. A click that lands inside that window (an editor
  // moving quickly through the page list) is silently dropped. So a click
  // records its intent and an effect re-issues navigate() every 750ms
  // until params.preview reports the requested path (or ~6s pass). When
  // the first navigate lands immediately, `current` matches at once and no
  // retry ever fires. `pending` also drives the row highlight, so the list
  // responds to the click instantly instead of after the page load.
  const [pending, setPending] = useState<{ href: string; type: string; id: string } | null>(null);
  const go = useCallback(
    (href: string, type: string, id: string) => {
      setPending({ href, type, id });
      navigate(href, { type, id });
    },
    [navigate],
  );
  useEffect(() => {
    if (!pending) return;
    if (current === pending.href) {
      setPending(null);
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > 8) {
        clearInterval(timer);
        setPending(null);
        return;
      }
      navigate(pending.href, { type: pending.type, id: pending.id });
    }, 750);
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

  const grouped = useMemo(() => {
    if (!rows) return null;
    return (['Main pages', 'Custom pages'] as const)
      .map((g) => ({ title: g, rows: rows.filter((r) => r.group === g) }))
      .filter((g) => g.rows.length > 0);
  }, [rows]);

  return (
    <Flex direction="column" style={{ height: '100%' }}>
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
                          style={{ cursor: 'pointer', textAlign: 'left', minWidth: 0 }}
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

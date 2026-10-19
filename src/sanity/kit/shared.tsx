// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Studio kit: small shared pieces (links, staff view, heading, checkup hook)
// =============================================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useClient, useCurrentUser, useSchema, useWorkspace } from 'sanity';
import { useRouter } from 'sanity/router';
import { Box, Flex, Heading, Text } from '@sanity/ui';
import {
  isStaffView,
  readOverride,
  studioTargetPath,
  VIEW_KEY,
  WEEK_TYPE,
  type DeployAnswer,
  type StudioTarget,
  type ViewOverride,
} from '../../lib/studio-kit';
import {
  CHECKUP_QUERY,
  defaultNameOf,
  runCheckup,
  type CheckResult,
  type Doc,
  type SiteFiles,
} from '../../lib/studio-checkup';
import type { KitConfig } from './types';
import { signInNote } from '../../lib/studio-signin';

export const API_VERSION = '2025-02-19';

// -----------------------------------------------------------------------------
// Links that go through the router
// -----------------------------------------------------------------------------
// THE ROUTING RULE, which cost WCP a real bug: the deployed embedded Studio is
// HASH-routed, so a plain <a href="/studio/structure/..."> leaves the Studio
// and 404s. The click goes through the router; the href is still a best-effort
// real URL so a middle-click or open-in-new-tab works.

export function useStudioLink() {
  const router = useRouter();
  const { basePath } = useWorkspace();
  return useCallback(
    (target: StudioTarget) => {
      const path = studioTargetPath(basePath, target);
      const isHashRouted = typeof window !== 'undefined' && window.location.hash.startsWith('#/');
      const href = isHashRouted ? `${window.location.pathname}#${path}` : path;
      return {
        href,
        onClick: (event: { preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean }) => {
          if (event.metaKey || event.ctrlKey) return;
          event.preventDefault();
          router.navigateUrl({ path });
        },
      };
    },
    [router, basePath],
  );
}

// -----------------------------------------------------------------------------
// The staff view
// -----------------------------------------------------------------------------

/** sessionStorage, or null where the browser blocks it. */
export function tabStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Is the staff view on for this person in this tab? (Non-hook: config reducers use it.) */
export function staffViewFor(
  user: Parameters<typeof isStaffView>[0],
  config: Pick<KitConfig, 'staff'>,
): boolean {
  return isStaffView(user, config.staff, readOverride(tabStorage()));
}

export function useStaffView(config: Pick<KitConfig, 'staff'>) {
  const user = useCurrentUser();
  const override = readOverride(tabStorage());
  return {
    staffView: isStaffView(user, config.staff, override),
    overridden: override !== null,
    /** Switch for this tab and reload, so tools and menus are rebuilt. */
    switchTo: (view: Exclude<ViewOverride, null>) => {
      try {
        tabStorage()?.setItem(VIEW_KEY, view);
      } catch {
        /* storage blocked: nothing to remember the choice with */
      }
      window.location.reload();
    },
    /** Forget the tab's choice and go back to the account's own view. */
    reset: () => {
      try {
        tabStorage()?.removeItem(VIEW_KEY);
      } catch {
        /* nothing stored */
      }
      window.location.reload();
    },
  };
}

/** The slice of a structure ListBuilder the staff filter needs (duck-typed). */
interface DeskList {
  getItems(): unknown[] | undefined;
  items(items: never[]): DeskList;
}
const isDeskList = (v: unknown): v is DeskList =>
  Boolean(v) && typeof (v as DeskList).getItems === 'function';

/**
 * The desk as staff see it: every item whose id is in staffHiddenPanes is
 * removed, at any depth of nested lists. Ids, not titles, so a reworded title
 * cannot quietly bring one back. Everyone else gets the desk unchanged.
 */
export function staffDesk<T>(
  desk: T,
  context: { currentUser?: Parameters<typeof isStaffView>[0] },
  config: Pick<KitConfig, 'staff' | 'staffHiddenPanes'>,
): T {
  if (!config.staffHiddenPanes.length || !staffViewFor(context.currentUser, config)) return desk;
  const hidden = new Set(config.staffHiddenPanes);
  const prune = (list: DeskList): DeskList =>
    list.items(
      (list.getItems() ?? [])
        .filter((item) => {
          const id = (item as { getId?: () => string | undefined }).getId?.();
          return !(id && hidden.has(id));
        })
        .map((item) => {
          const li = item as { getChild?: () => unknown; child?: (c: unknown) => unknown };
          const child = li.getChild?.();
          return isDeskList(child) && li.child ? li.child(prune(child)) : item;
        }) as never[],
    );
  return isDeskList(desk) ? (prune(desk) as T) : desk;
}

// -----------------------------------------------------------------------------
// The one heading for every kit tool, so they read as a family
// -----------------------------------------------------------------------------

export function ToolHeading({
  icon: Icon,
  children,
  lead,
}: {
  icon: ComponentType;
  children: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <Box>
      <Flex align="center" gap={3}>
        <Flex
          aria-hidden
          align="center"
          justify="center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            flexShrink: 0,
            fontSize: 26,
            background: 'var(--card-badge-default-bg-color, rgba(127,127,127,0.12))',
            color: 'var(--card-fg-color)',
          }}
        >
          <Icon />
        </Flex>
        <Heading as="h1" size={4}>
          {children}
        </Heading>
      </Flex>
      {lead && (
        <Box marginTop={4}>
          <Text size={3} muted style={{ lineHeight: 1.6 }}>
            {lead}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// -----------------------------------------------------------------------------
// The checkup, shared by the Checkup tool and Home's "Site health" card
// -----------------------------------------------------------------------------

export function useTypeTitle() {
  const schema = useSchema();
  return useCallback(
    (type: string) => {
      const t = schema.get(type)?.title;
      return typeof t === 'string' && t ? t : type;
    },
    [schema],
  );
}

/** One site file as text; null on a 404 (or an HTML page), undefined when unreachable. */
async function readSiteFile(path: string): Promise<string | null | undefined> {
  try {
    const r = await fetch(path, { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) return undefined;
    const type = r.headers.get('Content-Type') ?? '';
    // A site without the file can answer with its HTML 404 page and a 200.
    return type.includes('text/html') ? null : await r.text();
  } catch {
    return undefined;
  }
}

/**
 * The files the Checkup's llms rules read (card 123), from the site serving
 * this Studio. Undefined values mean "could not tell", and the rules stay quiet.
 */
export async function readSiteFiles(): Promise<SiteFiles> {
  const [llmsTxt, llmsFull] = await Promise.all([
    readSiteFile('/llms.txt'),
    readSiteFile('/llms-full.txt'),
  ]);
  return { llmsTxt, llmsFull };
}

export function useCheckup(config: KitConfig) {
  const client = useClient({ apiVersion: API_VERSION });
  const typeTitle = useTypeTitle();
  const nameOf = useMemo(() => defaultNameOf(typeTitle), [typeTitle]);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      // The kit's weekly tick documents (card 111) are bookkeeping, never content.
      const ignore = new Set([...config.checkup.ignoreTypes, WEEK_TYPE]);
      const [all, site] = await Promise.all([client.fetch<Doc[]>(CHECKUP_QUERY), readSiteFiles()]);
      const docs = (all ?? []).filter((d) => !ignore.has(d._type));
      setResults(runCheckup(docs, config.checkup.rules, { nameOf, typeTitle, site }));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [client, config, nameOf, typeTitle]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void run();
    });
    return () => {
      cancelled = true;
    };
  }, [run]);

  return { results, failed, busy, run };
}

/** Fired to replay the first-run tour (Home's "Take the tour again"). */
export const TOUR_OPEN_EVENT = 'ncs-studio-kit-tour-open';

// -----------------------------------------------------------------------------
// "Is it live?" data, shared by Home's card and the navbar line (card 110)
// -----------------------------------------------------------------------------

/** Fired once a Publish has landed (publishNote, Home's Publish), so the live line re-checks. */
export const PUBLISHED_EVENT = 'ncs-studio-kit-published';

// The kit's weekly tick documents (card 111) are written straight to the
// dataset; they are bookkeeping, not a change to the website, so they never
// count as "the newest publish".
const NOT_SYSTEM_DOCS = `!(_type match "sanity.*") && !(_type match "system.*") && !(_type match "media.*") && !(_id in path("versions.**")) && !(_id match "_.**") && _type != "${WEEK_TYPE}"`;

/** Where the kit asks whether the last deploy went through (card 111). */
export const DEPLOY_STATUS_PATH = '/api/studio/deploy-status/';

/** Fired to make every useLiveData re-read now (after "Try again"). */
export const LIVE_REFRESH_EVENT = 'ncs-studio-kit-live-refresh';

export interface LiveData {
  builtAt: string | null;
  lastPublish: string | null;
  /** The deploy route's answer (card 111); null where the site has no route. */
  deploy: DeployAnswer | null;
  /** When the two were read, for the countdown. */
  now: number;
}

/** GET the deploy route; anything but a well-formed answer is null (old behaviour). */
async function readDeploy(): Promise<DeployAnswer | null> {
  try {
    const r = await fetch(DEPLOY_STATUS_PATH, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = (await r.json()) as Partial<DeployAnswer>;
    return typeof j.configured === 'boolean' && typeof j.state === 'string'
      ? { configured: j.configured, state: j.state }
      : null;
  } catch {
    return null;
  }
}

/**
 * The build time (/build-info.json) and the newest published change, read on
 * mount, every minute, when the tab regains focus, and a few seconds after a
 * Publish lands. Null until the first read.
 */
export function useLiveData(): LiveData | null {
  const client = useClient({ apiVersion: API_VERSION });
  const [data, setData] = useState<LiveData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const builtAt = await fetch('/build-info.json', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { builtAt?: string } | null) => j?.builtAt ?? null)
        .catch(() => null);
      const [lastPublish, deploy] = await Promise.all([
        client
          .fetch<string | null>(
            `*[${NOT_SYSTEM_DOCS} && !(_id in path("drafts.**"))] | order(_updatedAt desc)[0]._updatedAt`,
          )
          .catch(() => null),
        readDeploy(),
      ]);
      if (!cancelled) setData({ builtAt, lastPublish, deploy, now: Date.now() });
    };
    let soon: number | undefined;
    const afterPublish = () => {
      window.clearTimeout(soon);
      soon = window.setTimeout(() => void load(), 4000);
    };
    const onFocus = () => void load();
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    window.addEventListener('focus', onFocus);
    window.addEventListener(PUBLISHED_EVENT, afterPublish);
    window.addEventListener(LIVE_REFRESH_EVENT, onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearTimeout(soon);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(PUBLISHED_EVENT, afterPublish);
      window.removeEventListener(LIVE_REFRESH_EVENT, onFocus);
    };
  }, [client]);

  return data;
}

// -----------------------------------------------------------------------------
// "Try again" (card 111)
// -----------------------------------------------------------------------------
// POSTs to the deploy route with the Studio's own session token, which the
// route checks with Sanity (src/lib/studio-auth.ts). The signed-in embedded
// Studio keeps that token in localStorage under __studio_auth_token_<projectId>
// (the step 0 spike in docs/agent/studio-kit.md); the client's config carries
// it too when it is set. A cookie-only login has no token, so the route answers
// 401 and the editor is told, in plain words, to sign out and in once (card 129;
// sanity.config.ts sets auth.loginMethod 'token' so that switch is one time).

export function studioToken(client: { config: () => { token?: string; projectId?: string } }) {
  const cfg = client.config();
  if (cfg.token) return cfg.token;
  try {
    const raw = window.localStorage.getItem(`__studio_auth_token_${cfg.projectId}`);
    const parsed = raw ? (JSON.parse(raw) as { token?: string }) : null;
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

export function useTryAgain() {
  const client = useClient({ apiVersion: API_VERSION });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const tryAgain = useCallback(async () => {
    setBusy(true);
    setNote(null);
    try {
      const token = studioToken(client);
      const r = await fetch(DEPLOY_STATUS_PATH, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      setNote(
        r.ok && j.ok
          ? 'Trying again now. The website usually updates within a few minutes.'
          : signInNote(
              Boolean(token),
              r.status,
              j.error,
              'That did not work just now. Ask for help if it keeps happening.',
            ),
      );
    } catch {
      setNote('That did not work just now. Ask for help if it keeps happening.');
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event(LIVE_REFRESH_EVENT));
    }
  }, [client]);

  return { tryAgain, busy, note };
}

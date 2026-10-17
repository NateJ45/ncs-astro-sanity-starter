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
  type StudioTarget,
  type ViewOverride,
} from '../../lib/studio-kit';
import {
  CHECKUP_QUERY,
  defaultNameOf,
  runCheckup,
  type CheckResult,
  type Doc,
} from '../../lib/studio-checkup';
import type { KitConfig } from './types';

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
      const ignore = new Set(config.checkup.ignoreTypes);
      const docs = ((await client.fetch<Doc[]>(CHECKUP_QUERY)) ?? []).filter(
        (d) => !ignore.has(d._type),
      );
      setResults(runCheckup(docs, config.checkup.rules, { nameOf, typeTitle }));
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

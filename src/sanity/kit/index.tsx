// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// ncsStudioKit(): the WordPress staff admin, rebuilt for Sanity (2026-10-17)
// =============================================================================
// One plugin, added LAST in sanity.config.ts's plugins (its tools reducer has
// to see every other plugin's tools). Everything site-specific comes in
// through `config` from src/sanity/kit.config.ts; nothing in this folder names
// a site, a person or a document type, so the folder can go back to
// ncs-astro-sanity-starter as-is. Detail: docs/agent/studio-kit.md.
//
// What it adds:
//   - Tools: Home (first, so the Studio opens on it), Site Guide, Checkup.
//   - Plain tool names and order ("Content", "Live preview").
//   - The staff view: listed accounts (or non-administrators) see only the
//     staff tools, the staff desk, and no permanent Delete. A tab can switch
//     either way from Home ("Show the full Studio" / "See the staff view").
//   - Trash instead of Delete on everyday lists, with a Trash type.
//   - A note after Publish, and the first-run tour (via the layout).
//   - The calm status line under the top bar and the "Help for this page"
//     document panel (PORTS.md card 110).
//   - Card 111: the weekly tick document (Home's hand-ticked jobs), the Quick
//     update tool (kitConfig.quickUpdate) and plain words in empty lists
//     (EMPTY_LIST_BUNDLE; emptyAwareList() is for structure.ts).
// =============================================================================

import { definePlugin, type LayoutProps } from 'sanity';
import { ActivityIcon } from '@sanity/icons/Activity';
import { BoltIcon } from '@sanity/icons/Bolt';
import { BookIcon } from '@sanity/icons/Book';
import { HomeIcon } from '@sanity/icons/Home';
import { WEEK_TYPE } from '../../lib/studio-kit';
import { TRASH_TYPE } from '../../lib/studio-trash';
import { makeCheckupTool } from './CheckupTool';
import { EMPTY_LIST_BUNDLE } from './emptyList';
import { makeGuideTool } from './GuideTool';
import { makeHelpPanel } from './HelpPanel';
import { makeHomeTool } from './HomeTool';
import { makeNavbarStatus } from './NavbarStatus';
import { withPublishNote } from './publishNote';
import { makeQuickUpdateTool } from './QuickUpdateTool';
import { staffViewFor, useStaffView } from './shared';
import { StudioTour } from './StudioTour';
import {
  DeleteForeverAction,
  makeMoveToTrashAction,
  RestoreAction,
  trashedItemType,
} from './trash';
import type { KitConfig } from './types';
import { studioWeekType } from './weekType';

export type { KitConfig } from './types';
export { staffViewFor } from './shared';
export { emptyAwareList } from './emptyList';

/**
 * Two things the tools list cannot remove, hidden by CSS in the staff view:
 *   - the perspective menu ("Drafts" / "Published"): switching it to
 *     Published hides the editor's own unpublished changes and looks like
 *     lost work (mas-monograms, 2026-10-05);
 *   - the Releases link, which sanity 6.19 draws beside the tools rather than
 *     as one of them (checked 2026-10-17: an <a href="/releases">).
 * If a Sanity upgrade renames either hook the item simply comes back; nothing
 * breaks.
 */
const STAFF_CSS = [
  '[data-ui="ReleasesNav"] { display: none !important; }',
  '[data-ui="Button"][href$="/releases"] { display: none !important; }',
].join(' ');

function rank(order: string[], name: string): number {
  const i = order.indexOf(name);
  return i === -1 ? order.length : i;
}

export function ncsStudioKit(config: KitConfig) {
  const HomeTool = makeHomeTool(config);
  const GuideTool = makeGuideTool(config);
  const CheckupTool = makeCheckupTool(config);
  const QuickUpdateTool = config.quickUpdate?.length ? makeQuickUpdateTool(config) : null;
  const MoveToTrash = makeMoveToTrashAction(config.trashTypes, config.helper.name);
  const trashTypes = new Set(Object.keys(config.trashTypes));
  // Card 110 features: on unless kit.config.ts turns them off.
  const KitNavbar = config.features.navbarStatus === false ? undefined : makeNavbarStatus(config);
  const helpPanel = config.features.helpPanel === false ? null : makeHelpPanel(config);

  function KitLayout(props: LayoutProps) {
    const { staffView } = useStaffView(config);
    return (
      <>
        {staffView && <style>{STAFF_CSS}</style>}
        {props.renderDefault(props)}
        {config.features.tour && <StudioTour steps={config.tourSteps} />}
      </>
    );
  }

  return definePlugin({
    name: 'ncs-studio-kit',

    schema: {
      // The weekly tick document is always registered (card 111): Home reads it
      // whenever a "This week" job is ticked by hand.
      types: config.features.trash ? [trashedItemType, studioWeekType] : [studioWeekType],
    },

    // Plain words in an empty desk list (card 111).
    ...(config.features.emptyStates === false ? {} : { i18n: { bundles: [EMPTY_LIST_BUNDLE] } }),

    studio: {
      components: { layout: KitLayout, ...(KitNavbar ? { navbar: KitNavbar } : {}) },
    },

    tools: (prev, { currentUser }) => {
      const kitTools = [
        config.features.home && {
          name: 'home',
          title: 'Home',
          icon: HomeIcon,
          component: HomeTool,
        },
        config.features.guide && {
          name: 'site-guide',
          title: 'Site Guide',
          icon: BookIcon,
          component: GuideTool,
        },
        config.features.checkup && {
          name: 'checkup',
          title: 'Checkup',
          icon: ActivityIcon,
          component: CheckupTool,
        },
        QuickUpdateTool && {
          name: 'quick-update',
          title: 'Quick update',
          icon: BoltIcon,
          component: QuickUpdateTool,
        },
      ].filter((t): t is Exclude<typeof t, false | null> => Boolean(t));

      const all = [...kitTools, ...prev.filter((t) => !kitTools.some((k) => k.name === t.name))]
        .map((t) => (config.toolTitles[t.name] ? { ...t, title: config.toolTitles[t.name] } : t))
        .sort((a, b) => rank(config.toolOrder, a.name) - rank(config.toolOrder, b.name));

      if (!staffViewFor(currentUser, config)) return all;
      return all
        .filter((t) => config.staffTools.includes(t.name))
        .sort((a, b) => rank(config.staffTools, a.name) - rank(config.staffTools, b.name));
    },

    document: {
      newDocumentOptions: (prev) =>
        prev.filter((o) => o.templateId !== TRASH_TYPE && o.templateId !== WEEK_TYPE),

      // "Help for this page" beside every document but the Trash (card 110).
      inspectors: (prev, { documentType }) =>
        helpPanel && documentType !== TRASH_TYPE && documentType !== WEEK_TYPE
          ? [...prev, helpPanel]
          : prev,

      actions: (prev, { schemaType, currentUser }) => {
        const staff = staffViewFor(currentUser, config);

        // The Trash itself: bring it back, or (administrators, full view) delete forever.
        if (schemaType === TRASH_TYPE) {
          return staff ? [RestoreAction] : [RestoreAction, DeleteForeverAction];
        }

        let actions = config.features.publishNote
          ? prev.map((a) => (a.action === 'publish' ? withPublishNote(a) : a))
          : prev;

        if (config.features.trash && trashTypes.has(schemaType)) {
          // Staff lose the permanent Delete; everyone gets Move to Trash.
          if (staff) actions = actions.filter((a) => a.action !== 'delete');
          actions = [...actions, MoveToTrash];
        } else if (staff) {
          // No permanent deletes anywhere in the staff view. Pages keep their
          // own Archive (pageActions.tsx), which can be undone.
          actions = actions.filter((a) => a.action !== 'delete');
        }
        return actions;
      },
    },
  })();
}

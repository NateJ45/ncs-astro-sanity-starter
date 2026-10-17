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
// =============================================================================

import { definePlugin, type LayoutProps } from 'sanity';
import { ActivityIcon } from '@sanity/icons/Activity';
import { BookIcon } from '@sanity/icons/Book';
import { HomeIcon } from '@sanity/icons/Home';
import { TRASH_TYPE } from '../../lib/studio-trash';
import { makeCheckupTool } from './CheckupTool';
import { makeGuideTool } from './GuideTool';
import { makeHomeTool } from './HomeTool';
import { withPublishNote } from './publishNote';
import { staffViewFor, useStaffView } from './shared';
import { StudioTour } from './StudioTour';
import {
  DeleteForeverAction,
  makeMoveToTrashAction,
  RestoreAction,
  trashedItemType,
} from './trash';
import type { KitConfig } from './types';

export type { KitConfig } from './types';
export { staffViewFor } from './shared';

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
  const MoveToTrash = makeMoveToTrashAction(config.trashTypes, config.helper.name);
  const trashTypes = new Set(Object.keys(config.trashTypes));

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
      types: config.features.trash ? [trashedItemType] : [],
    },

    studio: {
      components: { layout: KitLayout },
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
      ].filter((t): t is Exclude<typeof t, false> => Boolean(t));

      const all = [...kitTools, ...prev.filter((t) => !kitTools.some((k) => k.name === t.name))]
        .map((t) => (config.toolTitles[t.name] ? { ...t, title: config.toolTitles[t.name] } : t))
        .sort((a, b) => rank(config.toolOrder, a.name) - rank(config.toolOrder, b.name));

      if (!staffViewFor(currentUser, config)) return all;
      return all
        .filter((t) => config.staffTools.includes(t.name))
        .sort((a, b) => rank(config.staffTools, a.name) - rank(config.staffTools, b.name));
    },

    document: {
      newDocumentOptions: (prev) => prev.filter((o) => o.templateId !== TRASH_TYPE),

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

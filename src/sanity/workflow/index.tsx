// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// ncsWorkflowTools - the Studio's safety-net and workflow tools (PORTS.md card 117)
// =============================================================================
// One plugin for the pieces that sit beside the Studio kit:
//   - "Share a preview": a private draft link that expires (SharePreviewAction).
//   - "Messages": the form inbox (MessagesTool, /api/studio/messages/).
//   - the previewShare record type both of the above need registered.
// The table panes are desk items, not a tool: structure.ts adds them with
// tableListItem() below from the site's src/sanity/tables.config.ts.
// The morning change note is a GitHub workflow, not Studio code
// (.github/workflows/change-note.yml).
//
// Register it BEFORE ncsStudioKit in sanity.config.ts, so the kit's tool order
// and staff view (kit.config.ts `toolOrder` / `staffTools`) also place
// "messages".
// =============================================================================
import { definePlugin } from 'sanity';
import type { StructureBuilder } from 'sanity/structure';
import { EnvelopeIcon } from '@sanity/icons/Envelope';
import { ThListIcon } from '@sanity/icons/ThList';
import { SHARE_RECORD_TYPE } from '../../lib/preview-share';
import type { TableConfig } from '../../lib/studio-table';
import { makeDocumentTable } from './DocumentTable';
import { MessagesTool } from './MessagesTool';
import { previewShareType } from './previewShareType';
import { makeSharePreviewAction } from './SharePreviewAction';

export interface WorkflowToolsOptions {
  /** Types whose own page the /preview route renders (singletons and `page`). */
  shareTypes: string[];
  /** Show the Messages tool. Default true; it explains itself when forms are off. */
  messages?: boolean;
}

export const ncsWorkflowTools = definePlugin<WorkflowToolsOptions>((options) => {
  const SharePreview = makeSharePreviewAction(new Set(options.shareTypes));
  return {
    name: 'ncs-workflow-tools',
    schema: { types: [previewShareType] },
    tools: (prev) =>
      options.messages === false
        ? prev
        : [
            ...prev,
            { name: 'messages', title: 'Messages', icon: EnvelopeIcon, component: MessagesTool },
          ],
    document: {
      newDocumentOptions: (prev) => prev.filter((o) => o.templateId !== SHARE_RECORD_TYPE),
      actions: (prev, { schemaType }) =>
        options.shareTypes.includes(schemaType) ? [...prev, SharePreview] : prev,
    },
  };
});

// One component per table, made once: the desk structure is re-resolved often,
// and a fresh component each time would remount the pane and lose its sort.
const tableComponents = new Map<string, ReturnType<typeof makeDocumentTable>>();

/** A desk item that opens one table pane. Add it beside the normal list. */
export function tableListItem(S: StructureBuilder, config: TableConfig) {
  let component = tableComponents.get(config.id);
  if (!component) {
    component = makeDocumentTable(config);
    tableComponents.set(config.id, component);
  }
  return S.listItem()
    .id(config.id)
    .title(config.title)
    .icon(ThListIcon)
    .child(S.component(component).id(config.id).title(config.title));
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Empty desk lists that say what goes there (Studio kit, PORTS.md card 111)
// =============================================================================
// Sanity's empty list says "No documents of this type" and nothing else, and it
// cannot be changed per list (checked in sanity 6.19: the empty state is
// internal to the document list pane). Two pieces instead:
//
//   1. emptyAwareList(): a desk item for structure.ts whose child checks the
//      count first. With documents (drafts included) it is the ordinary list,
//      untouched. With none it is a small pane that says what goes in this list
//      and has a "Create the first one" button. The structure tool re-resolves
//      a pane whenever the path to it changes, so after the first document
//      exists, coming back to the list shows the real list.
//   2. EMPTY_LIST_BUNDLE: plain words for the default empty message everywhere
//      else (the plugin adds it unless features.emptyStates is false).
//
// "Create the first one" uses the router's create intent, the same as the
// list's own + button, so initial values and templates still apply.
// =============================================================================

import type { ComponentType, ReactElement } from 'react';
import { defineLocaleResourceBundle } from 'sanity';
import type { ListItemBuilder, StructureBuilder, StructureResolverContext } from 'sanity/structure';
import { useRouter } from 'sanity/router';
import { Box, Button, Card, Stack, Text } from '@sanity/ui';
import { AddIcon } from '@sanity/icons/Add';
import { API_VERSION } from './shared';

/** The default "nothing here" words, for every list emptyAwareList() does not wrap. */
export const EMPTY_LIST_BUNDLE = defineLocaleResourceBundle({
  locale: 'en-US',
  namespace: 'structure',
  resources: {
    'panes.document-list-pane.no-documents-of-type.text':
      'Nothing here yet. Press the + button at the top of this list to create the first one.',
    'panes.document-list-pane.no-matching-documents.text': 'Nothing here yet.',
  },
});

export interface EmptyAwareOptions {
  /** The desk item id (keep the id the item had, so links keep working). */
  id: string;
  title: string;
  /** The document type this list holds. */
  type: string;
  icon?: ComponentType;
  /** One or two sentences: what goes in this list, in the editor's words. */
  explain: string;
  /** The button's words. Default "Create the first one". */
  createLabel?: string;
  /** The list to show once there is something in it. Default: the type's list. */
  list?: (S: StructureBuilder) => ReturnType<StructureBuilder['documentTypeList']>;
}

const panes = new Map<string, () => ReactElement>();

function emptyPane(o: EmptyAwareOptions): () => ReactElement {
  const cached = panes.get(o.id);
  if (cached) return cached;
  function EmptyListPane() {
    const router = useRouter();
    return (
      <Box padding={[4, 4, 5]}>
        <Card padding={[4, 4, 5]} radius={3} border>
          <Stack gap={4}>
            <Text size={3} weight="semibold">
              {`Nothing in ${o.title} yet`}
            </Text>
            <Text size={2} muted style={{ lineHeight: 1.6 }}>
              {o.explain}
            </Text>
            <Box>
              <Button
                icon={AddIcon}
                text={o.createLabel ?? 'Create the first one'}
                tone="primary"
                fontSize={2}
                padding={4}
                onClick={() => router.navigateIntent('create', { type: o.type })}
              />
            </Box>
          </Stack>
        </Card>
      </Box>
    );
  }
  EmptyListPane.displayName = `EmptyListPane(${o.type})`;
  panes.set(o.id, EmptyListPane);
  return EmptyListPane;
}

/**
 * A desk list item that explains itself while it is empty. Use it in
 * structure.ts in place of S.documentTypeListItem(type) or a listItem whose
 * child is S.documentTypeList(type).
 */
export function emptyAwareList(
  S: StructureBuilder,
  context: StructureResolverContext,
  o: EmptyAwareOptions,
): ListItemBuilder {
  const full = () => (o.list ? o.list(S) : S.documentTypeList(o.type).title(o.title));
  const item = S.listItem()
    .id(o.id)
    .title(o.title)
    .schemaType(o.type)
    .child(async () => {
      const count = await context
        .getClient({ apiVersion: API_VERSION })
        // Raw perspective: a list with only an unpublished draft is not empty.
        .fetch<number>('count(*[_type == $type])', { type: o.type }, { perspective: 'raw' })
        .catch(() => 1); // when unsure, show the real list
      return count > 0 ? full() : S.component(emptyPane(o)).id(`${o.id}-empty`).title(o.title);
    });
  return o.icon ? item.icon(o.icon) : item;
}

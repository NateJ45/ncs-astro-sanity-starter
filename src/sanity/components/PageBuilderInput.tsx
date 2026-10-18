// Safe to edit by hand
// =============================================================================
// PageBuilderInput - the sections list, plus "Insert a saved section"
// =============================================================================
// Part of the authoring kit (PORTS.md card 109). Wraps Sanity's own array input
// (drag to reorder, "+ Add item" with the picture grid, everything editors
// already know) and adds one button underneath it: Insert a saved section.
//
// WHY A WRAPPER. The "+ Add item" menu lists block TYPES only; it cannot list
// documents, and a saved section is a document (`sectionPreset`). So the saved
// sections get their own button right below the menu, where an editor building
// a page is already looking.
//
// Each saved section offers two ways in:
//   - "Add a copy": deep copies its sections into the page with fresh `_key`s.
//     The copy is the page's own from then on; editing the saved section later
//     never touches it.
//   - "Add synced": adds ONE synced section that points at it. The page shows
//     whatever the saved section holds today, so editing it once updates every
//     page that uses it. Offered only once the saved section is published,
//     because a page cannot be published while it points at an unpublished one.
//
// A saved section holding a block this list does not accept (a home-page-only
// block, offered on a custom page, say) is shown greyed out with the reason.
//
// The pure parts (reading presets, copying, fit) are in src/lib/authoring.ts
// and tested there; this file is only the dialog.
// =============================================================================

import { useCallback, useState } from 'react';
import { insert, PatchEvent, setIfMissing, useClient, type ArrayOfObjectsInputProps } from 'sanity';
import { Box, Button, Card, Dialog, Flex, Stack, Text } from '@sanity/ui';
import { BlockElementIcon } from '@sanity/icons/BlockElement';
import {
  patternCopies,
  patternsFrom,
  syncedBlockFor,
  typesNotAllowed,
  type Pattern,
  type PatternDoc,
} from '../../lib/authoring';
import { sectionLabel } from '../../lib/page-checks';

const API = { apiVersion: '2025-01-01' } as const;

const describeTypes = (types: string[], count: number) =>
  `${count === 1 ? '1 section' : `${count} sections`}: ${types.map(sectionLabel).join(', ')}`;

export function PageBuilderInput(props: ArrayOfObjectsInputProps) {
  const { onChange, schemaType, readOnly } = props;
  const client = useClient(API);
  const [open, setOpen] = useState(false);
  const [patterns, setPatterns] = useState<Pattern[] | null>(null);
  const [failed, setFailed] = useState(false);

  const allowed = (schemaType.of ?? []).map((t) => t.name);
  const acceptsSynced = allowed.includes('syncedSection');

  const openDialog = useCallback(() => {
    setOpen(true);
    setFailed(false);
    client
      .fetch<PatternDoc[]>('*[_type == "sectionPreset"]{ _id, title, note, section }')
      .then((docs) => setPatterns(patternsFrom(docs ?? [])))
      .catch((err) => {
        console.error('[page-builder] could not load saved sections', err);
        setFailed(true);
        setPatterns([]);
      });
  }, [client]);

  const add = useCallback(
    (items: Record<string, unknown>[]) => {
      onChange(PatchEvent.from([setIfMissing([]), insert(items, 'after', [-1])]));
      setOpen(false);
    },
    [onChange],
  );

  return (
    <Stack gap={3}>
      {props.renderDefault(props)}
      {!readOnly && (
        <Flex>
          <Button
            icon={BlockElementIcon}
            mode="ghost"
            text="Insert a saved section"
            onClick={openDialog}
          />
        </Flex>
      )}
      {open && (
        <Dialog
          id="insert-saved-section"
          header="Insert a saved section"
          width={1}
          onClose={() => setOpen(false)}
          onClickOutside={() => setOpen(false)}
        >
          <Box padding={4}>
            <Stack gap={4}>
              <Text size={1} muted>
                Saved sections are sections (or whole groups of them) kept for reuse. A copy is
                yours to change on this page. A synced one stays the same everywhere: edit the saved
                section and every page using it changes. New ones go at the bottom of the page; drag
                them where you want them.
              </Text>
              {patterns === null && <Text size={1}>Loading your saved sections...</Text>}
              {failed && (
                <Text size={1}>Could not load your saved sections. Please try again.</Text>
              )}
              {patterns?.length === 0 && !failed && (
                <Text size={1}>
                  None yet. Open a page and use "Save a section as preset..." in its publish menu,
                  or make one under Content, then Saved sections.
                </Text>
              )}
              {patterns?.map((p) => {
                const missing = typesNotAllowed(p, allowed);
                const empty = p.sections.length === 0;
                const blocked = missing.length > 0 || empty;
                return (
                  <Card
                    key={p.id}
                    padding={3}
                    radius={2}
                    border
                    tone={blocked ? 'transparent' : 'default'}
                  >
                    <Stack gap={3}>
                      <Stack gap={2}>
                        <Text size={1} weight="semibold">
                          {p.title}
                        </Text>
                        {!empty && (
                          <Text size={1} muted>
                            {describeTypes(p.types, p.sections.length)}
                          </Text>
                        )}
                        {p.note && (
                          <Text size={1} muted>
                            {p.note}
                          </Text>
                        )}
                        {missing.length > 0 && (
                          <Text size={1}>
                            This page cannot hold {missing.map(sectionLabel).join(', ')}, so this
                            one cannot go here.
                          </Text>
                        )}
                        {empty && <Text size={1}>This saved section is empty.</Text>}
                      </Stack>
                      {!blocked && (
                        <Flex gap={2} wrap="wrap">
                          <Button
                            mode="ghost"
                            text="Add a copy"
                            onClick={() => add(patternCopies(p))}
                          />
                          {acceptsSynced && (
                            <Button
                              mode="ghost"
                              text="Add synced"
                              disabled={!p.published}
                              title={
                                p.published
                                  ? 'Stays the same as the saved section, on every page.'
                                  : 'Publish the saved section first, then it can be synced.'
                              }
                              onClick={() => add([syncedBlockFor(p)])}
                            />
                          )}
                        </Flex>
                      )}
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          </Box>
        </Dialog>
      )}
    </Stack>
  );
}

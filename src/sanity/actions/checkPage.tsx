// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { useCallback, useState } from 'react';
import { useClient, type DocumentActionComponent, type DocumentActionProps } from 'sanity';
import { SearchIcon } from '@sanity/icons';
import { Box, Button, Card, Flex, Stack, Text, useToast } from '@sanity/ui';
import { checkPage, countFindings, type CheckGroup } from '../../lib/page-checks';
import { PAGE_CHECK_CONFIG } from '../pageBuilderConfig';
import { readSlug } from '../pageOps';

// =============================================================================
// "Check this page..." - a courtesy read-through before publishing
// =============================================================================
// An editor has no way to ask "did I forget anything?" short of reading the
// whole page again. This runs three cheap checks over the DRAFT and shows what
// it found: photos with no description, sections with nothing typed in them,
// and links to addresses no page seems to own.
//
// IT NEVER BLOCKS PUBLISH, and it is not a validation pass. Sanity's own
// required-field validation already stops genuinely broken content; this is the
// softer layer above it, and every line of copy in the dialog says "worth a
// look" rather than "wrong". A page can be perfectly fine and still be listed.
//
// All the thinking is in src/lib/page-checks.ts (pure, unit tested), shaped for
// this repo by src/sanity/pageBuilderConfig.ts. This file is the shell: fetch
// the page addresses the link check compares against, run the checks, render
// the answer.
// =============================================================================

const API = { apiVersion: '2025-01-01' } as const;

/** Green tick / amber count line for one check. */
function GroupCard({ group }: { group: CheckGroup }) {
  const clear = group.findings.length === 0;
  return (
    <Card padding={3} radius={2} border tone={clear ? 'positive' : 'caution'}>
      <Stack space={3}>
        <Text size={1} weight="semibold">
          {clear
            ? `${group.title}: nothing to flag`
            : `${group.title}: ${group.findings.length} to look at`}
        </Text>
        {!clear && (
          <Stack space={2} as="ul" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {group.findings.map((f, i) => (
              <Text key={`${f.where}-${i}`} size={1} as="li">
                <strong>{f.where}</strong> - {f.detail}
              </Text>
            ))}
          </Stack>
        )}
        <Text size={0} muted>
          {group.note}
        </Text>
      </Stack>
    </Card>
  );
}

export const CheckPageAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const client = useClient(API);
  const toast = useToast();
  const [groups, setGroups] = useState<CheckGroup[] | null>(null);
  const [open, setOpen] = useState(false);

  const doc = props.draft ?? props.published;

  const close = useCallback(() => {
    setOpen(false);
    setGroups(null);
    props.onComplete?.();
  }, [props]);

  const run = useCallback(async () => {
    setOpen(true);
    setGroups(null);
    try {
      // Every custom-page address that exists, so a link to one of them is not
      // reported. Both twins: an address that only exists in a draft is still
      // an address the editor is heading for. `readSlug` accepts either slug
      // shape the family uses (a plain string, or Sanity's slug object).
      const raw = await client.fetch<unknown[]>('*[_type == "page" && defined(slug)].slug');
      const slugs = (raw ?? []).map(readSlug).filter((s): s is string => Boolean(s));
      setGroups(checkPage(doc, PAGE_CHECK_CONFIG, slugs));
    } catch (err) {
      console.error('[check-page] could not read the page list', err);
      toast.push({
        status: 'warning',
        title: 'Checked without the link check',
        description: 'The list of pages could not be read, so links were skipped this time.',
      });
      setGroups(checkPage(doc, PAGE_CHECK_CONFIG).filter((g) => g.id !== 'links'));
    }
  }, [client, doc, toast]);

  const total = groups ? countFindings(groups) : 0;

  return {
    label: 'Check this page...',
    icon: SearchIcon,
    title: 'A quick read-through for missing photo descriptions, empty sections, and odd links.',
    onHandle: () => void run(),
    dialog: open && {
      type: 'dialog' as const,
      header: 'Check this page',
      width: 'medium' as const,
      onClose: close,
      content: (
        <Stack space={4}>
          {groups === null ? (
            <Text size={1} muted>
              Reading the page...
            </Text>
          ) : (
            <>
              <Text size={1}>
                {total === 0
                  ? 'Nothing came up. This page looks ready to publish.'
                  : `${total} thing${total === 1 ? '' : 's'} worth a look. None of this stops you publishing.`}
              </Text>
              {groups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
              <Text size={0} muted>
                This is a courtesy check, not a rule. It reads what you have typed so far, including
                changes you have not published yet, and it can be wrong about any of it.
              </Text>
            </>
          )}
        </Stack>
      ),
      footer: (
        <Box padding={2}>
          <Flex justify="flex-end">
            <Button mode="ghost" text="Close" onClick={close} />
          </Flex>
        </Box>
      ),
    },
  };
};

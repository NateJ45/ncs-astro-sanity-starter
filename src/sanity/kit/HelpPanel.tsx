// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// "Help for this page": a document inspector (Studio kit, PORTS.md card 110)
// =============================================================================
// Opens from the document's own menu (and its footer button) and sits beside
// the form, like Sanity's History panel. It shows:
//   1. What to look at: the page check (config.pageCheck, the same three
//      checks as "Check this page...") over the DRAFT, re-run as the editor
//      types, plus anything the Checkup found on this document.
//   2. How to do it: the Site Guide entries for this document type
//      (config.guide.forType, '*' as the fallback), rendered by the site's
//      own GuideView, so the guide text has one home.
//
// READ-ONLY: it never writes to the document. Inspector props changed between
// Sanity majors, so this uses only documentId, documentType and onClose.
// =============================================================================

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  defineDocumentInspector,
  useClient,
  useEditState,
  type DocumentInspectorProps,
} from 'sanity';
import { CloseIcon } from '@sanity/icons/Close';
import { HelpCircleIcon } from '@sanity/icons/HelpCircle';
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import type { CheckGroup } from '../../lib/page-checks';
import { publishedIdOf } from '../../lib/studio-checkup';
import { SEVERITY_TONE } from './CheckupTool';
import { API_VERSION, useCheckup, useStudioLink } from './shared';
import type { KitConfig } from './types';

export const HELP_PANEL_NAME = 'ncs-help';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap={3}>
      <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase' }}>
        {title}
      </Text>
      {children}
    </Stack>
  );
}

function PageCheck({
  config,
  documentId,
  documentType,
}: {
  config: KitConfig;
  documentId: string;
  documentType: string;
}) {
  const client = useClient({ apiVersion: API_VERSION });
  const { draft, published } = useEditState(publishedIdOf(documentId), documentType);
  const doc = draft ?? published;
  const [groups, setGroups] = useState<CheckGroup[] | null>(null);
  const check = config.pageCheck;

  // Re-run a moment after the editor stops typing, never on every keystroke.
  useEffect(() => {
    if (!check || !doc) return undefined;
    const timer = window.setTimeout(() => {
      check
        .run(doc, client)
        .then(setGroups)
        .catch(() => setGroups([]));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [check, doc, client]);

  if (!check || !check.types.includes(documentType)) return null;
  if (!groups) return <Spinner muted />;
  return (
    <Stack gap={2}>
      {groups.map((g) => {
        const clear = g.findings.length === 0;
        return (
          <Card key={g.id} padding={3} radius={2} tone={clear ? 'positive' : 'caution'} border>
            <Stack gap={3}>
              <Text size={1} weight="semibold">
                {clear
                  ? `${g.title}: nothing to flag`
                  : `${g.title}: ${g.findings.length} to look at`}
              </Text>
              {g.findings.map((f, i) => (
                <Text key={`${f.where}-${i}`} size={1} muted>
                  <strong>{f.where}</strong>: {f.detail}
                </Text>
              ))}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

function CheckupFindings({ config, documentId }: { config: KitConfig; documentId: string }) {
  const { results, failed } = useCheckup(config);
  const linkTo = useStudioLink();
  const id = publishedIdOf(documentId);
  const mine = (results ?? []).filter((r) => r.target && 'doc' in r.target && r.target.doc === id);
  if (failed)
    return (
      <Text size={1} muted>
        The Checkup could not run just now.
      </Text>
    );
  if (!results) return <Spinner muted />;
  if (mine.length === 0) {
    return (
      <Text size={1} muted style={{ lineHeight: 1.6 }}>
        The Checkup found nothing on this one.
      </Text>
    );
  }
  const checkup = linkTo({ tool: 'checkup' });
  return (
    <Stack gap={2}>
      {mine.map((r) => (
        <Card key={r.id} padding={3} radius={2} border>
          <Stack gap={3}>
            <Flex>
              <Badge tone={SEVERITY_TONE[r.severity]} fontSize={0} padding={2}>
                {r.severity}
              </Badge>
            </Flex>
            <Text size={1} weight="semibold">
              {r.label}
            </Text>
            <Text size={1} muted style={{ lineHeight: 1.5 }}>
              {r.detail}
            </Text>
          </Stack>
        </Card>
      ))}
      {config.features.checkup && (
        <Flex>
          <Button
            as="a"
            href={checkup.href}
            onClick={checkup.onClick}
            text="Open the Checkup"
            mode="ghost"
            fontSize={1}
            padding={2}
          />
        </Flex>
      )}
    </Stack>
  );
}

function Guides({ config, documentType }: { config: KitConfig; documentType: string }) {
  const map = config.guide.forType ?? {};
  const slugs = (map[documentType] ?? map['*'] ?? []).filter((s) =>
    config.guide.guides.some((g) => g.slug === s),
  );
  const [open, setOpen] = useState(slugs[0] ?? null);
  const View = useMemo(() => (open ? config.guide.view(open) : null), [open]);
  const linkTo = useStudioLink();
  const guide = linkTo({ tool: 'site-guide' });

  if (slugs.length === 0) {
    return (
      <Text size={1} muted style={{ lineHeight: 1.6 }}>
        There is no guide for this one yet. The Site Guide has help for every job.
      </Text>
    );
  }
  return (
    <Stack gap={3}>
      {slugs.length > 1 && (
        <Flex gap={2} wrap="wrap">
          {slugs.map((s) => (
            <Button
              key={s}
              text={config.guide.guides.find((g) => g.slug === s)?.title ?? s}
              mode={s === open ? 'default' : 'ghost'}
              tone={s === open ? 'primary' : 'default'}
              fontSize={1}
              padding={2}
              onClick={() => setOpen(s)}
            />
          ))}
        </Flex>
      )}
      {View && (
        <Card radius={2} border>
          <View />
        </Card>
      )}
      {config.features.guide && (
        <Flex>
          <Button
            as="a"
            href={guide.href}
            onClick={guide.onClick}
            text="Open the Site Guide"
            mode="ghost"
            fontSize={1}
            padding={2}
          />
        </Flex>
      )}
    </Stack>
  );
}

export function makeHelpPanel(config: KitConfig) {
  function HelpPanel({ documentId, documentType, onClose }: DocumentInspectorProps) {
    return (
      <Flex direction="column" height="fill" style={{ minHeight: 0 }}>
        <Card borderBottom paddingX={4} paddingY={3} style={{ flexShrink: 0 }}>
          <Flex align="center" gap={2}>
            <Box flex={1}>
              <Text size={1} weight="semibold">
                Help for this page
              </Text>
            </Box>
            <Button
              icon={CloseIcon}
              mode="bleed"
              onClick={onClose}
              aria-label="Close help"
              title="Close help"
            />
          </Flex>
        </Card>
        <Box flex={1} padding={4} style={{ overflowY: 'auto' }}>
          <Stack gap={5}>
            <Section title="Worth a look">
              <PageCheck config={config} documentId={documentId} documentType={documentType} />
              <CheckupFindings config={config} documentId={documentId} />
            </Section>
            <Section title="How to">
              <Guides config={config} documentType={documentType} />
            </Section>
          </Stack>
        </Box>
      </Flex>
    );
  }

  return defineDocumentInspector({
    name: HELP_PANEL_NAME,
    useMenuItem: () => ({
      icon: HelpCircleIcon,
      title: 'Help for this page',
      showAsAction: true,
    }),
    component: HelpPanel,
  });
}

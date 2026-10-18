// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// "Before you publish": a document inspector (Studio kit, PORTS.md card 122)
// =============================================================================
// Opens from the document's footer, beside "Help for this page", and lists
// what the Checkup would say about THIS document once the editor's changes are
// published: pictures with no description, no Google description, links to
// things not on the website, facts to confirm, example text left from a
// template, and whatever rules the site adds in kit.config.ts (heading order,
// link words and so on). Each one has a "Show me" that opens the field.
//
// It uses the Checkup's own rules through forDocument() in
// src/lib/studio-prepublish.ts, re-run a moment after the editor stops
// typing, plus the page check's "nothing typed here" and "link to an address
// no page owns" (config.pageCheck). It BLOCKS NOTHING and writes nothing:
// Publish works the same whatever this says.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  defineDocumentInspector,
  useClient,
  useEditState,
  type DocumentInspectorProps,
} from 'sanity';
import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle';
import { CloseIcon } from '@sanity/icons/Close';
import { Badge, Box, Button, Card, Flex, Spinner, Stack, Text } from '@sanity/ui';
import type { CheckGroup } from '../../lib/page-checks';
import {
  CHECKUP_QUERY,
  defaultNameOf,
  publishedIdOf,
  type Doc,
  type SiteFiles,
} from '../../lib/studio-checkup';
import { forDocument, type DocFinding } from '../../lib/studio-prepublish';
import { WEEK_TYPE } from '../../lib/studio-kit';
import { SEVERITY_TONE } from './CheckupTool';
import { API_VERSION, readSiteFiles, useStudioLink, useTypeTitle } from './shared';
import type { KitConfig } from './types';

export const PUBLISH_PANEL_NAME = 'ncs-before-publish';

/** Everything the rules compare against: the rest of the site, read once per open. */
function useSiteDocs(config: KitConfig) {
  const client = useClient({ apiVersion: API_VERSION });
  const [state, setState] = useState<{ docs: Doc[]; site: SiteFiles } | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setFailed(false);
    try {
      const ignore = new Set([...config.checkup.ignoreTypes, WEEK_TYPE]);
      const [all, site] = await Promise.all([client.fetch<Doc[]>(CHECKUP_QUERY), readSiteFiles()]);
      setState({ docs: (all ?? []).filter((d) => !ignore.has(d._type)), site });
    } catch {
      setFailed(true);
    }
  }, [client, config]);
  useEffect(() => {
    void load();
  }, [load]);
  return { state, failed, reload: load };
}

function FindingCard({
  f,
  documentId,
  documentType,
}: {
  f: DocFinding;
  documentId: string;
  documentType: string;
}) {
  const linkTo = useStudioLink();
  const go = f.field
    ? linkTo({ doc: publishedIdOf(documentId), type: documentType, field: f.field })
    : null;
  return (
    <Card padding={3} radius={2} border tone={SEVERITY_TONE[f.severity]}>
      <Stack gap={3}>
        <Flex>
          <Badge tone={SEVERITY_TONE[f.severity]} fontSize={0} padding={2}>
            {f.severity}
          </Badge>
        </Flex>
        <Text size={1} weight="semibold">
          {f.label}
        </Text>
        <Text size={1} muted style={{ lineHeight: 1.5 }}>
          {f.detail}
        </Text>
        {go && (
          <Flex>
            <Button
              as="a"
              href={go.href}
              onClick={go.onClick}
              text="Show me"
              mode="ghost"
              fontSize={1}
              padding={2}
            />
          </Flex>
        )}
      </Stack>
    </Card>
  );
}

export function makePublishPanel(config: KitConfig) {
  function PublishPanel({ documentId, documentType, onClose }: DocumentInspectorProps) {
    const client = useClient({ apiVersion: API_VERSION });
    const typeTitle = useTypeTitle();
    const nameOf = useMemo(() => defaultNameOf(typeTitle), [typeTitle]);
    const { draft, published } = useEditState(publishedIdOf(documentId), documentType);
    const current = (draft ?? published) as Doc | null;
    const { state, failed, reload } = useSiteDocs(config);
    const [findings, setFindings] = useState<DocFinding[] | null>(null);
    const [groups, setGroups] = useState<CheckGroup[]>([]);
    const check = config.pageCheck?.types.includes(documentType) ? config.pageCheck : undefined;

    // Re-run a moment after the editor stops typing, never on every keystroke.
    useEffect(() => {
      if (!state) return undefined;
      const timer = window.setTimeout(() => {
        setFindings(
          forDocument(state.docs, config.checkup.rules, current, {
            nameOf,
            typeTitle,
            site: state.site,
          }),
        );
        if (check && current) {
          check
            .run(current, client)
            // Pictures are already covered by the Checkup's own rule, with a field link.
            .then((g) => setGroups(g.filter((x) => x.id !== 'alt' && x.findings.length > 0)))
            .catch(() => setGroups([]));
        }
      }, 600);
      return () => window.clearTimeout(timer);
    }, [state, current, nameOf, typeTitle, check, client]);

    const clear = findings !== null && findings.length === 0 && groups.length === 0;

    return (
      <Flex direction="column" height="fill" style={{ minHeight: 0 }}>
        <Card borderBottom paddingX={4} paddingY={3} style={{ flexShrink: 0 }}>
          <Flex align="center" gap={2}>
            <Box flex={1}>
              <Text size={1} weight="semibold">
                Before you publish
              </Text>
            </Box>
            <Button
              icon={CloseIcon}
              mode="bleed"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            />
          </Flex>
        </Card>
        <Box flex={1} padding={4} style={{ overflowY: 'auto' }}>
          <Stack gap={4}>
            <Text size={1} muted style={{ lineHeight: 1.6 }}>
              A last look at this page as it will be once you publish. Nothing here stops you
              publishing; it points at things worth a second look.
            </Text>
            {failed && (
              <Text size={1} muted>
                The check could not run just now.
              </Text>
            )}
            {!failed && findings === null && <Spinner muted />}
            {clear && (
              <Card padding={3} radius={2} border tone="positive">
                <Flex align="center" gap={2}>
                  <Text size={2}>
                    <CheckmarkCircleIcon />
                  </Text>
                  <Text size={1} weight="semibold">
                    Nothing to look at. Ready when you are.
                  </Text>
                </Flex>
              </Card>
            )}
            {(findings ?? []).map((f, i) => (
              <FindingCard
                key={`${f.ruleId}-${f.field ?? i}`}
                f={f}
                documentId={documentId}
                documentType={documentType}
              />
            ))}
            {groups.map((g) => (
              <Card key={g.id} padding={3} radius={2} border tone="caution">
                <Stack gap={3}>
                  <Text size={1} weight="semibold">
                    {g.title}: {g.findings.length} to look at
                  </Text>
                  {g.findings.map((f, i) => (
                    <Text key={`${f.where}-${i}`} size={1} muted>
                      <strong>{f.where}</strong>: {f.detail}
                    </Text>
                  ))}
                </Stack>
              </Card>
            ))}
            {state && (
              <Flex>
                <Button
                  text="Check again"
                  mode="ghost"
                  fontSize={1}
                  padding={2}
                  onClick={() => void reload()}
                />
              </Flex>
            )}
          </Stack>
        </Box>
      </Flex>
    );
  }

  return defineDocumentInspector({
    name: PUBLISH_PANEL_NAME,
    useMenuItem: () => ({
      icon: CheckmarkCircleIcon,
      title: 'Before you publish',
      showAsAction: true,
    }),
    component: PublishPanel,
  });
}

// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// "Before you publish": a document inspector (Studio kit, PORTS.md card 123)
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
import { Box, Button, Card, Flex, Text } from '@sanity/ui';
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
import {
  AllClear,
  KitAction,
  KitLoading,
  KitNotice,
  KitScope,
  levelOf,
  ResultCard,
  SeverityGroup,
  type Level,
} from './ui';

const LEVELS: Level[] = ['needs', 'worth', 'good'];
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
  // Card 131: a white card with its severity along the left edge.
  return (
    <ResultCard
      dense
      showLevel
      level={levelOf(f.severity)}
      title={f.label}
      detail={f.detail}
      action={
        go ? (
          <KitAction href={go.href} onClick={go.onClick}>
            Show me
          </KitAction>
        ) : undefined
      }
    />
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
          <KitScope>
            <div style={{ display: 'grid', gap: 16, fontSize: 15 }}>
              <p className="ui-muted" style={{ lineHeight: 1.6 }}>
                A last look at this page as it will be once you publish. Nothing here stops you
                publishing; it points at things worth a second look.
              </p>
              {failed && (
                <KitNotice tone="tip" title="The check could not run just now">
                  Press Check again in a minute.
                </KitNotice>
              )}
              {!failed && findings === null && <KitLoading label="Looking over the page" />}
              {clear && (
                <AllClear
                  compact
                  title="Ready when you are"
                  lead="Nothing to look at on this page."
                />
              )}
              {LEVELS.map((level) => {
                const rows = (findings ?? []).filter((f) => levelOf(f.severity) === level);
                if (!rows.length) return null;
                return (
                  <SeverityGroup key={level} level={level} count={rows.length}>
                    {rows.map((f, i) => (
                      <FindingCard
                        key={`${f.ruleId}-${f.field ?? i}`}
                        f={f}
                        documentId={documentId}
                        documentType={documentType}
                      />
                    ))}
                  </SeverityGroup>
                );
              })}
              {groups.map((g) => (
                <ResultCard
                  key={g.id}
                  level="worth"
                  dense
                  title={`${g.title}: ${g.findings.length} to look at`}
                  detail={
                    <>
                      {g.findings.map((f, i) => (
                        <span key={`${f.where}-${i}`} style={{ display: 'block', marginTop: 4 }}>
                          <strong>{f.where}</strong>: {f.detail}
                        </span>
                      ))}
                    </>
                  }
                />
              ))}
              {state && (
                <div>
                  <KitAction onClick={() => void reload()}>Check again</KitAction>
                </div>
              )}
            </div>
          </KitScope>
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

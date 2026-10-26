// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Paste-and-go for the "Custom code or embed" block (PORTS.md card 172)
// =============================================================================
// One box at the top of the block: an editor pastes a link or the embed code a
// service gave them, and the block fills itself in. A link (or code that is only
// an iframe) goes in "Web address to show"; other code goes in "Custom code",
// with "Runs directly on the page" switched on when it is a known service's
// script that needs it. Under the box, one sentence says what was recognized
// and how it will show, worked out from the block as it stands now, so it is
// right for blocks made before this box existed too.
//
// The decisions are src/lib/embed-providers.ts; nothing extra is stored. The
// site's own words (who approves a new service, which services to name as
// examples) and its approved script origins come in through
// makeEmbedPasteInput(), called from the site's schema (sections.ts), so this
// file stays the same on every site.
// =============================================================================
import { useCallback, useState, type ClipboardEvent } from 'react';
import { Button, Card, Flex, Stack, Text, TextArea } from '@sanity/ui';
import { set, unset, type ObjectInputProps } from 'sanity';
import { describePlan, planEmbed, readPaste, type EmbedWords } from '../../lib/embed-providers';

interface EmbedValue {
  embedUrl?: string;
  embedCode?: string;
  runsOnPage?: boolean;
}

export interface EmbedPasteOptions {
  /** The site's wording for the Studio sentence. */
  words?: EmbedWords;
  /** site.embeds.approvedScriptOrigins: code from these may run on the page. */
  approvedOrigins?: readonly string[];
}

/** The block's input component, carrying the site's words and approved origins. */
export function makeEmbedPasteInput({ words = {}, approvedOrigins = [] }: EmbedPasteOptions = {}) {
  function EmbedPasteInput(props: ObjectInputProps) {
    const value = (props.value ?? {}) as EmbedValue;
    const [text, setText] = useState('');
    const { onChange } = props;

    const apply = useCallback(
      (pasted: string) => {
        const result = readPaste(pasted, approvedOrigins);
        if (!result) return;
        onChange([
          result.embedUrl ? set(result.embedUrl, ['embedUrl']) : unset(['embedUrl']),
          result.embedCode ? set(result.embedCode, ['embedCode']) : unset(['embedCode']),
          set(result.runsOnPage, ['runsOnPage']),
        ]);
        setText('');
      },
      [onChange],
    );

    const plan = planEmbed(value, approvedOrigins);
    const tone =
      plan.kind === 'problem' || (plan.kind === 'box' && plan.blocked)
        ? 'caution'
        : plan.kind === 'none'
          ? 'default'
          : 'positive';

    return (
      <Stack gap={4}>
        <Card padding={3} radius={2} border tone="primary">
          <Stack gap={3}>
            <Text size={1} weight="semibold">
              Paste a link or embed code here
            </Text>
            <TextArea
              rows={3}
              value={text}
              placeholder="Like https://www.youtube.com/watch?v=... or the code a service gave you"
              onChange={(e) => setText(e.currentTarget.value)}
              onPaste={(e: ClipboardEvent<HTMLTextAreaElement>) => {
                const pasted = e.clipboardData.getData('text');
                if (!pasted.trim()) return;
                e.preventDefault();
                apply(pasted);
              }}
            />
            {text.trim() && (
              <Flex>
                <Button text="Use this" tone="primary" onClick={() => apply(text)} />
              </Flex>
            )}
            <Text size={1} muted>
              The block fills itself in below: the right shape for a video, map or podcast, and
              whether it runs on the page.
            </Text>
          </Stack>
        </Card>
        <Card padding={3} radius={2} tone={tone}>
          <Text size={1}>{describePlan(plan, words)}</Text>
        </Card>
        {props.renderDefault(props)}
      </Stack>
    );
  }
  return EmbedPasteInput;
}

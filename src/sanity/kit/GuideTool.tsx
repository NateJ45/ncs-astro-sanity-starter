// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Site Guide: the help, as a top-bar tool with search and print (Studio kit)
// =============================================================================
// The guides themselves are the site's own Help & Guide data
// (src/sanity/guides/content.ts, PORTS.md card 41), rendered by the site's
// GuideView. This tool adds what the desk list cannot: one task-first index
// ("I want to..."), a search box that reads the whole text of every guide, and
// a Print button that prints just the open guide (a recipe for the fridge).
//
// The open guide is kept in component state, not in the URL, on purpose: the
// tool is small, and a reload landing on the index is a fine place to restart.
// =============================================================================

import { useMemo, useState } from 'react';
import { BookIcon } from '@sanity/icons/Book';
import { Box, Button, Card, Flex, Stack, Text, TextInput } from '@sanity/ui';
import { strings } from '../../lib/studio-checkup';
import { ToolHeading } from './shared';
import type { KitConfig, KitGuide } from './types';

/** Print only the open guide, without the Studio around it. */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  [data-kit-print], [data-kit-print] * { visibility: visible !important; }
  [data-kit-print] { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; }
  [data-kit-noprint] { display: none !important; }
}`;

function matches(guide: KitGuide, words: string[]): boolean {
  if (!words.length) return true;
  const hay = [guide.title, guide.lead, ...strings(guide.body)].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function makeGuideTool(config: KitConfig) {
  const { guides, categories, view } = config.guide;

  return function GuideTool() {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState<string | null>(null);
    const words = useMemo(
      () =>
        query
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 1),
      [query],
    );
    const View = useMemo(() => (open ? view(open) : null), [open]);
    const shown = guides.filter((g) => matches(g, words));

    if (View) {
      return (
        <Box padding={[3, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
          <style>{PRINT_CSS}</style>
          <Stack gap={4} style={{ maxWidth: 820, margin: '0 auto' }}>
            <Flex gap={2} data-kit-noprint="">
              <Button
                text="← All guides"
                mode="ghost"
                fontSize={2}
                padding={3}
                onClick={() => setOpen(null)}
              />
              <Button
                text="Print this guide"
                mode="ghost"
                fontSize={2}
                padding={3}
                onClick={() => window.print()}
              />
            </Flex>
            <div data-kit-print="">
              <View />
            </div>
          </Stack>
        </Box>
      );
    }

    return (
      <Box padding={[4, 4, 5]} style={{ overflowY: 'auto', height: '100%' }}>
        <Stack gap={5} style={{ maxWidth: 820, margin: '0 auto' }}>
          <ToolHeading
            icon={BookIcon}
            lead="Step-by-step help for the jobs you do on the website. Pick what you want to do, or search for a word."
          >
            Site Guide
          </ToolHeading>

          <TextInput
            fontSize={3}
            padding={4}
            placeholder="I want to..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            aria-label="Search the guides"
          />

          {shown.length === 0 && (
            <Text size={2} muted>
              No guide mentions that yet. Try another word, or ask {config.helper.name}.
            </Text>
          )}

          {categories.map((category) => {
            const mine = shown.filter((g) => g.category === category);
            if (!mine.length) return null;
            return (
              <Stack key={category} gap={3}>
                <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase' }}>
                  {category}
                </Text>
                {mine.map((g) => (
                  <Card
                    key={g.slug}
                    as="button"
                    padding={4}
                    radius={3}
                    border
                    onClick={() => setOpen(g.slug)}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                  >
                    <Stack gap={3}>
                      <Text size={2} weight="semibold">
                        {g.title}
                      </Text>
                      <Text size={1} muted style={{ lineHeight: 1.5 }}>
                        {g.lead}
                      </Text>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            );
          })}
        </Stack>
      </Box>
    );
  };
}

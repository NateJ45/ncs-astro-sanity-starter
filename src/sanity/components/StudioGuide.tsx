// StudioGuide.tsx — Panel 1 of the Start Here handbook.
// Renders the editable `studioGuide` singleton (fetched via useClient). The
// rendered view is read-only and pretty; editing happens in the sibling "Edit"
// form tab wired in structure.ts. Safe to edit by hand (layout only).

import React, { useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { Box, Card, Container, Heading, Stack, Text } from '@sanity/ui';

interface MapRow { area?: string; description?: string }
interface HowTo { title?: string; steps?: string[] }
interface Tip { heading?: string; tone?: 'default' | 'primary' | 'caution' | 'positive'; body?: string }
interface GuideDoc {
  guideTitle?: string;
  guideIntro?: string;
  studioMap?: MapRow[];
  howTos?: HowTo[];
  tips?: Tip[];
}

const QUERY = `*[_type=="studioGuide"][0]{guideTitle, guideIntro, studioMap, howTos, tips}`;

/** Split a text field on blank lines into paragraphs. */
function paragraphs(text?: string): string[] {
  return (text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export default function StudioGuide() {
  const client = useClient({ apiVersion: '2024-01-01' });
  const [doc, setDoc] = useState<GuideDoc | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    client.fetch<GuideDoc | null>(QUERY).then((d) => setDoc(d ?? {})).catch(() => setError(true));
  }, [client]);

  if (error) {
    return (
      <Container width={1} padding={4}>
        <Card padding={4} radius={2} shadow={1} tone="caution">
          <Text size={1}>Could not load the guide right now. Open the Edit tab to see the content.</Text>
        </Card>
      </Container>
    );
  }
  if (doc === null) {
    return (
      <Container width={1} padding={4}>
        <Text size={1} muted>Loading the guide...</Text>
      </Container>
    );
  }

  return (
    <Container width={1} padding={4}>
      <Stack space={6}>
        <Box>
          <Heading as="h1" size={3}>{doc.guideTitle ?? 'How the website works'}</Heading>
          {doc.guideIntro && (
            <Box marginTop={3}>
              {paragraphs(doc.guideIntro).map((p, i) => (
                <Box key={i} marginTop={i === 0 ? 0 : 2}><Text muted size={1}>{p}</Text></Box>
              ))}
            </Box>
          )}
        </Box>

        {doc.studioMap && doc.studioMap.length > 0 && (
          <Card padding={4} radius={2} shadow={1} tone="default">
            <Stack space={4}>
              <Heading as="h2" size={1}>The map: where everything lives</Heading>
              <Stack space={3}>
                {doc.studioMap.map((row, i) => (
                  <Box key={i}>
                    <Text size={1} weight="semibold">{row.area}</Text>
                    <Box marginTop={1}><Text size={1} muted>{row.description}</Text></Box>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Card>
        )}

        {doc.howTos && doc.howTos.length > 0 && (
          <Box>
            <Heading as="h2" size={1} style={{ marginBottom: '1rem' }}>Step-by-step how-tos</Heading>
            <Stack space={4}>
              {doc.howTos.map((howTo, i) => (
                <Card key={i} padding={4} radius={2} shadow={1} tone="default">
                  <Stack space={3}>
                    <Heading as="h3" size={0}>{i + 1}. {howTo.title}</Heading>
                    <Stack space={2}>
                      {(howTo.steps ?? []).map((step, j) => (
                        <Text key={j} size={1}>{step}</Text>
                      ))}
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {doc.tips && doc.tips.length > 0 && doc.tips.map((tip, i) => (
          <Card key={i} padding={4} radius={2} shadow={1} tone={tip.tone ?? 'default'}>
            <Stack space={3}>
              <Heading as="h2" size={1}>{tip.heading}</Heading>
              {paragraphs(tip.body).map((p, j) => (
                <Text key={j} size={1}>{p}</Text>
              ))}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}

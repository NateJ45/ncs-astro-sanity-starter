// StudioPlaybook.tsx — Panel 4 of the Start Here handbook ("Grow your studio").
// Renders the editable `studioPlaybook` singleton (fetched via useClient). Four
// professional-development guides shown as tabs; the active guide renders its
// summary and a flow of sections. Default sections render plain; toned sections
// render as colored callout cards. Editing happens in the sibling "Edit" form
// tab wired in structure.ts. Safe to edit by hand (layout only).

import React, { useEffect, useState } from 'react';
import { useClient } from 'sanity';
import { Box, Card, Container, Heading, Stack, Tab, TabList, Text } from '@sanity/ui';

interface PlaybookLink { label?: string; url?: string }
interface PlaybookSection {
  heading?: string;
  tone?: 'default' | 'primary' | 'positive' | 'caution';
  body?: string;
  bullets?: string[];
  links?: PlaybookLink[];
}
interface PlaybookGuide { title?: string; summary?: string; sections?: PlaybookSection[] }
interface PlaybookDoc { title?: string; intro?: string; guides?: PlaybookGuide[] }

const QUERY = `*[_type=="studioPlaybook"][0]{title, intro, guides[]{title, summary, sections[]{heading, tone, body, bullets, links[]{label, url}}}}`;

/** Split a text field on blank lines into paragraphs. */
function paragraphs(text?: string): string[] {
  return (text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/** One section: heading + paragraphs + bullets + links. Toned sections become callout cards. */
function SectionView({ section }: { section: PlaybookSection }) {
  const tone = section.tone ?? 'default';
  const body = paragraphs(section.body);
  const bullets = section.bullets ?? [];
  const links = section.links ?? [];

  const inner = (
    <Stack space={3}>
      <Heading as="h3" size={1}>{section.heading}</Heading>
      {body.map((p, i) => (<Text key={i} size={1}>{p}</Text>))}
      {bullets.length > 0 && (
        <Stack as="ul" space={2} style={{ margin: 0, paddingLeft: '1.15rem' }}>
          {bullets.map((b, i) => (<Text key={i} as="li" size={1}>{b}</Text>))}
        </Stack>
      )}
      {links.length > 0 && (
        <Stack space={2}>
          {links.map((l, i) => (
            <Text key={i} size={1}>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#9C7661', textDecoration: 'underline' }}
              >
                {l.label}
              </a>
            </Text>
          ))}
        </Stack>
      )}
    </Stack>
  );

  if (tone === 'default') {
    return <Box>{inner}</Box>;
  }
  return (
    <Card padding={4} radius={2} shadow={1} tone={tone}>
      {inner}
    </Card>
  );
}

export default function StudioPlaybook() {
  const client = useClient({ apiVersion: '2024-01-01' });
  const [doc, setDoc] = useState<PlaybookDoc | null>(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    client.fetch<PlaybookDoc | null>(QUERY).then((d) => setDoc(d ?? {})).catch(() => setError(true));
  }, [client]);

  if (error) {
    return (
      <Container width={1} padding={4}>
        <Card padding={4} radius={2} shadow={1} tone="caution">
          <Text size={1}>Could not load the guides right now. Open the Edit tab to see the content.</Text>
        </Card>
      </Container>
    );
  }
  if (doc === null) {
    return (
      <Container width={1} padding={4}>
        <Text size={1} muted>Loading the guides...</Text>
      </Container>
    );
  }

  const guides = doc.guides ?? [];
  const activeIndex = active < guides.length ? active : 0;
  const activeGuide = guides[activeIndex];

  return (
    <Container width={1} padding={4}>
      <Stack space={5}>
        <Box>
          <Heading as="h1" size={3}>{doc.title ?? 'Grow your studio'}</Heading>
          {doc.intro && (
            <Box marginTop={3}>
              {paragraphs(doc.intro).map((p, i) => (
                <Box key={i} marginTop={i === 0 ? 0 : 2}><Text muted size={1}>{p}</Text></Box>
              ))}
            </Box>
          )}
        </Box>

        {guides.length > 0 && (
          <TabList space={2}>
            {guides.map((g, i) => (
              <Tab
                key={i}
                aria-controls={`playbook-panel-${i}`}
                id={`playbook-tab-${i}`}
                label={g.title ?? `Guide ${i + 1}`}
                onClick={() => setActive(i)}
                selected={activeIndex === i}
              />
            ))}
          </TabList>
        )}

        {activeGuide && (
          <Box
            id={`playbook-panel-${activeIndex}`}
            aria-labelledby={`playbook-tab-${activeIndex}`}
          >
            <Stack space={5}>
              {activeGuide.summary && (
                <Card padding={4} radius={2} shadow={1} tone="primary">
                  <Stack space={2}>
                    {paragraphs(activeGuide.summary).map((p, i) => (<Text key={i} size={1}>{p}</Text>))}
                  </Stack>
                </Card>
              )}
              {(activeGuide.sections ?? []).map((s, i) => (
                <SectionView key={i} section={s} />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Container>
  );
}

// BrandKit.tsx — Panel 3 of the Start Here handbook.
// Quick-reference card for the studio brand colors and fonts, built for copying into Canva.
// Renders color swatches inline using a small Box with a backgroundColor style.
// Static content — no data fetching.
// Safe to edit by hand.

import React from 'react';
import { Box, Card, Container, Heading, Stack, Text } from '@sanity/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ColorSwatch {
  name: string;
  hex: string;
  note: string;
}

interface ColorGroup {
  label: string;
  colors: ColorSwatch[];
}

interface FontEntry {
  name: string;
  role: string;
  note: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const colorGroups: ColorGroup[] = [
  {
    label: 'Primary and links',
    colors: [
      { name: 'Slate', hex: '#586577', note: 'Buttons, primary CTAs, links, and accent elements throughout the site.' },
      { name: 'Slate Dark', hex: '#434E5C', note: 'Button hover state. Also used for link text in body copy.' },
    ],
  },
  {
    label: 'Text',
    colors: [
      { name: 'Ink', hex: '#2A2D31', note: 'Primary text color for headings and body copy on light backgrounds.' },
      { name: 'Ink Dark', hex: '#1E2024', note: 'Footer background and occasional dark section panels.' },
    ],
  },
  {
    label: 'Surfaces',
    colors: [
      { name: 'Paper', hex: '#FBFBFA', note: 'The main page background. A clean near-white.' },
      { name: 'Soft Paper', hex: '#F3F4F2', note: 'Alternating section background. Slightly cooler than Paper.' },
      { name: 'White', hex: '#FFFFFF', note: 'Text overlaid on dark or photographic surfaces. Hero text, button labels.' },
    ],
  },
  {
    label: 'Accents and lines',
    colors: [
      { name: 'Cool Gray', hex: '#AAB0B8', note: 'Borders, dividers, and eyebrow labels.' },
      { name: 'Muted Sage', hex: '#9DB0A6', note: 'Used sparingly for process step icons and occasional tag accents.' },
      { name: 'Faint Divider', hex: '#E6E7E5', note: 'Input field underlines and the lightest dividers.' },
    ],
  },
];

const fonts: FontEntry[] = [
  {
    name: 'Libre Baskerville',
    role: 'Headings (display)',
    note: 'The serif used for all headings (H1 through H6). It gives the site its editorial, considered feel. Use it for headlines in Canva designs.',
  },
  {
    name: 'Inter',
    role: 'Body text, buttons, labels',
    note: 'The clean, readable sans-serif used for all body copy, button labels, and small UI text. Reliable and legible at any size.',
  },
];

// ─── Sub-component: color swatch ─────────────────────────────────────────────

interface SwatchProps {
  color: ColorSwatch;
}

function Swatch({ color }: SwatchProps) {
  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      {/* The color box */}
      <Box
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '6px',
          backgroundColor: color.hex,
          border: '1px solid rgba(0,0,0,0.10)',
          flexShrink: 0,
          marginTop: '2px',
        }}
      />
      {/* Name, hex, note */}
      <Stack space={1} style={{ minWidth: 0 }}>
        <Text size={1} weight="semibold">
          {color.name}
        </Text>
        {/* Hex displayed as selectable text for easy copy-paste */}
        <Text size={1} style={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>
          {color.hex}
        </Text>
        <Text size={1} muted>
          {color.note}
        </Text>
      </Stack>
    </Box>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BrandKit() {
  return (
    <Container width={1} padding={4}>
      <Stack space={6}>

        {/* Header */}
        <Box>
          <Heading as="h1" size={3}>
            Brand kit
          </Heading>
          <Box marginTop={3}>
            <Text muted size={1}>
              Colors and fonts for Studio Starter. Built so you can copy values directly
              into Canva when you need to make a social graphic or marketing material.
            </Text>
          </Box>
        </Box>

        {/* ── Colors ────────────────────────────────────────────────────── */}
        <Box>
          <Heading as="h2" size={1} style={{ marginBottom: '1rem' }}>
            Brand colors
          </Heading>
          <Stack space={4}>
            {colorGroups.map((group) => (
              <Card key={group.label} padding={4} radius={2} shadow={1} tone="default">
                <Stack space={4}>
                  <Text size={1} weight="semibold" muted>
                    {group.label.toUpperCase()}
                  </Text>
                  <Stack space={4}>
                    {group.colors.map((color) => (
                      <Swatch key={color.hex} color={color} />
                    ))}
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Box>

        {/* ── Fonts ─────────────────────────────────────────────────────── */}
        <Box>
          <Heading as="h2" size={1} style={{ marginBottom: '1rem' }}>
            Fonts
          </Heading>
          <Stack space={3}>
            {fonts.map((font) => (
              <Card key={font.name} padding={4} radius={2} shadow={1} tone="default">
                <Stack space={2}>
                  <Text size={1} weight="semibold">{font.name}</Text>
                  <Text size={1} muted>Role: {font.role}</Text>
                  <Text size={1}>{font.note}</Text>
                </Stack>
              </Card>
            ))}
          </Stack>
          <Box marginTop={3}>
            <Text size={1} muted>
              All three fonts are free Google Fonts. Find them by name in Canva's font picker.
            </Text>
          </Box>
        </Box>

        {/* ── Using this in Canva ───────────────────────────────────────── */}
        <Card padding={4} radius={2} shadow={1} tone="primary">
          <Stack space={3}>
            <Heading as="h2" size={1}>
              Using this in Canva
            </Heading>
            <Text size={1}>
              In your Canva Brand Kit, add the hex codes above as your brand colors.
              Then search each font name in Canva's font picker and save them as your
              brand fonts.
            </Text>
            <Text size={1}>
              The quick reference: Libre Baskerville for headings, Inter for body text and
              labels, Slate (#586577) for buttons and accents, Ink (#2A2D31) for text,
              Paper (#FBFBFA) for backgrounds.
            </Text>
            <Text size={1}>
              When in doubt, Slate + Ink + Paper is the full Studio Starter palette in
              three colors.
            </Text>
          </Stack>
        </Card>

      </Stack>
    </Container>
  );
}

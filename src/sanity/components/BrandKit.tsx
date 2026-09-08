import { Box, Card, Flex, Grid, Stack, Text } from '@sanity/ui';
import brand from '../../../brand/brand.config.json';

// =============================================================================
// BrandKit — the project's colours and type, for work made away from the site
// =============================================================================
// A flyer, a social post, a printed sign. These are the values the website
// itself uses, so anything made with them belongs to the same brand.
//
// IT READS brand/brand.config.json, WHICH IS THE POINT.
//
// Until 2026-09-08 every hex here was hardcoded, and they were the STARTER'S
// slate-and-ink palette. `npm run apply-brand` rewrites globals.css, site.ts and
// the Studio theme from the brand config, but it had no idea this file existed,
// so a rebranded project shipped a "Brand kit" panel confidently showing the
// wrong colours. On stonesteps-50k it was never noticed only because the pane
// had not been wired into the desk.
//
// Deriving them removes the drift class entirely: there is now no way for this
// panel to disagree with the site, and no step to remember during a rebrand.
//
// THE LABELS ARE ROLES, NOT NAMES. They used to be "Slate", "Ink", "Cool Gray",
// which are meaningless the moment the palette changes and cannot be derived
// from a hex. Roles stay true for every project. If a project wants its own
// colour names, that is a deliberate edit to make in the fork.
//
// The ink printed ON each swatch is chosen by luminance rather than picked by
// hand, so a swatch label can never come out unreadable on a palette nobody
// anticipated.
// =============================================================================

const theme = brand.palette.theme as Record<string, string>;

interface Swatch {
  role: string;
  token: string;
  note: string;
}

const GROUPS: { label: string; swatches: Swatch[] }[] = [
  {
    label: 'Primary and links',
    swatches: [
      { role: 'Primary', token: '--color-primary', note: 'Buttons, links, and accents.' },
      {
        role: 'Primary (dark)',
        token: '--color-primary-dark',
        note: 'The hover and pressed state, and small text where the primary is too light.',
      },
    ],
  },
  {
    label: 'Text',
    swatches: [
      { role: 'Text', token: '--color-accent', note: 'Headings and body copy.' },
      {
        role: 'Text on dark',
        token: '--color-accent-dark',
        note: 'The darker ink used on dark surfaces.',
      },
    ],
  },
  {
    label: 'Surfaces',
    swatches: [
      { role: 'Page background', token: '--color-bg', note: 'The main page ground.' },
      {
        role: 'Alternating band',
        token: '--color-bg-soft',
        note: 'The softer ground that alternating sections sit on.',
      },
      { role: 'White', token: '--color-white-pure', note: 'Cards and panels that sit on top.' },
    ],
  },
  {
    label: 'Accents and lines',
    swatches: [
      { role: 'Secondary', token: '--color-secondary', note: 'Borders, dividers, eyebrow labels.' },
      { role: 'Tertiary', token: '--color-tertiary', note: 'A quiet accent, used sparingly.' },
      { role: 'Faint lines', token: '--color-border-soft', note: 'Hairline dividers.' },
    ],
  },
];

/** Black or white, whichever is readable on this swatch. */
function inkFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#000000';
  const n = parseInt(m[1], 16);
  const lum = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    })
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
  // 0.179 is the luminance at which black and white are equally readable.
  return lum > 0.179 ? '#000000' : '#ffffff';
}

function SwatchCard({ s }: { s: Swatch }) {
  const hex = theme[s.token];
  if (!hex) return null;
  return (
    <Card padding={0} radius={3} border overflow="hidden">
      <Box padding={4} style={{ background: hex, color: inkFor(hex) }}>
        <Stack space={2}>
          <Text size={2} weight="semibold" style={{ color: 'inherit' }}>
            {s.role}
          </Text>
          <Text size={1} style={{ color: 'inherit', fontFamily: 'monospace' }}>
            {hex.toUpperCase()}
          </Text>
        </Stack>
      </Box>
      <Box padding={3}>
        <Text size={1} muted style={{ lineHeight: 1.4 }}>
          {s.note}
        </Text>
      </Box>
    </Card>
  );
}

export default function BrandKit() {
  const fonts = brand.fonts as {
    display?: { familyValue?: string };
    body?: { familyValue?: string };
  };
  // The family value is a full CSS stack; the first entry is the face itself.
  const faceOf = (stack?: string) => (stack ?? '').split(',')[0].replace(/["']/g, '').trim();

  return (
    <Box padding={4}>
      <Stack space={5} style={{ maxWidth: 720, margin: '0 auto' }}>
        <Stack space={3}>
          <Text size={3} weight="semibold">
            Brand colours and type
          </Text>
          <Text size={2} muted style={{ lineHeight: 1.6 }}>
            For anything made away from the website: a flyer, a social post, a printed sign. These
            are read straight from the project&rsquo;s brand file, so they always match the site.
          </Text>
        </Stack>

        {GROUPS.map((g) => (
          <Stack key={g.label} space={3}>
            <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase' }}>
              {g.label}
            </Text>
            <Grid columns={[1, 2, 2]} gap={3}>
              {g.swatches.map((s) => (
                <SwatchCard key={s.token} s={s} />
              ))}
            </Grid>
          </Stack>
        ))}

        <Stack space={3}>
          <Text size={1} weight="semibold" muted style={{ textTransform: 'uppercase' }}>
            Type
          </Text>
          <Card padding={4} radius={3} border>
            <Stack space={3}>
              <Flex align="baseline" gap={3}>
                <Text size={2} weight="semibold">
                  {faceOf(fonts.display?.familyValue) || 'Not set'}
                </Text>
                <Text size={1} muted>
                  Headings
                </Text>
              </Flex>
              <Flex align="baseline" gap={3}>
                <Text size={2} weight="semibold">
                  {faceOf(fonts.body?.familyValue) || 'Not set'}
                </Text>
                <Text size={1} muted>
                  Body text
                </Text>
              </Flex>
            </Stack>
          </Card>
        </Stack>

        <Card padding={4} radius={3} tone="primary" border>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              Changing any of this
            </Text>
            <Text size={1} style={{ lineHeight: 1.5 }}>
              Edit <code>brand/brand.config.json</code> and run <code>npm run apply-brand</code>.
              That rewrites the site&rsquo;s stylesheet, its identity constants, the Studio theme
              and the sharing image, and this panel follows automatically.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}

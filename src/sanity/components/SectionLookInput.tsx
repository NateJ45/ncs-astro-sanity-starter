// Foundation, edit with care.
// =============================================================================
// SectionLookInput - the "Look" radio on a page-builder block, with a hint
// =============================================================================
// The `look` field (src/sanity/schemaTypes/_appearanceFields.ts) is a plain
// string enum. This input draws each option as a small card: a tiny picture of
// the band (two stripes taking turns for Standard, the plain page for Quiet,
// the deep brand colour for Feature), the look's name and one line on what the
// reader sees. The picture is the "tiny visual hint"; the words do the work.
//
// The colours are the literal swatches in src/lib/surfaces.ts, which the
// contrast gate pins to globals.css, so the hint cannot drift from the site.
// Nothing here writes a colour: it writes the look's name, or clears the field
// for Standard so an untouched block and a block set back to Standard store the
// same thing (nothing).
//
// Card 132: each picture is a small drawing of the section as the site draws
// it: the band colours, a display-weight heading line and two text lines, the
// site's marker in small on the Feature band and its texture (studio.look
// `texture`) over the deep colour. The chosen look gets a step of the marker
// colour down its left side as well as Sanity's own selected tone.
// =============================================================================
import { useCallback } from 'react';
import { Box, Card, Flex, Radio, Stack, Text } from '@sanity/ui';
import { set, unset, type StringInputProps } from 'sanity';
import { LOOK_BY_VALUE, type SectionLook } from '../../lib/section-looks';
import { SURFACE_BY_VALUE } from '../../lib/surfaces';
import { LOOK } from '../kit/ui/look';

type ListItem = { title?: string; value?: string };

/** One band of the picture: a heading line, two text lines, and the marker on a feature band. */
function Band({
  bg,
  ink,
  heading,
  feature,
}: {
  bg: string;
  ink: string;
  heading: string;
  feature: boolean;
}) {
  return (
    <span
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 3,
        padding: '0 9px',
        background: bg,
        backgroundImage: feature && LOOK.texture ? `url(${LOOK.texture})` : undefined,
        backgroundSize: feature && LOOK.texture ? '64px auto' : undefined,
      }}
    >
      {feature && (
        <span style={{ display: 'flex', gap: 2, marginBottom: 1 }}>
          {[6, 5, 4].map((w, i) => (
            <span
              key={i}
              style={{
                width: w,
                height: 3,
                borderRadius: 2,
                background: LOOK.light.marker,
                transform: `translateY(${-i}px) rotate(-4deg)`,
              }}
            />
          ))}
        </span>
      )}
      <span style={{ width: '46%', height: 4, borderRadius: 2, background: heading }} />
      <span style={{ width: '78%', height: 2, borderRadius: 1, background: ink, opacity: 0.45 }} />
      <span style={{ width: '62%', height: 2, borderRadius: 1, background: ink, opacity: 0.45 }} />
    </span>
  );
}

/** The little section picture for one look. Decorative: the label names the look. */
function Swatch({ look }: { look: SectionLook }) {
  const paper = SURFACE_BY_VALUE.background?.dot ?? '#ffffff';
  const soft = SURFACE_BY_VALUE.muted?.dot ?? '#f3f3f3';
  const ink = SURFACE_BY_VALUE.background?.dotInk ?? '#222222';
  const surface = LOOK_BY_VALUE[look]?.surface;
  const band = surface ? SURFACE_BY_VALUE[surface] : undefined;
  const heading = LOOK.light.heading;
  const bands =
    look === 'standard'
      ? [
          { bg: paper, ink, heading, feature: false },
          { bg: soft, ink, heading, feature: false },
        ]
      : [
          {
            bg: band?.dot ?? paper,
            ink: band?.themeStatic ? band.dotInk : ink,
            heading: band?.themeStatic ? band.dotInk : heading,
            feature: look === 'feature',
          },
        ];
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        width: 92,
        height: 60,
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.16), 0 6px 14px -10px rgba(0,0,0,0.5)',
        flex: 'none',
      }}
    >
      {bands.map((b, i) => (
        <Band key={i} {...b} />
      ))}
    </span>
  );
}

export function SectionLookInput(props: StringInputProps) {
  const { value, onChange, schemaType, readOnly, id } = props;
  const list = ((schemaType.options?.list ?? []) as ListItem[]).filter((o) => o?.value);
  // Unset reads as Standard: that is what it renders.
  const current = value || 'standard';

  const choose = useCallback(
    (next: string) => onChange(next === 'standard' ? unset() : set(next)),
    [onChange],
  );

  return (
    <Stack gap={2} role="radiogroup" aria-label={schemaType.title ?? 'Look'}>
      {list.map((option) => {
        const look = option.value as SectionLook;
        const meta = LOOK_BY_VALUE[look];
        const optionId = `${id}-${look}`;
        const selected = current === look;
        return (
          <Card
            key={look}
            as="label"
            htmlFor={optionId}
            padding={3}
            radius={2}
            border
            tone={selected ? 'primary' : 'default'}
            style={{
              cursor: readOnly ? 'default' : 'pointer',
              // The chosen look: a step of the marker colour down its left side.
              boxShadow: selected ? `inset 5px 0 0 ${LOOK.light.marker}` : undefined,
              paddingLeft: selected ? 18 : undefined,
            }}
          >
            <Flex align="center" gap={3}>
              <Radio
                id={optionId}
                name={id}
                value={look}
                checked={selected}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={() => choose(look)}
              />
              <Swatch look={look} />
              <Box flex={1}>
                <Stack gap={2}>
                  <Text size={1} weight="semibold">
                    {option.title ?? meta?.title ?? look}
                  </Text>
                  {meta?.hint && (
                    <Text size={1} muted>
                      {meta.hint}
                    </Text>
                  )}
                </Stack>
              </Box>
            </Flex>
          </Card>
        );
      })}
    </Stack>
  );
}

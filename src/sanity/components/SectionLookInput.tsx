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
// =============================================================================
import { useCallback } from 'react';
import { Box, Card, Flex, Radio, Stack, Text } from '@sanity/ui';
import { set, unset, type StringInputProps } from 'sanity';
import { LOOK_BY_VALUE, type SectionLook } from '../../lib/section-looks';
import { SURFACE_BY_VALUE } from '../../lib/surfaces';

type ListItem = { title?: string; value?: string };

/** The little band picture for one look. Decorative: the label names the look. */
function Swatch({ look }: { look: SectionLook }) {
  const paper = SURFACE_BY_VALUE.background?.dot ?? '#ffffff';
  const soft = SURFACE_BY_VALUE.muted?.dot ?? '#f3f3f3';
  const ink = SURFACE_BY_VALUE.background?.dotInk ?? '#222222';
  const surface = LOOK_BY_VALUE[look]?.surface;
  const band = surface ? SURFACE_BY_VALUE[surface] : undefined;
  const stripes =
    look === 'standard' ? [paper, soft, paper] : [band?.dot ?? paper, band?.dot ?? paper];
  const lineInk = band?.themeStatic ? band.dotInk : ink;
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        width: 44,
        height: 30,
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)',
        flex: 'none',
      }}
    >
      {stripes.map((c, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            background: c,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 6,
          }}
        >
          <span style={{ width: i % 2 ? 18 : 24, height: 2, background: lineInk, opacity: 0.55 }} />
        </span>
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
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
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

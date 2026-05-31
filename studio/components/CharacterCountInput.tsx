// Foundation, edit with care.
//
// Global form input wrapper that shows a live character counter beneath any
// single-line or multi-line text field that declares a maximum length. The
// counter helps the editor stay inside SEO limits (title 60, description 160) while
// typing, instead of only finding out after they are already over.
//
// It's registered once at the config level (form.components.input in
// sanity.config.ts), so it wraps EVERY input in the Studio. To stay safe it
// renders the default input untouched for anything that isn't a capped text
// field: non-string types, dropdowns, and strings with no max all pass straight
// through with zero added markup.
//
// The max length is read from the field's own validation rule (Rule.max(n)), so
// no schema edits are needed to light up the counter. A field can also opt in
// explicitly with options: { maxChars: n }, which wins over the lookup.

import { useMemo } from 'react';
import { Badge, Flex, Stack } from '@sanity/ui';
import type { InputProps, StringInputProps } from 'sanity';

// Pull the max-length constraint out of a compiled schema validation rule.
// Sanity stores chained rules (e.g. Rule.required().max(60)) as a list of specs
// on each rule's internal _rules array; we look for the 'max' spec. Wrapped in
// try/catch so an internal-shape change degrades to "no counter" rather than
// throwing inside every input in the Studio.
function maxLenFromValidation(schemaType: unknown): number | undefined {
  try {
    const validation = (schemaType as { validation?: unknown })?.validation;
    const rules = Array.isArray(validation) ? validation : validation ? [validation] : [];
    for (const rule of rules) {
      const specs = (rule as { _rules?: Array<{ flag?: string; constraint?: unknown }> })?._rules ?? [];
      for (const spec of specs) {
        if (spec?.flag === 'max' && typeof spec.constraint === 'number') {
          return spec.constraint;
        }
      }
    }
  } catch {
    // Internal validation shape changed — silently skip the counter.
  }
  return undefined;
}

export function CharacterCountInput(props: InputProps) {
  const { schemaType } = props;

  // jsonType 'string' covers both the `string` and `text` field types.
  const isStringType = (schemaType as { jsonType?: string })?.jsonType === 'string';
  // Skip dropdowns — a counter under a fixed list of options is just noise.
  const isDropdown = Boolean((schemaType as { options?: { list?: unknown } })?.options?.list);

  const max = useMemo(() => {
    if (!isStringType || isDropdown) return undefined;
    const explicit = (schemaType as { options?: { maxChars?: number } })?.options?.maxChars;
    if (typeof explicit === 'number') return explicit;
    return maxLenFromValidation(schemaType);
  }, [schemaType, isStringType, isDropdown]);

  // Anything that isn't a capped text field renders exactly as it did before.
  if (!max) return props.renderDefault(props);

  const value = (props as StringInputProps).value;
  const len = typeof value === 'string' ? value.length : 0;
  const ratio = len / max;

  // Tone progression: muted while there's plenty of room, green once the field
  // is meaningfully filled (a 47/60 title is healthy), amber as it nears the
  // cap, red once it's over and would get truncated in search results.
  const tone =
    len > max ? 'critical' : ratio >= 0.9 ? 'caution' : ratio >= 0.5 ? 'positive' : 'default';

  return (
    <Stack space={2}>
      {props.renderDefault(props)}
      <Flex justify="flex-end">
        <Badge tone={tone} mode="outline" fontSize={1} padding={2} radius={2}>
          {len} / {max}
        </Badge>
      </Flex>
    </Stack>
  );
}

export default CharacterCountInput;

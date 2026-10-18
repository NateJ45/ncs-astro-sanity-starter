// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// CodeTextInput: a monospace box for pasted code, with a character count
// =============================================================================
// PORTS.md card 121. Used by the "Custom code or embed" block's code field and
// by Site settings' "Code on every page" fields. It is the Studio's own text
// area (so focus, read-only and presence all behave as usual) with three
// changes: a monospace face, no spellcheck or autocorrect, and a plain count
// underneath so an editor can tell at a glance that the whole snippet pasted.
// =============================================================================

import { Flex, Stack, Text, TextArea } from '@sanity/ui';
import type { TextInputProps } from 'sanity';

const MONO = 'ui-monospace, "SF Mono", "Cascadia Code", Consolas, "Liberation Mono", monospace';

export function CodeTextInput(props: TextInputProps) {
  const { elementProps, value, schemaType } = props;
  const rows = (schemaType as { rows?: number }).rows ?? 10;
  const count = typeof value === 'string' ? value.length : 0;
  const lines = typeof value === 'string' && value ? value.split('\n').length : 0;

  return (
    <Stack gap={2}>
      <TextArea
        {...elementProps}
        rows={rows}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        style={{ fontFamily: MONO, fontSize: 13, lineHeight: 1.5, tabSize: 2 }}
      />
      <Flex justify="flex-end">
        <Text size={1} muted>
          {count.toLocaleString('en-US')} {count === 1 ? 'character' : 'characters'}
          {lines > 1 ? `, ${lines.toLocaleString('en-US')} lines` : ''}
        </Text>
      </Flex>
    </Stack>
  );
}

export default CodeTextInput;

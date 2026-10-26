// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// The "Short address" box on a short link (PORTS.md card 171): the normal text
// box, with the whole address people will type shown live underneath it, so the
// editor sees "example.com/spring" while typing "spring".
import { Stack, Text } from '@sanity/ui';
import type { StringInputProps } from 'sanity';
import { normalizeShortAddress, shortAddressProblem } from '../../lib/short-links';
import { site } from '../../data/site';

export function ShortLinkAddressInput(props: StringInputProps) {
  const address = normalizeShortAddress(props.value);
  const ok = address && !shortAddressProblem(address);
  return (
    <Stack gap={2}>
      {props.renderDefault(props)}
      <Text size={1} muted>
        {ok ? (
          <>
            People type <strong>{`${site.domain}/${address}`}</strong>
          </>
        ) : (
          `People will type ${site.domain}/ and then this word.`
        )}
      </Text>
      {ok && address !== props.value && (
        <Text size={1} muted>
          {`It will work as "${address}": small letters, with dashes for spaces.`}
        </Text>
      )}
    </Stack>
  );
}

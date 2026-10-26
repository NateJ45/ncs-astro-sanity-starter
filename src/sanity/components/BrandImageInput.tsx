// Safe to edit by hand
// =============================================================================
// BrandImageInput - the logo and icon uploads in Site settings, with a preview
// =============================================================================
// PORTS.md card 168. Wraps the normal image field and draws, under it, where
// the picture will appear on the website: for the logo, the top bar in light
// and dark (one uploaded image serves both); for the icon, a browser tab and a
// phone's home screen. With nothing uploaded it shows the template's own files,
// which is what the site is using, so the editor sees what they would replace.
//
// A site that puts the icon somewhere else too (a footer mark, say) adds that
// spot to IconPreview; this file is per-site on purpose (not PORTABLE).
//
// The site picks an upload up at its next build (the publish webhook), so the
// note says "a few minutes after you publish". Guard rails (size, square) are
// the field's validation (src/lib/brand-uploads.ts); this file only draws.
//
// No new dependencies: @sanity/ui only, and the picture URL is assembled from
// the asset id by hand, as SeoSnippetInput does.
// =============================================================================
import type { ObjectInputProps } from 'sanity';
import { Box, Card, Flex, Stack, Text } from '@sanity/ui';
import brand from '../../../brand/brand.config.json';
import { envVal } from '../urls';
import defaultLogoLight from '../../assets/logo-light.svg?url';
import defaultLogoDark from '../../assets/logo-dark.svg?url';

const theme = brand.palette.theme as Record<string, string>;
const dark = (brand.palette as { dark?: Record<string, string> }).dark ?? {};
const PAPER = theme['--color-bg'] ?? '#FFFFFF';
const INK = theme['--color-accent'] ?? '#1E2024';
const NIGHT = dark['--background'] ?? theme['--color-accent-dark'] ?? '#1E2024';
/** The committed icon in public/, the file `npm run favicon` draws the set from. */
const DEFAULT_ICON = '/favicon.svg';

/** The CDN address of an uploaded image, from its asset id (image-<id>-<w>x<h>-<ext>). */
function uploadedUrl(value: unknown, width: number): string | null {
  const ref = (value as { asset?: { _ref?: string } } | undefined)?.asset?._ref;
  if (typeof ref !== 'string') return null;
  const parts = ref.split('-');
  if (parts.length < 4 || parts[0] !== 'image') return null;
  const projectId = envVal('SANITY_STUDIO_PROJECT_ID', 'PUBLIC_SANITY_PROJECT_ID');
  const dataset = envVal('SANITY_STUDIO_DATASET', 'PUBLIC_SANITY_DATASET') || 'production';
  if (!projectId) return null;
  const ext = parts[parts.length - 1];
  const body = parts.slice(1, -1).join('-');
  const size = ext === 'svg' ? '' : `?w=${width}`;
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${body}.${ext}${size}`;
}

function Label({ children }: { children: string }) {
  return (
    <Text size={1} muted>
      {children}
    </Text>
  );
}

/** A slice of the header: the logo on the left, a hint of the menu on the right. */
function HeaderStrip({ src, ground, ink }: { src: string; ground: string; ink: string }) {
  return (
    <Card padding={3} radius={2} shadow={1} style={{ background: ground }}>
      <Flex align="center" justify="space-between" gap={3}>
        <img src={src} alt="" style={{ height: 40, width: 'auto', maxWidth: '65%' }} />
        <Flex gap={2}>
          {[34, 42, 30].map((w) => (
            <Box
              key={w}
              style={{ width: w, height: 8, borderRadius: 4, background: ink, opacity: 0.18 }}
            />
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}

function LogoPreview({ uploaded }: { uploaded: string | null }) {
  return (
    <Flex gap={3} wrap="wrap">
      <Stack gap={2} flex={1} style={{ minWidth: 220 }}>
        <Label>The top of every page, light</Label>
        <HeaderStrip src={uploaded ?? defaultLogoLight} ground={PAPER} ink={INK} />
      </Stack>
      <Stack gap={2} flex={1} style={{ minWidth: 220 }}>
        <Label>And dark</Label>
        <HeaderStrip src={uploaded ?? defaultLogoDark} ground={NIGHT} ink="#FFFFFF" />
      </Stack>
    </Flex>
  );
}

function IconPreview({ src }: { src: string }) {
  return (
    <Flex gap={4} wrap="wrap" align="flex-end">
      <Stack gap={2}>
        <Label>A browser tab</Label>
        <Card padding={2} radius={2} shadow={1}>
          <Flex align="center" gap={2}>
            <img src={src} alt="" width={16} height={16} />
            <Text size={1}>{brand.name}</Text>
          </Flex>
        </Card>
      </Stack>
      <Stack gap={2}>
        <Label>A phone home screen</Label>
        <Flex gap={2} align="flex-end">
          <img
            src={src}
            alt=""
            width={60}
            height={60}
            style={{
              borderRadius: 14,
              background: PAPER,
              boxShadow: '0 1px 3px rgb(0 0 0 / .25)',
            }}
          />
          {/* The same icon once a phone crops it to a circle (Android): the
              build pads it onto a plate so the crop never cuts the mark. */}
          <Box
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              overflow: 'hidden',
              background: PAPER,
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 1px 3px rgb(0 0 0 / .25)',
            }}
          >
            <img src={src} alt="" width={36} height={36} />
          </Box>
        </Flex>
      </Stack>
    </Flex>
  );
}

function BrandImageInput(props: ObjectInputProps & { kind: 'logo' | 'icon' }) {
  const { kind } = props;
  const uploaded = uploadedUrl(props.value, kind === 'logo' ? 560 : 256);
  return (
    <Stack gap={4}>
      {props.renderDefault(props)}
      <Card padding={3} radius={2} tone={uploaded ? 'caution' : 'transparent'} border>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            {uploaded
              ? 'How your upload will look. The website switches to it a few minutes after you publish.'
              : 'Nothing uploaded, so the website uses the logo and icon it shipped with (shown here).'}
          </Text>
          {kind === 'logo' ? (
            <LogoPreview uploaded={uploaded} />
          ) : (
            <IconPreview src={uploaded ?? DEFAULT_ICON} />
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

/** The logo field's input (Site settings > Identity & contact). */
export function LogoImageInput(props: ObjectInputProps) {
  return <BrandImageInput {...props} kind="logo" />;
}

/** The square icon field's input. */
export function IconImageInput(props: ObjectInputProps) {
  return <BrandImageInput {...props} kind="icon" />;
}

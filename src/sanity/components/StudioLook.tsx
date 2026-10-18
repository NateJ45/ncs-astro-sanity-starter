// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The Studio's look beyond colours: navy chrome and text in the site's type
// (PORTS.md card 116)
// =============================================================================
// Two pieces, both through Sanity's supported extension points (no CSS aimed at
// Sanity's internal class names):
//
// 1. studioLook(fonts): a plugin whose `studio.components.navbar` middleware
//    draws the top bar in its own theme (buildChromeTheme in studioTheme.ts): the
//    brand's deep colour, dark scheme, in light AND dark appearance. It always
//    calls props.renderDefault(props), so every other navbar middleware (the
//    kit's status line) still runs.
//
//    StudioWordmarkNavbar: the site's wide wordmark beside the square icon at
//    the left of that bar (card 120), hidden under 600px where the bar is
//    tight. It is a SEPARATE middleware registered at the ROOT of
//    sanity.config, not part of studioLook: Sanity nests plugin middleware
//    with the earliest plugin outermost and the root config innermost, so only
//    the root sits directly around Sanity's own bar. Inside studioLook it would
//    also wrap the kit's status line and push it right. It always calls
//    renderDefault.
//
// 2. withEditorTypography(types, fonts): walks the schema and gives every
//    Portable Text style that does not already have one a `component` (the
//    block style render Sanity documents for this), so body text, headings and
//    quotes are edited in the site's fonts at a reading size, the way they
//    read on the page. A block with no `styles` list keeps Sanity's defaults.
//    Spacing between blocks stays Sanity's: only font, size, line height and
//    the quote rule change. Colours come from the card's CSS variables, so both
//    appearances work.
//
// The style dropdown renders the same components with only a title as
// children; there the sizes are capped so the menu stays compact.
// =============================================================================

import type { CSSProperties, ReactNode } from 'react';
import { definePlugin, type NavbarProps } from 'sanity';
import { Box, Card, Flex, ThemeProvider } from '@sanity/ui';
import { buildChromeTheme, HEADING_WEIGHT, type StudioFonts } from '../studioTheme';

// -----------------------------------------------------------------------------
// 1. The navbar
// -----------------------------------------------------------------------------

export const studioLook = definePlugin<StudioFonts>((fonts) => {
  const chrome = buildChromeTheme(fonts);
  function BrandNavbar(props: NavbarProps) {
    return (
      <ThemeProvider theme={chrome} scheme="dark">
        {props.renderDefault(props)}
      </ThemeProvider>
    );
  }
  return {
    name: 'ncs-studio-look',
    studio: { components: { navbar: BrandNavbar } },
  };
});

// -----------------------------------------------------------------------------
// 1b. The wordmark beside the square icon (card 120)
// -----------------------------------------------------------------------------

/** The page's boot data (src/pages/studio/index.astro, #ncs-studio-boot). */
function readWordmark(): { src: string; ratio: number | null } | null {
  if (typeof document === 'undefined') return null;
  try {
    const el = document.getElementById('ncs-studio-boot');
    const data = el?.textContent
      ? (JSON.parse(el.textContent) as { wordmark?: { src?: unknown; ratio?: unknown } | null })
      : null;
    const src = data?.wordmark?.src;
    if (typeof src !== 'string' || !src) return null;
    const ratio = Number(data?.wordmark?.ratio);
    return { src, ratio: ratio > 0 && ratio < 20 ? ratio : null };
  } catch {
    return null;
  }
}

/** The wordmark's height in the bar, in px (the square icon is 25). */
const WORDMARK_HEIGHT = 34;

/**
 * Navbar middleware for the ROOT of sanity.config (studio.components.navbar).
 * With no wordmark (none configured, or not loaded from /studio) it is just
 * Sanity's bar. The Card takes the bar's own navy and bottom rule from the
 * chrome theme studioLook has already put around it.
 */
export function StudioWordmarkNavbar(props: NavbarProps) {
  const wordmark = readWordmark();
  if (!wordmark) return props.renderDefault(props);
  return (
    <Flex align="stretch">
      <Card
        borderBottom
        display={['none', 'none', 'flex']}
        paddingLeft={3}
        style={{ alignItems: 'center', flexShrink: 0 }}
      >
        <img
          src={wordmark.src}
          alt=""
          aria-hidden
          draggable={false}
          data-testid="ncs-studio-wordmark"
          height={WORDMARK_HEIGHT}
          width={wordmark.ratio ? Math.round(WORDMARK_HEIGHT * wordmark.ratio) : undefined}
          style={{
            display: 'block',
            height: WORDMARK_HEIGHT,
            // The crop's own shape, so the box is the crop (no letterboxing).
            width: wordmark.ratio ? Math.round(WORDMARK_HEIGHT * wordmark.ratio) : 'auto',
            maxWidth: 240,
            objectFit: 'contain',
          }}
        />
      </Card>
      <Box flex={1} style={{ minWidth: 0 }}>
        {props.renderDefault(props)}
      </Box>
    </Flex>
  );
}

// -----------------------------------------------------------------------------
// 2. Portable Text in the site's typography
// -----------------------------------------------------------------------------

interface StyleSpec {
  font: 'display' | 'body';
  /** rem */
  size: number;
  lineHeight: number;
  weight?: 'heading' | number;
  quote?: boolean;
}

/** Sizes in rem, close to the site's body (17 to 18px) and its H2/H3 steps. */
export const EDITOR_STYLES: Record<string, StyleSpec> = {
  normal: { font: 'body', size: 1.0625, lineHeight: 1.6 },
  h1: { font: 'display', size: 2, lineHeight: 1.2, weight: 'heading' },
  h2: { font: 'display', size: 1.625, lineHeight: 1.25, weight: 'heading' },
  h3: { font: 'display', size: 1.3125, lineHeight: 1.3, weight: 'heading' },
  h4: { font: 'display', size: 1.125, lineHeight: 1.35, weight: 'heading' },
  h5: { font: 'body', size: 1, lineHeight: 1.4, weight: 600 },
  h6: { font: 'body', size: 0.9375, lineHeight: 1.4, weight: 600 },
  blockquote: { font: 'body', size: 1.125, lineHeight: 1.55, quote: true },
};

/** The largest size a style shows at in the style dropdown. */
const MENU_MAX_REM = 1.25;

function styleFor(spec: StyleSpec, fonts: StudioFonts, inMenu: boolean): CSSProperties {
  const size = inMenu ? Math.min(spec.size, MENU_MAX_REM) : spec.size;
  const weight = spec.weight === 'heading' ? (HEADING_WEIGHT ?? 700) : (spec.weight ?? 400);
  return {
    fontFamily: spec.font === 'display' ? fonts.display : fonts.body,
    fontSize: `${size}rem`,
    lineHeight: inMenu ? 1.25 : spec.lineHeight,
    fontWeight: weight,
    fontSynthesis: 'none',
    color: 'inherit',
    margin: 0,
    ...(spec.quote
      ? {
          borderLeft: '3px solid var(--card-link-fg-color, var(--card-border-color))',
          paddingLeft: '0.875em',
        }
      : null),
  };
}

type StyleComponent = (props: { children?: ReactNode; block?: unknown }) => ReactNode;

export function editorStyleComponents(fonts: StudioFonts): Record<string, StyleComponent> {
  return Object.fromEntries(
    Object.entries(EDITOR_STYLES).map(([value, spec]) => {
      const EditorStyle: StyleComponent = (props) => (
        <div data-editor-style={value} style={styleFor(spec, fonts, !props.block)}>
          {props.children}
        </div>
      );
      return [value, EditorStyle];
    }),
  );
}

type Def = Record<string, unknown>;

/**
 * The schema with a `component` on every Portable Text style this file knows
 * and that has none. Returns new objects only along changed paths; the input is
 * never mutated, and anything it does not recognise passes through.
 */
export function withEditorTypography<T>(types: T[], fonts: StudioFonts): T[] {
  const components = editorStyleComponents(fonts);

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      let changed = false;
      const out = node.map((n) => {
        const w = walk(n);
        if (w !== n) changed = true;
        return w;
      });
      return changed ? out : node;
    }
    if (!node || typeof node !== 'object') return node;
    const def = node as Def;
    let next = def;
    if (def.type === 'block' && Array.isArray(def.styles)) {
      next = {
        ...def,
        styles: def.styles.map((s: unknown) => {
          const style = s as Def | null;
          if (!style || typeof style !== 'object' || 'component' in style) return s;
          const value = String(style.value);
          return value in components ? { ...style, component: components[value] } : s;
        }),
      };
    }
    for (const key of ['fields', 'of']) {
      const child = next[key];
      if (!Array.isArray(child)) continue;
      const walked = walk(child);
      if (walked !== child) {
        if (next === def) next = { ...def };
        next[key] = walked;
      }
    }
    return next;
  };

  return types.map((t) => walk(t) as T);
}

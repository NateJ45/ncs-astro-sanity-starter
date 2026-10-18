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
import { ThemeProvider } from '@sanity/ui';
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

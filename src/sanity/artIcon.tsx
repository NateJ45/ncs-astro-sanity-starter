// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// A brand kit's icon file as a Sanity icon (PORTS.md card 119)
// =============================================================================
// Used by a site's src/sanity/brandIconArt.tsx. The file is drawn inside a 1em
// <svg data-sanity-icon>, the same shape as @sanity/icons, so Sanity sizes it
// like its own icons in every slot: desk rows, menus, field-group tabs, the
// create menu, the phone sidebar. (A bare <img> would be stretched to fill a
// preview's media box.) The art is shown exactly as drawn, its own colours
// included: nothing here redraws or recolours it.
// =============================================================================

import { forwardRef, type ComponentType, type SVGProps } from 'react';

/** What every icon in the registry is: an @sanity/icons-shaped component. */
export type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * `url` is the art file (a Vite `?url` import). `inset` is the share of the 1em
 * box left empty on each side, so full-bleed art sits at the visual size of the
 * @sanity/icons glyphs beside it (they leave about a fifth of their box empty).
 */
export function artIcon(url: string, title: string, inset = 0.1): BrandIcon {
  const size = 1 - inset * 2;
  const Art = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function Art(props, ref) {
    return (
      <svg
        ref={ref}
        data-sanity-icon={title}
        width="1em"
        height="1em"
        viewBox="0 0 1 1"
        fill="none"
        aria-hidden
        {...props}
      >
        <image
          href={url}
          x={inset}
          y={inset}
          width={size}
          height={size}
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    );
  });
  Art.displayName = `ArtIcon(${title})`;
  return Art;
}

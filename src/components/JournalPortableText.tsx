// Safe to edit by hand
// Renders a journal entry body. Handles standard Portable Text blocks plus
// seven custom inline types defined in studio/schemaTypes/journalEntry.ts:
//   - inlineImage  (with size variants: standard / wide / full)
//   - pullQuote    (editorial pull quote with optional attribution)
//   - beforeAfter  (drag-to-reveal slider, reuses BeforeAfterSlider)
//   - sourceCard   ("where I got it" vendor card)
//   - tipCallout   (labeled aside)
//   - imageGallery (grid2 / grid3 / row layouts)
//   - divider      (line / ornament / space)
//   - videoEmbed   (YouTube/Vimeo URL → responsive iframe)
//
// Headings get a stable id (derived from the heading text via slugify) so
// the auto-generated TOC and deep-link anchors work. Default block styles
// mirror the existing PortableText component, with one extra: "lead" style
// for the large intro paragraph.

import { PortableText as PT, type PortableTextComponents } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import { urlFor, parseSanityAssetDimensions } from '@/lib/sanity';
import { slugify } from '@/lib/slugify';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';

interface Props {
  value: PortableTextBlock[] | undefined | null;
  className?: string;
}

// Stable, unique heading ids per render so anchors don't collide if a post
// repeats a heading text.
function makeHeadingId(seen: Map<string, number>, children: any): string {
  const text = Array.isArray(children)
    ? children
        .map((c) => (typeof c === 'string' ? c : c?.props?.children ?? ''))
        .join('')
        .trim()
    : String(children ?? '').trim();
  const base = slugify(text);
  const count = (seen.get(base) ?? 0) + 1;
  seen.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

// Parse a YouTube or Vimeo URL into an embed src. Returns null for anything else.
function videoEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    // YouTube — handle youtube.com/watch?v=, youtu.be/, /embed/, /shorts/
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/^\/(?:embed|shorts)\/([^/?#]+)/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split(/[/?#]/)[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // Vimeo — handle vimeo.com/{id}
    if (/(^|\.)vimeo\.com$/.test(u.hostname)) {
      const id = u.pathname.replace(/^\//, '').split(/[/?#]/)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    /* fall through */
  }
  return null;
}

function makeComponents(): PortableTextComponents {
  const seen = new Map<string, number>();
  let firstNormalRendered = false;

  return {
    block: {
      // Default paragraph — drop cap on the first paragraph only, via CSS ::first-letter.
      normal: ({ children }) => {
        const isFirst = !firstNormalRendered;
        firstNormalRendered = true;
        return (
          <p className={`my-m text-foreground/90 leading-relaxed text-lg${isFirst ? ' prose-drop-cap' : ''}`}>
            {children}
          </p>
        );
      },
      // Lead paragraph — slightly larger, lighter weight, italic-feeling intro.
      lead: ({ children }) => (
        <p className="my-l text-foreground text-[1.35rem] leading-relaxed font-light first:mt-0">
          {children}
        </p>
      ),
      h2: ({ children }) => (
        <h2
          id={makeHeadingId(seen, children)}
          className="mt-section-lg mb-m font-display text-h2 text-foreground scroll-mt-24"
        >
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3
          id={makeHeadingId(seen, children)}
          className="mt-section-md mb-s font-display text-h3 text-foreground scroll-mt-24"
        >
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4
          id={makeHeadingId(seen, children)}
          className="mt-l mb-s font-display text-h4 text-foreground scroll-mt-24"
        >
          {children}
        </h4>
      ),
      blockquote: ({ children }) => (
        <blockquote className="prose-blockquote">
          {children}
        </blockquote>
      ),
    },

    list: {
      bullet: ({ children }) => (
        <ul className="my-m list-disc pl-l space-y-2 text-foreground/90 text-lg leading-relaxed">{children}</ul>
      ),
      number: ({ children }) => (
        <ol className="my-m list-decimal pl-l space-y-2 text-foreground/90 text-lg leading-relaxed">{children}</ol>
      ),
    },
    listItem: {
      bullet: ({ children }) => <li className="pl-s">{children}</li>,
      number: ({ children }) => <li className="pl-s">{children}</li>,
    },

    marks: {
      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      underline: ({ children }) => <span className="underline underline-offset-4">{children}</span>,
      // Highlight uses bg-accent (theme-aware) for a subtle warm callout effect.
      highlight: ({ children }) => (
        <span className="bg-accent/60 px-1 rounded-sm text-foreground">{children}</span>
      ),
      link: ({ children, value }) => {
        const href = value?.href ?? '#';
        const isExternal = /^https?:\/\//.test(href);
        const newTab = value?.openInNewTab || isExternal;
        return (
          <a
            href={href}
            className="text-link underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        );
      },
      // Sourced-from annotation. Italic with a vendor eyebrow trailing. With
      // a URL, becomes a quiet bronze underlined link — pair this with
      // sourceCard when the item deserves a full card with image + price.
      sourcedFrom: ({ children, value }) => {
        const label = value?.vendor ?? '';
        const inner = (
          <span className="italic text-foreground/90">
            {children}
            {label && (
              <span className="ml-1 text-[0.72em] uppercase tracking-[0.15em] text-secondary not-italic align-baseline">
                · {label}
              </span>
            )}
          </span>
        );
        if (!value?.url) return inner;
        return (
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link decoration-primary/30 underline underline-offset-4 hover:decoration-primary transition-colors"
          >
            {inner}
          </a>
        );
      },
    },

    // Custom inline types — one renderer per schema's `type`/`name`.
    types: {
      // -- inline image (with size variants + caption) ---------------------
      inlineImage: ({ value }) => {
        if (!value?.asset) return null;
        const size: 'standard' | 'wide' | 'full' = value.size ?? 'wide';
        const targetWidth = size === 'full' ? 2400 : size === 'wide' ? 1600 : 800;
        const url = urlFor(value).width(targetWidth).quality(75).format('webp').url();
        const url2x = urlFor(value).width(targetWidth * 2).quality(75).format('webp').url();
        // Intrinsic dimensions from the Sanity asset _ref do two jobs:
        // (1) reserve the aspect-ratio box before the file lands (kills the
        //     CLS Lighthouse used to flag), and (2) let us detect portrait
        //     orientation so vertical photos don't stretch the page taller
        //     than the viewport. Portrait shots always cap at ~600 px wide
        //     centered, regardless of the editor's chosen size (standard /
        //     wide / full) — width-bleed treatments only make sense for
        //     landscape compositions.
        const dims = parseSanityAssetDimensions(value);
        const isPortrait = dims ? dims.height > dims.width : false;
        const wrapperClass = isPortrait
          ? 'my-section-md mx-auto max-w-[600px]'
          : size === 'full'
            ? '-mx-m md:-mx-section-lg lg:-mx-[8vw] my-section-md'
            : size === 'wide'
            ? 'my-section-md'
            : 'my-l max-w-2xl mx-auto';
        return (
          <figure className={wrapperClass}>
            <img
              src={url}
              srcSet={`${url} 1x, ${url2x} 2x`}
              width={dims?.width}
              height={dims?.height}
              alt={value.alt ?? ''}
              loading="lazy"
              decoding="async"
              className="w-full h-auto rounded-md"
            />
            {value.caption && (
              <figcaption className="mt-s text-sm text-muted-foreground italic text-center">
                {value.caption}
              </figcaption>
            )}
          </figure>
        );
      },

      // -- pull quote -----------------------------------------------------
      pullQuote: ({ value }) => {
        if (!value?.quote) return null;
        return (
          <figure className="my-section-lg py-section-md border-y border-border-soft text-center">
            <span
              aria-hidden="true"
              className="block font-display text-[clamp(3rem,6vw,5rem)] leading-none text-link/45 select-none mb-[-1.5rem]"
            >
              "
            </span>
            <blockquote className="font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-snug text-foreground max-w-2xl mx-auto px-m">
              {value.quote}
            </blockquote>
            {value.attribution && (
              <figcaption className="mt-l text-xs uppercase tracking-widest text-foreground/80">
                — {value.attribution}
              </figcaption>
            )}
          </figure>
        );
      },

      // -- before/after slider --------------------------------------------
      beforeAfter: ({ value }) => {
        if (!value?.beforeImage?.asset || !value?.afterImage?.asset) return null;
        return (
          <div className="my-section-md -mx-m md:mx-0">
            <BeforeAfterSlider
              beforeImage={value.beforeImage}
              afterImage={value.afterImage}
              caption={value.caption}
            />
          </div>
        );
      },

      // -- source card ----------------------------------------------------
      sourceCard: ({ value }) => {
        if (!value?.itemName) return null;
        const hasImage = !!value.image?.asset;
        const inner = (
          <div className="flex gap-l items-start p-l bg-muted rounded-md border border-border-soft">
            {hasImage && (
              <div className="shrink-0 w-24 h-24 rounded-md overflow-hidden bg-card">
                <img
                  src={urlFor(value.image).width(200).quality(75).format('webp').url()}
                  width={96}
                  height={96}
                  alt={value.image.alt ?? ''}
                  loading="lazy"
                  decoding="async"
                      className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest text-foreground/80 mb-xs">
                Source
              </p>
              <p className="font-display text-h4 text-foreground leading-tight">{value.itemName}</p>
              {(value.vendor || value.price) && (
                <p className="mt-xs text-sm text-foreground/80">
                  {value.vendor}
                  {value.vendor && value.price && <span className="mx-xs text-muted-foreground">·</span>}
                  {value.price && <span className="font-mono text-link">{value.price}</span>}
                </p>
              )}
              {value.notes && (
                <p className="mt-s text-sm text-foreground/85 italic">{value.notes}</p>
              )}
              {value.url && (
                <p className="mt-s">
                  <a
                    href={value.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs font-semibold uppercase tracking-widest text-link hover:text-primary-dark"
                  >
                    View source <span aria-hidden="true" className="ml-xs">→</span>
                  </a>
                </p>
              )}
            </div>
          </div>
        );
        return <div className="my-l max-w-2xl mx-auto">{inner}</div>;
      },

      // -- tip callout ----------------------------------------------------
      tipCallout: ({ value }) => {
        if (!value?.content) return null;
        return (
          <aside
            className="my-section-md p-l border-l-4 border-tertiary bg-muted/70 rounded-r-md"
            aria-label={value.label ?? 'Note'}
          >
            <p className="text-xs uppercase tracking-widest text-foreground/80 font-semibold mb-s">
              {value.label ?? "Designer's note"}
            </p>
            <div className="text-foreground/90 [&_p]:my-s [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-s [&_ul]:pl-l [&_ul]:list-disc [&_a]:text-link [&_a]:underline [&_a]:underline-offset-2">
              <PT value={value.content} />
            </div>
          </aside>
        );
      },

      // -- image gallery --------------------------------------------------
      imageGallery: ({ value }) => {
        const images: any[] = Array.isArray(value?.images) ? value.images : [];
        if (images.length === 0) return null;
        const layout: 'grid2' | 'grid3' | 'row' = value.layout ?? 'grid2';
        const gridClass =
          layout === 'grid3'
            ? 'grid grid-cols-2 md:grid-cols-3 gap-s'
            : layout === 'row'
            ? 'flex gap-s overflow-x-auto snap-x snap-mandatory pb-s -mx-m px-m md:overflow-visible md:mx-0 md:px-0 md:grid md:grid-cols-3'
            : 'grid grid-cols-1 md:grid-cols-2 gap-s';
        return (
          <figure className="my-section-md">
            <div className={gridClass}>
              {images.map((img, i) => {
                if (!img?.asset) return null;
                const url = urlFor(img).width(900).quality(75).format('webp').url();
                // 4:3 crop is enforced by `aspect-[4/3]` in CSS, so the
                // width/height pair just needs to encode the SAME ratio to
                // reserve layout space — exact pixel values don't matter.
                return (
                  <div
                    key={img._key ?? i}
                    className={layout === 'row' ? 'snap-start shrink-0 w-[80%] md:w-auto md:shrink' : ''}
                  >
                    <img
                      src={url}
                      width={800}
                      height={600}
                      alt={img.alt ?? ''}
                      loading="lazy"
                      decoding="async"
                              className="w-full h-full object-cover rounded-md aspect-[4/3]"
                    />
                    {img.caption && (
                      <p className="mt-xs text-xs text-muted-foreground italic">{img.caption}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {value.caption && (
              <figcaption className="mt-s text-sm text-muted-foreground italic text-center">
                {value.caption}
              </figcaption>
            )}
          </figure>
        );
      },

      // -- divider --------------------------------------------------------
      divider: ({ value }) => {
        const style: 'line' | 'ornament' | 'space' = value?.style ?? 'ornament';
        if (style === 'space') return <div className="my-section-lg" aria-hidden="true"></div>;
        if (style === 'line') {
          return (
            <hr className="my-section-lg border-t border-border-soft max-w-md mx-auto" aria-hidden="true" />
          );
        }
        return (
          <div className="my-section-lg text-center" aria-hidden="true">
            <span className="font-display text-2xl text-secondary tracking-[0.5em] pl-[0.5em]">
              ✺ ✺ ✺
            </span>
          </div>
        );
      },

      // -- video embed (YouTube / Vimeo) ---------------------------------
      videoEmbed: ({ value }) => {
        const src = value?.url ? videoEmbedSrc(value.url) : null;
        if (!src) return null;
        return (
          <figure className="my-section-md">
            <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
              <iframe
                src={src}
                title={value.caption ?? 'Video'}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>
            {value.caption && (
              <figcaption className="mt-s text-sm text-muted-foreground italic text-center">
                {value.caption}
              </figcaption>
            )}
          </figure>
        );
      },
    },
  };
}

export default function JournalPortableText({ value, className }: Props) {
  if (!value || value.length === 0) return null;
  return (
    <div className={className}>
      <PT value={value} components={makeComponents()} />
    </div>
  );
}

// Foundation, edit with care
// Renders Sanity Portable Text into on-brand HTML. Used for any rich-text
// content from Sanity: faqItem.answer, service.longDescription, processStep.fullDescription,
// philosophyPoint.description, page singleton story/intro blocks, project.introStory.
//
// Style discipline: this component picks the right semantic + brand tokens so
// Portable Text content inherits theme-aware colors automatically. Body text
// uses text-foreground (dark-mode-aware). Links use text-link with
// underline for contrast and discoverability. Don't hard-code colors here.

import { PortableText as PT, type PortableTextComponents } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import { urlFor, parseSanityAssetDimensions } from '@/lib/sanity';
import { slugify } from '@/lib/slugify';

interface Props {
  value: PortableTextBlock[] | undefined | null;
  /** Optional className applied to the wrapping div for spacing/typography overrides per slot. */
  className?: string;
}

// Build a fresh slug-tracking map per render so headings get stable, unique
// ids that match the TOC extracted server-side via extractHeadings().
function makeComponents(): PortableTextComponents {
  const seen = new Map<string, number>();
  const headingId = (children: any): string => {
    const text = Array.isArray(children)
      ? children.map((c) => (typeof c === 'string' ? c : c?.props?.children ?? '')).join('').trim()
      : String(children ?? '').trim();
    const base = slugify(text);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };

  return {
  block: {
    normal: ({ children }) => <p className="my-m text-foreground">{children}</p>,
    h2: ({ children }) => (
      <h2 id={headingId(children)} className="mt-section-md mb-m font-display text-h2 text-foreground scroll-mt-24">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 id={headingId(children)} className="mt-l mb-s font-display text-h3 text-foreground scroll-mt-24">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 id={headingId(children)} className="mt-m mb-s font-display text-h4 text-foreground scroll-mt-24">{children}</h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-l border-l-4 border-primary pl-m italic text-foreground/90">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="my-m list-disc pl-l space-y-1 text-foreground">{children}</ul>,
    number: ({ children }) => <ol className="my-m list-decimal pl-l space-y-1 text-foreground">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li className="text-foreground">{children}</li>,
    number: ({ children }) => <li className="text-foreground">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ children, value }) => {
      const href = value?.href ?? '#';
      const isExternal = /^https?:\/\//.test(href);
      const newTab = value?.openInNewTab || isExternal;
      return (
        <a
          href={href}
          className="text-link underline underline-offset-2 hover:text-primary transition-colors"
          target={newTab ? '_blank' : undefined}
          rel={newTab ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      );
    },
    // Sourced-from annotation. Italic small-caps treatment inline; when a URL
    // is provided, becomes a quiet bronze underlined link.
    sourcedFrom: ({ children, value }) => {
      const label = value?.vendor ?? '';
      const inner = (
        <span className="italic text-foreground/85">
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
          className="text-link decoration-primary/30 underline underline-offset-2 hover:decoration-primary transition-colors"
        >
          {inner}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;
      const url = urlFor(value).width(1600).quality(75).format('webp').url();
      const url2x = urlFor(value).width(3200).quality(75).format('webp').url();
      // Intrinsic dimensions from the asset _ref serve two purposes:
      // (1) the browser reserves aspect-ratio space before the image lands
      //     (kills CLS), and (2) we can detect orientation to choose a
      //     sensible figure width — portrait shots blown out to full column
      //     width are taller than the viewport, so we cap them ~600 px wide
      //     and center. Landscape shots keep the editorial full-bleed.
      const dims = parseSanityAssetDimensions(value);
      const isPortrait = dims ? dims.height > dims.width : false;
      const figClass = isPortrait
        ? 'my-section-md mx-auto max-w-[600px]'
        : 'my-section-md -mx-m md:mx-0';
      return (
        <figure className={figClass}>
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
          {(value.decisionLine || value.caption) && (
            <figcaption className="mt-s px-m md:px-0">
              {value.decisionLine && (
                <span className="block text-xs uppercase tracking-eyebrow text-foreground/80 mb-xs">
                  {value.decisionLine}
                </span>
              )}
              {value.caption && (
                <span className="block text-sm md:text-base text-foreground/75 italic leading-relaxed">
                  {value.caption}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      );
    },
  },
  };
}

export default function PortableText({ value, className }: Props) {
  if (!value || value.length === 0) return null;
  return (
    <div className={className}>
      <PT value={value} components={makeComponents()} />
    </div>
  );
}

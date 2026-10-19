// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The Site Guide's front page, in the kit's design language (PORTS.md card 128)
// =============================================================================
// The banner, a search box that reads every word of every guide, the first
// guide of the first group featured as a large card on the colour edge (the
// "Start here"), the "Watch how it is done" row (card 115) and then every
// group under its own section rule, as cards with each guide's art.
// Plain props: GuideTool hands in the guides and what a click does.
// =============================================================================

import type { ReactNode } from 'react';
import { guideMeaning } from '../../../lib/studio-look';
import { strings } from '../../../lib/studio-checkup';
import type { KitGuide } from '../types';
import {
  ArtTile,
  ColourEdge,
  KitCard,
  KitScope,
  LOOK,
  PageBanner,
  SectionRule,
  StatusBadge,
  StoneTag,
} from '../ui';

/** Does a guide mention every word (title, lead and the whole text)? */
export function guideMatches(guide: KitGuide, words: string[]): boolean {
  if (!words.length) return true;
  const hay = [guide.title, guide.lead, ...strings(guide.body)].join(' ').toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function searchWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export interface GuideIndexProps {
  guides: KitGuide[];
  categories: readonly string[];
  helper: string;
  query: string;
  onQuery: (q: string) => void;
  onOpen: (slug: string) => void;
  /** The "Watch how it is done" row, when any guide has a video. */
  videos?: ReactNode;
}

function Featured({
  guide,
  helper,
  onOpen,
}: {
  guide: KitGuide;
  helper: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="ui-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto',
        gap: 24,
        alignItems: 'center',
        padding: '30px 28px 28px',
        background: LOOK.texture
          ? `var(--ui-banner-bg) url(${LOOK.texture}) 0 0 / 420px`
          : 'var(--ui-banner-bg)',
        borderColor: 'transparent',
        color: 'var(--ui-banner-ink)',
      }}
    >
      <span style={{ position: 'absolute', inset: '0 0 auto' }}>
        <ColourEdge height={6} />
      </span>
      <span style={{ display: 'grid', gap: 10, minWidth: 0 }}>
        <span className="ui-eyebrow" style={{ color: 'var(--ui-banner-muted)' }}>
          Start here
        </span>
        <span
          style={{
            fontFamily: 'var(--ui-display)',
            fontSize: 'clamp(26px, 2.4vw + 12px, 36px)',
            lineHeight: 1.12,
            textWrap: 'balance',
          }}
        >
          {guide.title}
        </span>
        <span style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--ui-banner-muted)' }}>
          {guide.lead}
        </span>
        <span style={{ marginTop: 6 }}>
          <StatusBadge level={guide.diy} helper={helper} onDark />
        </span>
      </span>
      <span className="ui-no-print" style={{ display: 'grid' }}>
        <ArtTile meaning={guideMeaning(guide.icon)} size={96} ground={LOOK.light.paper} seed={5} />
      </span>
    </button>
  );
}

export function GuideIndex({
  guides,
  categories,
  helper,
  query,
  onQuery,
  onOpen,
  videos,
}: GuideIndexProps) {
  const words = searchWords(query);
  const shown = guides.filter((g) => guideMatches(g, words));
  const featured = !words.length ? guides.find((g) => g.category === categories[0]) : undefined;
  return (
    <KitScope>
      <div style={{ display: 'grid', gap: 40 }}>
        <PageBanner
          headingId="site-guide"
          eyebrow={`${guides.length} guides`}
          title="Site Guide"
          lead="Step-by-step help for the jobs you do on the website. Pick what you want to do, or search for a word."
          meaning="guide"
        />

        <div role="search" style={{ display: 'grid', gap: 8 }}>
          <label
            htmlFor="ncs-guide-search"
            className="ui-eyebrow"
            style={{ color: 'var(--ui-heading)' }}
          >
            Search the guides
          </label>
          <input
            id="ncs-guide-search"
            type="search"
            value={query}
            placeholder="I want to..."
            onChange={(e) => onQuery(e.currentTarget.value)}
            style={{
              font: 'inherit',
              fontSize: 19,
              padding: '14px 18px',
              borderRadius: 'var(--ui-radius)',
              border: '1.5px solid var(--ui-rule)',
              background: 'var(--ui-surface)',
              color: 'var(--ui-ink)',
              width: '100%',
            }}
          />
          {words.length > 0 && (
            <p className="ui-muted" aria-live="polite" style={{ fontSize: 15 }}>
              {shown.length === 0
                ? `No guide mentions that yet. Try another word, or ask ${helper}.`
                : `${shown.length} ${shown.length === 1 ? 'guide mentions' : 'guides mention'} that.`}
            </p>
          )}
        </div>

        {featured && (
          <Featured guide={featured} helper={helper} onOpen={() => onOpen(featured.slug)} />
        )}

        {videos}

        {categories.map((category) => {
          const mine = shown.filter((g) => g.category === category && g !== featured);
          if (!mine.length) return null;
          const id = `guide-group-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          return (
            <section key={category} aria-labelledby={id} style={{ display: 'grid', gap: 18 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <SectionRule />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                  <h2 id={id} className="ui-h2">
                    {category}
                  </h2>
                  <StoneTag tone="plain">
                    {mine.length} {mine.length === 1 ? 'guide' : 'guides'}
                  </StoneTag>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                  gap: 14,
                }}
              >
                {mine.map((g) => (
                  <KitCard
                    key={g.slug}
                    title={g.title}
                    lead={g.lead}
                    meaning={guideMeaning(g.icon)}
                    onClick={() => onOpen(g.slug)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </KitScope>
  );
}

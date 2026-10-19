// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// One Site Guide page, in the kit's design language (PORTS.md card 128)
// =============================================================================
// Renders a guide from the site's guide data (src/sanity/guides/content.ts):
// the deep-colour banner with the guide's own art, then its blocks in a wide
// reading column, every heading led by the site's section rule, numbered steps
// as a StepPath, callouts in the look's tones, button names as copies of the
// real buttons, "See also" as cards, and a letterhead that only prints.
//
// The guide FORMAT is unchanged and old entries render as they are: the block
// kinds and callout tones from card 41 all still work. New, optional:
//   - blocks { kind: 'shot', key } (a capture from the site's registry,
//     src/sanity/guides/shots.ts, card 130) or { kind: 'shot', ...GuideShotData },
//     and { kind: 'quote', text, cite? };
//   - steps { across: true } for a short walk drawn across the page;
//   - callout tones 'note' | 'tip' | 'careful' (the old 'primary' is a note,
//     'positive' a tip, 'caution' and 'critical' are careful);
//   - a guide `icon` may name a meaning in the icon registry ('times'), and the
//     old names ('clock') map to one (guideMeaning in studio-look.ts).
//
// Plain props, no Studio hooks: GuideTool and the site's GuideView hand in the
// link maker, so the page renders on a bare test page too.
// =============================================================================

import type { ReactNode } from 'react';
import {
  findGuide,
  guideMeaning,
  resolveShot,
  type GuideShotBlock,
} from '../../../lib/studio-look';
import { GUIDE_SHOTS } from '../../guides/shots';
import type { StudioTarget } from '../../../lib/studio-kit';
import type { KitGuide } from '../types';
import {
  GuideShot,
  InlineText,
  KitCard,
  KitNotice,
  KitScope,
  PageBanner,
  PullQuote,
  SectionRule,
  StatusBadge,
  Stone,
  StepPath,
  UiChip,
  type Tone,
} from '../ui';

/** Every block a guide can hold. Old kinds and tones are kept as they were (card 41). */
export type KitGuideBlock =
  | { kind: 'h'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'steps'; items: string[]; across?: boolean }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'path'; items: string[]; link?: StudioTarget }
  | {
      kind: 'callout';
      tone?:
        'primary' | 'positive' | 'caution' | 'critical' | 'default' | 'note' | 'tip' | 'careful';
      title?: string;
      text: string;
    }
  | { kind: 'seealso'; items: string[] }
  | ({ kind: 'shot' } & GuideShotBlock)
  | { kind: 'quote'; text: string; cite?: string };

const TONES: Record<string, Tone> = {
  primary: 'note',
  note: 'note',
  positive: 'tip',
  tip: 'tip',
  caution: 'careful',
  critical: 'careful',
  careful: 'careful',
  default: 'plain',
};

export type LinkMaker = (target: StudioTarget) => {
  href: string;
  onClick: (event: React.MouseEvent) => void;
};

export interface GuidePageProps {
  guide: KitGuide;
  /** Every guide, so "See also" can open the one it names. */
  guides: KitGuide[];
  /** Who to ask ("Nathan"). */
  helper: string;
  /** The site's name, for the printed letterhead. */
  siteName: string;
  /** Opens another guide by slug (See also). Without it the cards are plain. */
  onOpen?: (slug: string) => void;
  /** Turns a "Where in the Studio" link into a router link. */
  linkTo?: LinkMaker;
  /** 'panel' for the narrow "Help for this page" inspector: a compact banner. */
  variant?: 'page' | 'panel';
}

function WhereCard({
  items,
  link,
  linkTo,
}: {
  items: string[];
  link?: StudioTarget;
  linkTo?: LinkMaker;
}) {
  const go = link && linkTo ? linkTo(link) : null;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px 16px',
        padding: '16px 20px',
        borderRadius: 'var(--ui-radius)',
        border: '1px solid var(--ui-rule)',
        background: 'var(--ui-surface)',
      }}
    >
      <span className="ui-eyebrow ui-muted" style={{ width: '100%', fontSize: 12 }}>
        Where in the Studio
      </span>
      <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, flex: 1 }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && (
              <span aria-label="then" role="img" style={{ display: 'inline-flex', gap: 3 }}>
                {[0, 1, 2].map((k) => (
                  <Stone key={k} size={7} fill="var(--ui-connector)" seed={i * 3 + k} />
                ))}
              </span>
            )}
            <UiChip name={item} />
          </span>
        ))}
      </span>
      {go && (
        <a
          href={go.href}
          onClick={go.onClick}
          style={{ fontWeight: 700, fontSize: 15, marginLeft: 'auto', textUnderlineOffset: 4 }}
        >
          Take me there
        </a>
      )}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10, maxWidth: '40rem' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', gap: 8 }}>
          <span style={{ paddingTop: 8 }}>
            <Stone index={i} size={11} seed={i + 50} />
          </span>
          <span>
            <InlineText text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Block({ block, props }: { block: KitGuideBlock; props: GuidePageProps }) {
  switch (block.kind) {
    case 'p':
      return (
        <p className="ui-p">
          <InlineText text={block.text} />
        </p>
      );
    case 'steps':
      return (
        <StepPath
          across={block.across}
          items={block.items.map((t, i) => (
            <InlineText key={i} text={t} />
          ))}
        />
      );
    case 'bullets':
      return <Bullets items={block.items} />;
    case 'path':
      return <WhereCard items={block.items} link={block.link} linkTo={props.linkTo} />;
    case 'callout':
      return (
        <KitNotice tone={TONES[block.tone ?? 'default'] ?? 'plain'} title={block.title}>
          <InlineText text={block.text} />
        </KitNotice>
      );
    case 'seealso': {
      const found = block.items.map((ref) => ({ ref, g: findGuide(props.guides, ref) }));
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
          }}
        >
          {found.map(({ ref, g }) =>
            g ? (
              <KitCard
                key={ref}
                title={g.title}
                lead={g.lead}
                meaning={guideMeaning(g.icon)}
                onClick={props.onOpen ? () => props.onOpen?.(g.slug) : undefined}
              />
            ) : (
              <p key={ref} className="ui-muted">
                {ref}
              </p>
            ),
          )}
        </div>
      );
    }
    case 'shot': {
      const shot = resolveShot(block, GUIDE_SHOTS);
      return shot ? <GuideShot shot={shot} /> : null;
    }
    case 'quote':
      return <PullQuote cite={block.cite}>{block.text}</PullQuote>;
    default:
      return null;
  }
}

/** Splits the body at each heading, so every heading's section carries its rule. */
function sections(body: KitGuideBlock[]) {
  const out: { h?: string; blocks: KitGuideBlock[] }[] = [{ blocks: [] }];
  for (const b of body) {
    if (b.kind === 'h') out.push({ h: b.text, blocks: [] });
    else if (b.kind === 'seealso') out.push({ h: 'See also', blocks: [b] });
    else out[out.length - 1].blocks.push(b);
  }
  return out.filter((s) => s.h || s.blocks.length);
}

export function GuidePage(props: GuidePageProps) {
  const { guide, helper, siteName, variant = 'page' } = props;
  const body = (Array.isArray(guide.body) ? guide.body : []) as KitGuideBlock[];
  const panel = variant === 'panel';
  const headingId = `guide-${guide.slug}`;
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <KitScope>
      <article style={{ display: 'grid', gap: panel ? 28 : 40 }}>
        <header
          className="ui-print-only"
          style={{ borderBottom: '2px solid #000', paddingBottom: 10 }}
        >
          <p style={{ fontFamily: 'var(--ui-display)', fontSize: '20pt' }}>{siteName}</p>
          <p style={{ fontSize: '10pt' }}>
            Site Guide{guide.category ? `: ${guide.category}` : ''}. Printed {today}.
          </p>
        </header>
        <PageBanner
          compact={panel}
          headingId={headingId}
          eyebrow={panel ? undefined : `Site Guide${guide.category ? ` · ${guide.category}` : ''}`}
          title={guide.title}
          lead={guide.lead}
          meaning={guideMeaning(guide.icon)}
          foot={<StatusBadge level={guide.diy} helper={helper} onDark />}
        />
        {sections(body).map((s, i) => (
          <Section key={i} heading={s.h} panel={panel}>
            {s.blocks.map((b, j) => (
              <Block key={j} block={b} props={props} />
            ))}
          </Section>
        ))}
      </article>
    </KitScope>
  );
}

function Section({
  heading,
  panel,
  children,
}: {
  heading?: string;
  panel: boolean;
  children: ReactNode;
}) {
  return (
    <section style={{ display: 'grid', gap: panel ? 16 : 22 }}>
      {heading && (
        <div style={{ display: 'grid', gap: 14 }}>
          <SectionRule />
          <h2 className="ui-h2" style={panel ? { fontSize: 22 } : undefined}>
            {heading}
          </h2>
        </div>
      )}
      {children}
    </section>
  );
}

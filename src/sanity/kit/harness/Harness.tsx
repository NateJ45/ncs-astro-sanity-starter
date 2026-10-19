// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The kit's test bench (PORTS.md card 128): DEV SERVER ONLY
// =============================================================================
// /kit-harness/<name>/ exists only under `npm run dev` (its getStaticPaths
// returns nothing in a build), so nothing here ever ships. Two benches:
//
//   studio  the REAL Studio (sanity.config.ts, every plugin, the kit) signed in
//           as a pretend administrator through Sanity's createMockAuthStore.
//           Reads of a public dataset work; anything that needs a real
//           session (writes, users, the Worker routes) fails quietly. For
//           checking the chrome: the navbar status line, the Site Guide tool.
//   guide   the Guide's pieces on a bare page in the Studio theme:
//           ?view=index|page|panel|ui, &g=<guide slug>, &scheme=light|dark.
//           ?view=surfaces&part=all|tool|checkup|clear|loading|failed|home (card 131).
//
// Screenshots: scripts/studio-harness-shots.mjs (run with the dev server up).
// =============================================================================

import { useMemo, useState } from 'react';
import { createClient } from '@sanity/client';
import { createMockAuthStore, Studio, type Config } from 'sanity';
import { Card, ThemeProvider } from '@sanity/ui';
import config from '../../../../sanity.config';
import brand from '../../../../brand/brand.config.json';
import { buildStudioTheme } from '../../studioTheme';
import { kitConfig } from '../../kit.config';
import { GuideIndex } from '../guide/GuideIndex';
import { GuidePage } from '../guide/GuidePage';
import {
  GuideShot,
  KitCard,
  KitLoading,
  KitNotice,
  KitPanel,
  KitScope,
  PullQuote,
  SeverityStone,
  StepPath,
  UiChip,
} from '../ui';
import { PLACEHOLDER_SHOT, type GuideShotData } from '../../../lib/studio-look';
import { SurfacesBench } from './Surfaces';
import { HomeBanner } from '../HomeBanner';
import { BANNER_LOOKS } from './bannerLooks';

/** The Studio's two font stacks, as sanity.config.ts uses them. */
const fonts = (brand as { studio: { fonts: { display: string; body: string } } }).studio.fonts;

/** The wireframe a guide shows for a shot key the site has no capture for (card 130). */
export const EXAMPLE_SHOT: GuideShotData = PLACEHOLDER_SHOT;

function mockStudioConfig(): Config {
  const base = config as Config & { projectId: string; dataset: string };
  const client = createClient({
    projectId: base.projectId,
    dataset: base.dataset,
    apiVersion: '2025-02-19',
    useCdn: false,
  });
  return {
    ...base,
    basePath: '/kit-harness/studio',
    auth: createMockAuthStore({
      client,
      currentUser: {
        id: 'harness-user',
        name: 'Ann Harness',
        email: 'harness@example.test',
        role: 'administrator',
        roles: [{ name: 'administrator', title: 'Administrator' }],
      },
    }),
  } as Config;
}

function StudioBench() {
  const cfg = useMemo(mockStudioConfig, []);
  return (
    <div style={{ height: '100vh' }}>
      <Studio config={cfg} />
    </div>
  );
}

/**
 * Card 135: Home's banner with a style from bannerLooks.ts (?look=fbcm|presacademy|reid|mas|stonesteps),
 * or the site's own (?look=site, the default) or none (?look=none), so each shape and the
 * stamp can be looked at without a signed-in Studio.
 */
function BannerBench({ look }: { look: string }) {
  const site = kitConfig.homeBanner ?? {};
  const banner =
    look === 'site'
      ? site
      : look === 'none'
        ? { ...site, style: undefined }
        : { ...site, style: BANNER_LOOKS[look]?.style };
  return (
    <HomeBanner
      now={new Date('2026-10-19T09:30:00')}
      hello="Good morning"
      firstName="Ann"
      title={brand.name}
      intro="You cannot break the website by editing. Nothing goes live until you press Publish."
      banner={banner}
    />
  );
}

function GuideBench() {
  const q = new URLSearchParams(window.location.search);
  const scheme = q.get('scheme') === 'dark' ? 'dark' : 'light';
  const view = q.get('view') ?? 'page';
  const theme = useMemo(() => buildStudioTheme(fonts), []);
  const { guides, categories } = kitConfig.guide;
  const [query, setQuery] = useState(q.get('q') ?? '');
  const [slug, setSlug] = useState(q.get('g') ?? guides[0]?.slug);
  const guide = guides.find((g) => g.slug === slug) ?? guides[0];
  const page = (
    <GuidePage
      guide={guide}
      guides={guides}
      helper={kitConfig.helper.name}
      siteName={kitConfig.siteName}
      onOpen={setSlug}
      variant={view === 'panel' ? 'panel' : 'page'}
      // Card 134: &s=<heading> opens at that section, as a field's "How to" does.
      section={q.get('s') ?? undefined}
      linkTo={() => ({ href: '#', onClick: (e) => e.preventDefault() })}
    />
  );
  return (
    <ThemeProvider theme={theme} scheme={scheme}>
      <Card style={{ minHeight: '100vh' }} padding={[3, 4, 5]}>
        <div
          style={{
            maxWidth:
              view === 'panel' ? 380 : view === 'surfaces' || view === 'banner' ? 1100 : 820,
            margin: '0 auto',
          }}
        >
          {view === 'index' && (
            <GuideIndex
              guides={guides}
              categories={categories}
              helper={kitConfig.helper.name}
              query={query}
              onQuery={setQuery}
              onOpen={setSlug}
            />
          )}
          {(view === 'page' || view === 'panel') && page}
          {view === 'surfaces' && <SurfacesBench part={q.get('part') ?? 'all'} />}
          {view === 'banner' && <BannerBench look={q.get('look') ?? 'none'} />}
          {view === 'ui' && (
            <KitScope>
              <div style={{ display: 'grid', gap: 36 }}>
                <KitPanel title="Shared pieces" label="Card 128">
                  <p>
                    Chips: <UiChip name="Publish" /> <UiChip name="Home" />{' '}
                    <UiChip name="Discard changes" /> <UiChip name="+ Add item" />
                  </p>
                  <p style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <SeverityStone level="needs" />
                    <SeverityStone level="worth" />
                    <SeverityStone level="good" />
                  </p>
                  <KitLoading label="Laying the path" />
                </KitPanel>
                <StepPath across items={['Saved', 'Building', 'On the website']} />
                <KitNotice tone="tip" title="A tip">
                  The tip tone.
                </KitNotice>
                <PullQuote cite="The Studio">You cannot break the website by editing.</PullQuote>
                <GuideShot shot={EXAMPLE_SHOT} />
                <KitCard title="A card" lead="With a line under it." meaning="times" />
              </div>
            </KitScope>
          )}
        </div>
      </Card>
    </ThemeProvider>
  );
}

export default function Harness({ name }: { name: string }) {
  return name === 'studio' ? <StudioBench /> : <GuideBench />;
}

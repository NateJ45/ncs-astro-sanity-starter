// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// The Report screen on made-up numbers (Studio kit, PORTS.md card 218)
// =============================================================================
// /styleguide/report/ mounts this: BoardScreen in the site's Studio colours,
// fed by src/lib/studio-board-fixture.ts instead of the route, so the screen
// can be looked at and tested (tests/board-report.spec.ts) with no sign-in and
// no Google. Nothing here reads a real number.
//
//   ?p=m|q|y&k=<key>     the period to open on
//   ?scheme=dark         the dark Studio colours
//   ?config=site         the site's own parts and words (src/config/board.ts)
//                        instead of the fixed bench config the tests pin
//   ?state=not-set-up | connect | failed | signed-out   the other screens
// =============================================================================

import { useMemo } from 'react';
import brand from '../../../../brand/brand.config.json';
import { boardPeriod, type BoardConfig } from '../../../lib/studio-board';
import { BENCH_CONFIG, BENCH_TODAY, fixtureReport } from '../../../lib/studio-board-fixture';
import { LOOK, SURFACE_RADIUS } from '../ui/look';
import { BoardScreen, type BoardLoad } from './BoardScreen';

const fonts = (brand as { studio?: { fonts?: { display: string; body: string } } }).studio
  ?.fonts ?? { display: 'Georgia, serif', body: 'system-ui, sans-serif' };

export default function BoardBench({ siteConfig }: { siteConfig: BoardConfig }) {
  const q = useMemo(() => new URLSearchParams(window.location.search), []);
  const dark = q.get('scheme') === 'dark';
  const state = q.get('state');
  // The site's own config is shown as if it had been counting all along, so every part has numbers.
  const config = useMemo<BoardConfig>(
    () =>
      q.get('config') === 'site'
        ? {
            ...siteConfig,
            firstMonth: BENCH_CONFIG.firstMonth,
            since: { all: '2025-01-01' },
            gaps: [],
          }
        : BENCH_CONFIG,
    [q, siteConfig],
  );
  const load = useMemo<BoardLoad>(
    () => async (p, k) => {
      if (state === 'signed-out') return 'signed-out';
      if (state === 'not-set-up') return { configured: false, reason: 'no-ga4' };
      if (state === 'connect') return { configured: true, connect: true };
      if (state === 'failed') return { configured: true, error: 'failed' };
      const per = boardPeriod(config, p, k, BENCH_TODAY);
      return {
        configured: true,
        p: per.p,
        k: per.k,
        today: BENCH_TODAY,
        report: fixtureReport(per.from, per.to),
        at: `${BENCH_TODAY}T09:00:00Z`,
      };
    },
    [config, state],
  );
  const t = dark ? LOOK.dark : LOOK.light;
  return (
    <div style={{ minHeight: '100vh', background: t.paper, padding: 'clamp(12px, 3vw, 40px)' }}>
      <div style={{ maxWidth: 1480, margin: '0 auto' }}>
        <BoardScreen
          config={config}
          load={load}
          helperName="your web helper"
          initial={{ p: q.get('p') ?? undefined, k: q.get('k') ?? undefined, today: BENCH_TODAY }}
          tokens={{ scheme: t, dark, fonts, radius: SURFACE_RADIUS }}
        />
      </div>
    </div>
  );
}

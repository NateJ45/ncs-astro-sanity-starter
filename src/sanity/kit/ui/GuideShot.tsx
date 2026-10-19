// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// GuideShot: a picture of the Studio with the site's own marks on it (card 128)
// =============================================================================
// A guide block ({ kind: 'shot', ... }) and a primitive any surface can use. The
// data shape (GuideShotData in src/lib/studio-look.ts) is made for captures:
//
//   { kind: 'shot', src: '/guide-shots/publish.png', width: 1280, height: 800,
//     alt: 'The editor with the Publish button at the bottom right',
//     marks: [
//       { kind: 'ring', x: 78, y: 90, w: 20, h: 8, label: 'The Publish button' },
//       { kind: 'stone', x: 88, y: 86 },                       // numbered 1, 2... in order
//       { kind: 'arrow', x: 60, y: 60, toX: 80, toY: 88 },
//     ],
//     caption: 'Publish is always at the bottom right.' }
//
// Positions are PERCENT of the picture, so a recapture at another size keeps its
// marks. Capture at 1280 wide, light appearance, and keep the file under 300 KB
// (PNG or WebP) in public/guide-shots/. Stones are the look's numbered stones;
// they shrink with the picture on a phone (css.ts). Rings and arrows draw in the
// marker colour with a paper halo so they read on any screenshot. Guides ask for a
// picture by KEY (src/sanity/guides/shots.ts, card 130) rather than writing it
// out. Each mark's label goes into a key under the picture, which is also what a
// screen reader hears (the picture itself has its alt).
// =============================================================================

import { useId, type CSSProperties } from 'react';
import { shotMarks, shotSrc, type GuideShotData } from '../../../lib/studio-look';
import { Stone, useLookTokens } from './primitives';

export function GuideShot({ shot }: { shot: GuideShotData }) {
  const t = useLookTokens();
  // One arrowhead per picture: ids must be unique when a guide holds several shots.
  const head = `ncs-shot-head-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const src = shotSrc(shot.src);
  if (!src || !shot.alt) return null;
  const W = Number(shot.width) > 0 ? Number(shot.width) : 1280;
  const H = Number(shot.height) > 0 ? Number(shot.height) : 800;
  const marks = shotMarks(shot.marks);
  const px = (v: number) => (v / 100) * W;
  const py = (v: number) => (v / 100) * H;
  // Strokes scale with the picture; 0.45% of its width reads at 1280 and at a phone's 340.
  const sw = Math.max(3, W * 0.0045);
  const keyed = marks.filter((m) => m.label);
  return (
    <figure className="ui-shot">
      <div className="ui-shot__frame" style={{ aspectRatio: `${W} / ${H}` }}>
        <img src={src} alt={shot.alt} width={W} height={H} loading="lazy" draggable={false} />
        <svg className="ui-shot__marks" viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <defs>
            <marker
              id={head}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10Z" fill={t.marker} />
            </marker>
          </defs>
          {marks.map((m, i) => {
            if (m.kind === 'ring') {
              const r = Math.min(px(m.w), py(m.h)) * 0.25;
              const box = { x: px(m.x), y: py(m.y), width: px(m.w), height: py(m.h), rx: r };
              return (
                <g key={i}>
                  <rect
                    {...box}
                    fill="none"
                    stroke={t.paper}
                    strokeWidth={sw * 1.9}
                    opacity={0.85}
                  />
                  <rect {...box} fill="none" stroke={t.marker} strokeWidth={sw} />
                </g>
              );
            }
            if (m.kind === 'arrow') {
              const line = { x1: px(m.x), y1: py(m.y), x2: px(m.toX), y2: py(m.toY) };
              return (
                <g key={i} strokeLinecap="round">
                  <line {...line} stroke={t.paper} strokeWidth={sw * 1.9} opacity={0.85} />
                  <line {...line} stroke={t.marker} strokeWidth={sw} markerEnd={`url(#${head})`} />
                </g>
              );
            }
            return null;
          })}
        </svg>
        {marks.map((m, i) =>
          m.kind === 'stone' ? (
            <span
              key={i}
              className="ui-shot__stone"
              style={{ left: `${m.x}%`, top: `${m.y}%` } as CSSProperties}
            >
              <Stone index={(m.n ?? 1) - 1} n={m.n} size={40} />
            </span>
          ) : null,
        )}
      </div>
      {keyed.length > 0 && (
        <ol className="ui-shot__key">
          {keyed.map((m, i) => (
            <li key={i}>
              {m.kind === 'stone' ? (
                <Stone index={(m.n ?? 1) - 1} n={m.n} size={26} />
              ) : (
                <Stone size={14} fill={t.marker} seed={i + 30} />
              )}
              <span>{m.label}</span>
            </li>
          ))}
        </ol>
      )}
      {shot.caption && <figcaption className="ui-shot__cap">{shot.caption}</figcaption>}
    </figure>
  );
}

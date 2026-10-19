// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words live in kit.config.ts)
// =============================================================================
// Spotlight tours, the welcome and "What's new" (Studio kit, card 137)
// =============================================================================
// Card 106 had one stepped dialog. Card 137 makes it a tour ENGINE driven by
// kit.config.ts:
//   - `tours`: each a list of stops anchored to real Studio UI. A stop lights
//     its anchor (a dimmed screen with a cut-out round it) and opens a popover
//     beside it in the card 128 language: the tour's name, the step's art on a
//     stone, the title, the words, a row of stones for progress, and Back,
//     Next and Skip. Anchors are the kit's data-tour hooks or a short,
//     documented list of Sanity's own (src/lib/studio-tour.ts SANITY_ANCHORS).
//     An anchor that is not on screen after a moment is not an error: the
//     popover sits in the middle with no cut-out.
//   - Tours are offered on first run (per role: the staff view or the full
//     Studio), on demand ("Show me around" on Home and in the Site Guide) and
//     per tool ("How this screen works", TourButton below).
//   - `welcome`: a modal shown once per person before anything else, whose
//     "Show me around" starts their first-run tour.
//   - `whatsNew`: a dated changelog; entries newer than the last one this
//     person saw open once, newest first.
// The old `tourSteps` still work: with no `tours`, they become one first-run
// tour with no anchors (each step in the middle), as before.
//
// Remembered in localStorage per Sanity user (keys in studio-tour.ts). When
// storage throws, nothing opens by itself: fail safe, never nag. The capture
// scripts set 'ncs-studio-kit:quiet' so nothing covers a recording.
//
// Keyboard: focus moves into the popover and stays there (Tab cycles), Right
// and Left step, Escape skips, and focus goes back where it was. Reduced
// motion: no glide, no fade.
// =============================================================================

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useCurrentUser } from 'sanity';
import { Box, Button, Dialog, Flex } from '@sanity/ui';
import { TOUR_OPEN_EVENT, useStaffView, useStudioLink } from './shared';
import { ArtTile, KitAction, KitNotice, KitScope, LOOK, Lettering, StepTrail } from './ui';
import type { BrandIconKey } from '../../lib/studio-icons';
import {
  LEGACY_SEEN_PREFIX,
  allTours,
  anchorSelectors,
  newestNews,
  newsDate,
  pickTour,
  placePopover,
  seenKeys,
  spotlightBox,
  toolTour,
  unseenNews,
  type Box as Rect,
  type TourDef,
  type TourStop,
  type WelcomeConfig,
  type WhatsNewEntry,
} from '../../lib/studio-tour';
import type { KitConfig, TourStep } from './types';

/** Fired to open the What's new modal (Home's "What's new"). */
export const WHATS_NEW_EVENT = 'ncs-studio-kit-whats-new';

/** Start a tour by id, or the person's first-run tour with none. */
export function startTour(id?: string) {
  window.dispatchEvent(new CustomEvent(TOUR_OPEN_EVENT, { detail: { id } }));
}

// The tours this Studio has, set once by the plugin so TourButton can ask.
let REGISTERED: TourDef[] = [];
export function registerTours(tours: TourDef[]) {
  REGISTERED = tours;
}
export function registeredTours(): TourDef[] {
  return REGISTERED;
}

const reduced = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || LOOK.motion === 'none');

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The element an anchor names, if one is on screen. */
function findAnchor(anchor: string | undefined): HTMLElement | null {
  for (const sel of anchorSelectors(anchor)) {
    try {
      const all = document.querySelectorAll<HTMLElement>(sel);
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
    } catch {
      /* a bad selector in config: treat as missing */
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// Presentational pieces (drawn on the kit harness too)
// -----------------------------------------------------------------------------

/** One step of the card 106 tour as a card: kept for sites and the harness that draw it. */
export function TourCard({ steps, step }: { steps: TourStep[]; step: number }) {
  const at = Math.min(Math.max(step, 0), steps.length - 1);
  const current = steps[at];
  return (
    <KitScope>
      <div style={{ display: 'grid', gap: 22 }}>
        <div className="ui-trail ui-tour-trail">
          <StepTrail words={steps.map((s) => s.short ?? s.title)} current={at} />
        </div>
        <section
          className="ui-banner ui-banner--compact"
          aria-labelledby="ncs-studio-kit-tour-title"
        >
          <div className="ui-banner__in">
            <div style={{ minWidth: 0 }}>
              <p className="ui-banner__eyebrow ui-eyebrow" style={{ margin: 0 }}>
                A quick tour
              </p>
              <h2 id="ncs-studio-kit-tour-title" className="ui-banner__title">
                <Lettering text={current.title} />
              </h2>
            </div>
            <span className="ui-banner__disc">
              <ArtTile
                meaning={current.meaning ?? 'guide'}
                size={64}
                ground={LOOK.light.paper}
                seed={at * 7 + 5}
              />
            </span>
          </div>
        </section>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: 'var(--ui-ink)' }}>
          {current.body}
        </p>
      </div>
    </KitScope>
  );
}

const POP_CSS = `
.ncs-tour-pop{box-sizing:border-box;width:min(380px,calc(100vw - 24px));background:var(--ui-surface);color:var(--ui-ink);border:1px solid var(--ui-rule);border-radius:calc(var(--ui-radius) + 4px);box-shadow:0 24px 60px -24px rgb(0 0 0 / .55),0 2px 8px rgb(0 0 0 / .12);overflow:hidden}
.ncs-tour-pop:focus{outline:none}
.ncs-tour-pop__head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:16px 18px 14px;background:var(--ui-banner-bg);color:var(--ui-banner-ink)}
.ncs-tour-pop__eyebrow{margin:0;font:650 12px/1.3 var(--ui-body);letter-spacing:.08em;text-transform:uppercase;color:var(--ui-banner-muted)}
.ncs-tour-pop__title{margin:4px 0 0;font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:22px;line-height:1.15;color:var(--ui-banner-ink);text-wrap:balance}
.ncs-tour-pop__body{padding:16px 18px 6px;font-size:16px;line-height:1.6;margin:0}
.ncs-tour-pop__stones{display:flex;gap:6px;align-items:center;padding:8px 18px 0;margin:0;list-style:none}
.ncs-tour-pop__stone{width:10px;height:10px;border-radius:50%;border:2px solid var(--ui-heading);background:transparent}
.ncs-tour-pop__stone[data-on="done"]{background:var(--ui-heading)}
.ncs-tour-pop__stone[data-on="now"]{background:var(--ui-marker);border-color:var(--ui-marker);width:22px;border-radius:6px}
.ncs-tour-pop__foot{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:14px 18px 16px}
.ncs-tour-pop__count{flex:1;font-size:14px;color:var(--ui-muted)}
.ncs-tour-sheet{width:auto}
.ncs-tour-veil{position:fixed;inset:0;z-index:100000}
.ncs-tour-veil svg{position:absolute;inset:0;width:100%;height:100%}
.ncs-tour-ring{position:fixed;border-radius:12px;box-shadow:0 0 0 3px var(--ui-focus,#fff);pointer-events:none;transition:all .28s cubic-bezier(.3,.7,.3,1)}
.ncs-tour-float{position:fixed;z-index:100001;transition:left .28s cubic-bezier(.3,.7,.3,1),top .28s cubic-bezier(.3,.7,.3,1)}
@media (prefers-reduced-motion: reduce){.ncs-tour-ring,.ncs-tour-float{transition:none}}
`;

/** The popover's contents: drawn by the engine, and bare on the harness. */
export function TourPopoverCard({
  tour,
  index,
  onBack,
  onNext,
  onSkip,
  sheet,
}: {
  tour: TourDef;
  index: number;
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  sheet?: boolean;
}) {
  const step = tour.steps[index];
  const last = index >= tour.steps.length - 1;
  const titleId = `ncs-tour-title-${tour.id}`;
  return (
    <KitScope>
      <style>{POP_CSS}</style>
      <div
        className={`ncs-tour-pop${sheet ? 'ncs-tour-sheet' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-body`}
        tabIndex={-1}
        data-tour-popover=""
      >
        <div className="ncs-tour-pop__head">
          <div style={{ minWidth: 0 }}>
            <p className="ncs-tour-pop__eyebrow">{tour.title}</p>
            <h2 id={titleId} className="ncs-tour-pop__title">
              <Lettering text={step.title} />
            </h2>
          </div>
          <ArtTile
            meaning={(step.meaning as BrandIconKey | undefined) ?? 'guide'}
            size={48}
            ground={LOOK.light.paper}
            seed={index * 7 + 5}
          />
        </div>
        <p id={`${titleId}-body`} className="ncs-tour-pop__body">
          {step.body}
        </p>
        <ol className="ncs-tour-pop__stones" aria-hidden>
          {tour.steps.map((s, i) => (
            <li
              key={i}
              className="ncs-tour-pop__stone"
              data-on={i < index ? 'done' : i === index ? 'now' : 'later'}
              title={s.short ?? s.title}
            />
          ))}
        </ol>
        <div className="ncs-tour-pop__foot">
          <span className="ncs-tour-pop__count">
            Step {index + 1} of {tour.steps.length}
          </span>
          {!last && (
            <KitAction quiet onClick={onSkip}>
              Skip
            </KitAction>
          )}
          {index > 0 && <KitAction onClick={onBack}>Back</KitAction>}
          <KitAction strong onClick={onNext}>
            {last ? 'Done' : 'Next'}
          </KitAction>
        </div>
      </div>
    </KitScope>
  );
}

/** The welcome modal's body. */
export function WelcomeCard({ welcome }: { welcome: WelcomeConfig }) {
  return (
    <KitScope>
      <div style={{ display: 'grid', gap: 18 }}>
        <section className="ui-banner ui-banner--compact" aria-labelledby="ncs-kit-welcome-title">
          <div className="ui-banner__in">
            <div style={{ minWidth: 0 }}>
              <p className="ui-banner__eyebrow ui-eyebrow" style={{ margin: 0 }}>
                Welcome
              </p>
              <h2 id="ncs-kit-welcome-title" className="ui-banner__title">
                <Lettering text={welcome.title} />
              </h2>
            </div>
            <span className="ui-banner__disc">
              <ArtTile meaning="home" size={64} ground={LOOK.light.paper} seed={11} />
            </span>
          </div>
        </section>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6 }}>{welcome.body}</p>
        {welcome.points?.length ? (
          <ul
            style={{
              margin: 0,
              paddingLeft: 22,
              display: 'grid',
              gap: 6,
              fontSize: 16,
              lineHeight: 1.55,
            }}
          >
            {welcome.points.slice(0, 4).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </KitScope>
  );
}

/** The What's new modal's body: the entries, newest first. */
export function WhatsNewCard({
  entries,
  onTour,
}: {
  entries: WhatsNewEntry[];
  onTour?: (id: string) => void;
}) {
  return (
    <KitScope>
      <div style={{ display: 'grid', gap: 22 }}>
        {entries.map((e) => (
          <section key={e.date + e.title} style={{ display: 'grid', gap: 8 }}>
            <p className="ui-eyebrow" style={{ margin: 0 }}>
              {newsDate(e.date)}
            </p>
            <h3 className="ui-h3" style={{ margin: 0 }}>
              {e.title}
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: 22,
                display: 'grid',
                gap: 4,
                fontSize: 16,
                lineHeight: 1.55,
              }}
            >
              {e.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            {e.tour && onTour && (
              <div>
                <KitAction onClick={() => onTour(e.tour!)}>Show me</KitAction>
              </div>
            )}
          </section>
        ))}
      </div>
    </KitScope>
  );
}

// -----------------------------------------------------------------------------
// The spotlight
// -----------------------------------------------------------------------------

function Spotlight({ tour, onClose }: { tour: TourDef; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [size, setSize] = useState({
    w: 380,
    h: 260,
    vw: window.innerWidth,
    vh: window.innerHeight,
  });
  const popRef = useRef<HTMLDivElement>(null);
  const linkTo = useStudioLink();
  const step: TourStop = tour.steps[index];
  const back = useRef<Element | null>(document.activeElement);

  // Go where the step asks first.
  useEffect(() => {
    if (step.goTo) linkTo(step.goTo).onClick({ preventDefault: () => {} });
  }, [step, linkTo]);

  // Find the anchor (it may arrive after a navigation), scroll it in, then keep the box fresh.
  useEffect(() => {
    let raf = 0;
    let el: HTMLElement | null = null;
    const started = performance.now();
    const tick = () => {
      if (!el && step.anchor) {
        el = findAnchor(step.anchor);
        if (el) el.scrollIntoView({ block: 'center', behavior: reduced() ? 'instant' : 'smooth' });
      }
      if (el && el.isConnected) {
        const r = el.getBoundingClientRect();
        setRect((old) =>
          old && old.x === r.x && old.y === r.y && old.w === r.width && old.h === r.height
            ? old
            : { x: r.x, y: r.y, w: r.width, h: r.height },
        );
      } else if (!step.anchor || performance.now() - started > 1500) {
        setRect(null);
      }
      const p = popRef.current?.firstElementChild?.getBoundingClientRect();
      setSize((s) => {
        const n = {
          w: p?.width ?? s.w,
          h: p?.height ?? s.h,
          vw: window.innerWidth,
          vh: window.innerHeight,
        };
        return n.w === s.w && n.h === s.h && n.vw === s.vw && n.vh === s.vh ? s : n;
      });
      raf = requestAnimationFrame(tick);
    };
    setRect(null);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // Focus into the popover on each step; give it back at the end.
  useLayoutEffect(() => {
    const pop = popRef.current?.querySelector<HTMLElement>('[data-tour-popover]');
    pop?.focus({ preventScroll: true });
  }, [index]);
  useEffect(() => () => (back.current as HTMLElement | null)?.focus?.(), []);

  const last = index >= tour.steps.length - 1;
  const next = useCallback(() => (last ? onClose() : setIndex((i) => i + 1)), [last, onClose]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'Tab') {
      const items = [...(popRef.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? [])];
      if (!items.length) return;
      const first = items[0];
      const lastItem = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))
      ) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const spot = rect ? spotlightBox(rect, size.vw, size.vh) : null;
  const place = placePopover(spot, size.w, size.h, size.vw, size.vh, step.placement);
  const floatStyle: CSSProperties =
    place.mode === 'sheet'
      ? { left: 12, right: 12, top: place.y }
      : { left: place.x, top: place.y };

  return createPortal(
    <div onKeyDown={onKey}>
      <div className="ncs-tour-veil" aria-hidden onClick={(e) => e.stopPropagation()}>
        <svg>
          <defs>
            <mask id="ncs-tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {spot && (
                <rect x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx={12} fill="black" />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgb(10 14 20 / .58)" mask="url(#ncs-tour-mask)" />
        </svg>
        {spot && (
          <KitScope>
            <div
              className="ncs-tour-ring"
              style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }}
            />
          </KitScope>
        )}
      </div>
      <div ref={popRef} className="ncs-tour-float" style={floatStyle}>
        <TourPopoverCard
          tour={tour}
          index={index}
          onBack={prev}
          onNext={next}
          onSkip={onClose}
          sheet={place.mode === 'sheet'}
        />
      </div>
    </div>,
    document.body,
  );
}

// -----------------------------------------------------------------------------
// The host: decides what opens, mounted once in the Studio layout
// -----------------------------------------------------------------------------

type Open =
  | { kind: 'welcome' }
  | { kind: 'news'; entries: WhatsNewEntry[] }
  | { kind: 'tour'; tour: TourDef }
  | null;

export function StudioTour({
  steps,
  config,
}: {
  /** The card 106 steps (still works on its own). */
  steps?: TourStep[];
  config?: Pick<KitConfig, 'tours' | 'welcome' | 'whatsNew' | 'tourSteps' | 'staff'>;
}) {
  const user = useCurrentUser();
  const { staffView } = useStaffView({ staff: config?.staff ?? [] });
  const tours = useMemo(() => allTours(config?.tours, config?.tourSteps ?? steps), [config, steps]);
  const welcome = config?.welcome;
  const news = config?.whatsNew;
  const uid = user?.id ?? 'anyone';
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => registerTours(tours), [tours]);

  // First run: the welcome, else the first-run tour; later visits: unseen news.
  useEffect(() => {
    if (!user) return;
    const s = store();
    if (!s) return;
    try {
      if (s.getItem('ncs-studio-kit:quiet')) return;
      const first = pickTour(tours, staffView);
      const firstSeen = (t?: TourDef) =>
        !t ||
        Boolean(s.getItem(seenKeys.tour(uid, t))) ||
        (t.id === 'first-run' && Boolean(s.getItem(LEGACY_SEEN_PREFIX + uid)));
      const newsSeen = s.getItem(seenKeys.whatsNew(uid));
      if (welcome && !s.getItem(seenKeys.welcome(uid, welcome))) {
        // A new person: the changelog is history to them, so mark it read.
        const newest = newestNews(news);
        if (newest) s.setItem(seenKeys.whatsNew(uid), newest);
        setOpen({ kind: 'welcome' });
      } else if (!welcome && first?.firstRun && !firstSeen(first)) {
        const newest = newestNews(news);
        if (newest) s.setItem(seenKeys.whatsNew(uid), newest);
        setOpen({ kind: 'tour', tour: first });
      } else {
        const fresh = unseenNews(news, newsSeen);
        if (fresh.length) setOpen({ kind: 'news', entries: fresh });
      }
    } catch {
      /* storage blocked: open nothing by ourselves */
    }
  }, [user, uid, tours, staffView, welcome, news]);

  // "Show me around", "How this screen works", "Take the tour again", "What's new".
  useEffect(() => {
    const onTour = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string } | undefined>).detail?.id;
      const t = pickTour(tours, staffView, id);
      if (t) setOpen({ kind: 'tour', tour: t });
    };
    const onNews = () => setOpen({ kind: 'news', entries: unseenNews(news, null) });
    window.addEventListener(TOUR_OPEN_EVENT, onTour);
    window.addEventListener(WHATS_NEW_EVENT, onNews);
    return () => {
      window.removeEventListener(TOUR_OPEN_EVENT, onTour);
      window.removeEventListener(WHATS_NEW_EVENT, onNews);
    };
  }, [tours, staffView, news]);

  const remember = (key: string, value = '1') => {
    try {
      store()?.setItem(key, value);
    } catch {
      /* nothing to remember with */
    }
  };

  if (!open) return null;

  if (open.kind === 'tour') {
    return (
      <Spotlight
        key={open.tour.id}
        tour={open.tour}
        onClose={() => {
          remember(seenKeys.tour(uid, open.tour));
          if (open.tour.id === 'first-run') remember(LEGACY_SEEN_PREFIX + uid);
          setOpen(null);
        }}
      />
    );
  }

  if (open.kind === 'welcome' && welcome) {
    const close = () => {
      remember(seenKeys.welcome(uid, welcome));
      setOpen(null);
    };
    const tour = pickTour(tours, staffView, welcome.tour);
    return (
      <Dialog
        id="ncs-studio-kit-welcome"
        header="Welcome to the website editor"
        width={1}
        onClose={close}
        footer={
          <Box padding={3}>
            <Flex align="center" gap={3} justify="flex-end" wrap="wrap">
              <Button text="Not now" mode="ghost" fontSize={2} padding={3} onClick={close} />
              {tour && (
                <Button
                  text="Show me around"
                  tone="primary"
                  fontSize={2}
                  padding={3}
                  onClick={() => {
                    remember(seenKeys.welcome(uid, welcome));
                    setOpen({ kind: 'tour', tour });
                  }}
                />
              )}
            </Flex>
          </Box>
        }
      >
        <Box padding={[4, 5]}>
          <WelcomeCard welcome={welcome} />
        </Box>
      </Dialog>
    );
  }

  if (open.kind === 'news') {
    const close = () => {
      const newest = newestNews(news);
      if (newest) remember(seenKeys.whatsNew(uid), newest);
      setOpen(null);
    };
    return (
      <Dialog
        id="ncs-studio-kit-whats-new"
        header="What's new in the editor"
        width={1}
        onClose={close}
        footer={
          <Box padding={3}>
            <Flex justify="flex-end">
              <Button text="Got it" tone="primary" fontSize={2} padding={3} onClick={close} />
            </Flex>
          </Box>
        }
      >
        <Box padding={[4, 5]}>
          {open.entries.length ? (
            <WhatsNewCard
              entries={open.entries}
              onTour={(id) => {
                close();
                const t = pickTour(tours, staffView, id);
                if (t) setOpen({ kind: 'tour', tour: t });
              }}
            />
          ) : (
            <KitScope>
              <KitNotice tone="plain">Nothing new yet.</KitNotice>
            </KitScope>
          )}
        </Box>
      </Dialog>
    );
  }
  return null;
}

/**
 * "How this screen works": a quiet button that starts the tool's tour. Renders
 * nothing when the site has no tour for that tool (or for this person's view).
 */
export function TourButton({
  tool,
  staff,
  label = 'How this screen works',
}: {
  tool: string;
  staff: boolean;
  label?: string;
}) {
  const t = toolTour(registeredTours(), tool, staff);
  if (!t) return null;
  return (
    <KitScope inline>
      <KitAction quiet onClick={() => startTour(t.id)}>
        {label}
      </KitAction>
    </KitScope>
  );
}

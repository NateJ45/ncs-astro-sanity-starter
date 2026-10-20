// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// The kit's design language: its one stylesheet (PORTS.md card 128)
// =============================================================================
// Every rule is scoped under .ncs-ui (KitScope draws it), so nothing reaches
// into Sanity's own markup. Colours are CSS variables KitScope sets from the
// resolved look for the current scheme, so light and dark both work. Motion:
// the step path and the loading stones animate only with .ncs-anim, which
// KitScope's hooks add when the browser allows motion; under reduced motion,
// or with no JavaScript, everything is simply there.
// =============================================================================

export const UI_CSS = `
.ncs-ui{color:var(--ui-ink);font-family:var(--ui-body);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
.ncs-ui *,.ncs-ui *::before,.ncs-ui *::after{box-sizing:border-box}
.ncs-ui :where(h1,h2,h3,h4,p,ol,ul,figure,blockquote){margin:0}
.ncs-ui a:not([data-ui]){color:var(--ui-heading)}
.ncs-ui :where(a,button,[tabindex]):not([data-ui]):focus-visible{outline:3px solid var(--ui-focus);outline-offset:3px;border-radius:6px}
.ncs-ui strong{font-weight:650;color:var(--ui-ink)}
.ncs-ui em{font-style:italic;color:var(--ui-muted)}
.ncs-ui .ui-h2{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:clamp(25px,2.2vw + 14px,31px);line-height:1.18;color:var(--ui-heading);letter-spacing:-.005em;text-wrap:balance}
.ncs-ui .ui-h3{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:20px;line-height:1.3;color:var(--ui-ink)}
.ncs-ui .ui-p{max-width:40rem;text-wrap:pretty}
.ncs-ui .ui-muted{color:var(--ui-muted)}
.ncs-ui .ui-eyebrow{font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1.3}

/* Marker and section rule (a site's .hb-label: the marker, small caps, a hairline) */
.ncs-ui .ui-marker{flex:none;display:block}
.ncs-ui .ui-rule{display:flex;align-items:center;gap:16px;color:var(--ui-heading)}
.ncs-ui .ui-rule::after{content:'';flex:1;height:1px;background:var(--ui-rule)}
.ncs-ui .ui-panel{display:grid;gap:16px}

/* Stones */
.ncs-ui .ui-stone{position:relative;display:inline-grid;place-items:center;flex:none}
.ncs-ui .ui-stone>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.ncs-ui .ui-stone>b{position:relative;font-family:var(--ui-display);font-weight:var(--ui-display-weight);line-height:1}

/* The step path: numbered stones joined by the site's connector */
.ncs-ui .ui-steps{list-style:none;padding:0;display:grid;gap:0}
.ncs-ui .ui-step{position:relative;display:grid;grid-template-columns:48px minmax(0,1fr);column-gap:20px;padding-bottom:26px}
.ncs-ui .ui-step:last-child{padding-bottom:0}
.ncs-ui .ui-step__body{padding-top:9px;min-width:0}
.ncs-ui .ui-step__link{position:absolute;left:21px;top:49px;bottom:3px;width:7px;border-radius:4px}
.ncs-ui .ui-link--dashes{background:repeating-linear-gradient(180deg,var(--ui-connector) 0 11px,transparent 11px 18px)}
.ncs-ui .ui-link--dots{left:22px;width:4px;background:radial-gradient(circle,var(--ui-connector) 2px,transparent 2.5px) 0 0/4px 10px repeat-y}
.ncs-ui .ui-link--line{left:23px;width:2px;background:var(--ui-connector)}
.ncs-ui .ui-steps--across{grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:20px}
.ncs-ui .ui-steps--across .ui-step{display:block;padding:0}
.ncs-ui .ui-steps--across .ui-step__body{padding-top:14px;font-size:15.5px;line-height:1.5}
.ncs-ui .ui-steps--across .ui-step__link{left:58px;right:-14px;top:19px;bottom:auto;width:auto;height:6px}
.ncs-ui .ui-steps--across .ui-link--dashes{background:repeating-linear-gradient(90deg,var(--ui-connector) 0 10px,transparent 10px 18px)}
.ncs-ui .ui-steps--across .ui-link--line{height:2px;top:21px}
.ncs-ui .ui-steps--across .ui-link--dots{height:4px;background:radial-gradient(circle,var(--ui-connector) 2px,transparent 2.5px) 0 0/10px 4px repeat-x}
@media (max-width:640px){.ncs-ui .ui-steps--across{grid-auto-flow:row}.ncs-ui .ui-steps--across .ui-step__link{display:none}}
/* Motion: "lay" sets each stone down in turn; "draw" draws the connector down. */
.ncs-ui .ncs-anim .ui-step .ui-stone,.ncs-ui .ncs-anim .ui-step__link{transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .4s ease;transition-delay:calc(var(--i,0) * 140ms)}
.ncs-ui .ncs-anim.ui-motion--lay:not(.is-in) .ui-stone{opacity:0;transform:translateY(-6px) scale(.7) rotate(-8deg)}
.ncs-ui .ncs-anim.ui-motion--lay:not(.is-in) .ui-step__link{opacity:0}
.ncs-ui .ncs-anim .ui-step__link{transform-origin:top}
.ncs-ui .ncs-anim.ui-motion--draw:not(.is-in) .ui-step__link{transform:scaleY(0)}
.ncs-ui .ncs-anim.ui-steps--across.ui-motion--draw:not(.is-in) .ui-step__link{transform:scaleX(0);transform-origin:left}

/* Callouts */
.ncs-ui .ui-notice{position:relative;display:grid;grid-template-columns:30px minmax(0,1fr);column-gap:16px;padding:20px 24px 22px 20px;border-radius:var(--ui-radius);background:var(--tone-bg)}
.ncs-ui .ui-notice .ui-stone{margin-top:2px}
.ncs-ui .ui-notice__title{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:19px;line-height:1.3;color:var(--tone-title);margin-bottom:4px}
.ncs-ui .ui-notice__body{min-width:0}

/* Button copies */
.ncs-ui .ui-chip{display:inline-flex;align-items:center;gap:5px;font:600 .84em/1.25 var(--ui-body);padding:.22em .58em .26em;border-radius:5px;border:1px solid var(--chip-border);background:var(--chip-bg);color:var(--chip-fg);vertical-align:.06em;white-space:nowrap;box-shadow:0 1px 0 rgb(0 0 0 / .06);letter-spacing:0}
.ncs-ui .ui-chip--tool{background:var(--chip-tool-bg);border-color:var(--chip-tool-bg);color:var(--chip-tool-fg)}
.ncs-ui .ui-chip--publish{background:var(--chip-pos-bg);border-color:var(--chip-pos-bg);color:var(--chip-pos-fg)}
.ncs-ui .ui-chip--critical{background:var(--chip-crit-bg);border-color:var(--chip-crit-bg);color:var(--chip-crit-fg)}

/* The field "How to" chip (card 134): quiet, in the stone's shape, the marker in small */
.ncs-ui .ui-howto{display:inline-flex;align-items:center;gap:6px;margin-left:8px;font:600 12.5px/1.2 var(--ui-body);letter-spacing:.02em;padding:4px 10px 4px 8px;border:1px solid var(--chip-border);border-radius:var(--ui-tag-radius);background:transparent;color:var(--ui-heading);cursor:pointer;vertical-align:.04em;white-space:nowrap;transition:background-color .15s ease,border-color .15s ease}
.ncs-ui .ui-howto:hover{background:var(--chip-bg);border-color:var(--ui-marker)}
.ncs-ui .ui-howto:active{transform:translateY(1px)}
.ncs-ui .ui-howto .ui-marker{height:10px;width:14px;max-width:14px;flex:none;object-fit:contain;overflow:hidden}
.ncs-ui .ui-howto:focus-visible{outline:3px solid var(--ui-focus);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.ncs-ui .ui-howto{transition:none}.ncs-ui .ui-howto:active{transform:none}}

/* The guide section a "How to" opened at: the marker's colour along its left */
.ncs-ui .ui-section--focus{border-left:3px solid var(--ui-marker);padding-left:14px}
.ncs-ui .ui-section--focus h2:focus{outline:none}

/* Stone tags (badges) */
.ncs-ui .ui-tag{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;line-height:1.2;padding:8px 14px 8px 11px;background:var(--tone-bg);color:var(--tone-title);border-radius:var(--ui-tag-radius)}
.ncs-ui .ui-tag--on-dark{background:rgb(255 255 255 / .12);color:var(--ui-banner-ink)}

/* Cards */
.ncs-ui .ui-card{display:grid;grid-template-columns:56px minmax(0,1fr);gap:16px;align-items:start;padding:18px 20px 20px;border-radius:var(--ui-radius);background:var(--ui-surface);border:1px solid var(--ui-rule);color:inherit;text-decoration:none;text-align:left;font:inherit;width:100%;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
.ncs-ui .ui-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px -14px rgb(0 0 0 / .35);border-color:var(--ui-heading)}
.ncs-ui .ui-card__title{display:block;font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:19px;line-height:1.25;color:var(--ui-heading);text-wrap:balance}
.ncs-ui .ui-card__lead{display:block;margin-top:6px;font-size:15px;line-height:1.5;color:var(--ui-muted)}
@media (prefers-reduced-motion:reduce){.ncs-ui .ui-card{transition:none}.ncs-ui .ui-card:hover{transform:none}}

/* Art tile: the meaning's icon (the site's art where it has some) on a stone */
.ncs-ui .ui-art{position:relative;display:grid;place-items:center;flex:none}
.ncs-ui .ui-art>svg.ui-art__ground{position:absolute;inset:0;width:100%;height:100%}
.ncs-ui .ui-art__icon{position:relative;display:grid;place-items:center;color:var(--ui-heading);line-height:0}
.ncs-ui .ui-art__icon svg{width:1em;height:1em}

/* Pull quote */
.ncs-ui .ui-quote{display:grid;gap:12px;padding:6px 0 6px 0}
.ncs-ui .ui-quote__text{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:clamp(22px,1.6vw + 12px,27px);line-height:1.3;color:var(--ui-heading);text-wrap:balance;max-width:34rem}
.ncs-ui .ui-quote__cite{font-size:14px;color:var(--ui-muted)}

/* Colour edge, sill */
.ncs-ui .ui-edge{display:block;height:5px}
.ncs-ui .ui-sill{display:block;width:100%;height:auto;user-select:none;pointer-events:none}

/* Banner */
.ncs-ui .ui-banner{position:relative;overflow:hidden;border-radius:calc(var(--ui-radius) + 4px);background:var(--ui-banner-bg);color:var(--ui-banner-ink)}
.ncs-ui .ui-banner__in{display:grid;grid-template-columns:minmax(0,1fr);gap:22px;padding:28px 22px 22px}
.ncs-ui .ui-banner__eyebrow{display:flex;align-items:center;gap:12px;color:var(--ui-banner-muted)}
.ncs-ui .ui-banner__title{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:clamp(34px,4.6vw + 14px,60px);line-height:1.02;letter-spacing:-.012em;margin:12px 0 12px;color:var(--ui-banner-ink);text-wrap:balance;overflow-wrap:anywhere}
.ncs-ui .ui-banner__lead{font-size:clamp(18px,.5vw + 15px,21px);line-height:1.5;color:var(--ui-banner-muted);max-width:32rem}
.ncs-ui .ui-banner__foot{margin-top:18px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.ncs-ui .ui-banner__disc{order:-1}
@media (min-width:640px){.ncs-ui .ui-banner__in{grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:32px;padding:42px 44px 26px}.ncs-ui .ui-banner__disc{order:0}}
.ncs-ui .ui-banner--compact .ui-banner__in{padding:20px 20px 16px;grid-template-columns:minmax(0,1fr) auto;gap:14px}
.ncs-ui .ui-banner--compact .ui-banner__title{font-size:26px;margin:6px 0}
.ncs-ui .ui-banner--compact .ui-banner__lead{font-size:16px}
.ncs-ui .ui-banner--compact .ui-banner__disc{order:0}

/* Loading: the marker's pieces laid in turn */
.ncs-ui .ui-loading{display:inline-flex;align-items:center;gap:12px;color:var(--ui-muted);font-size:15px}
.ncs-ui .ui-loading__stones{display:inline-flex;gap:5px}
.ncs-ui .ui-loading__stones.ncs-anim>*{animation:ncs-ui-lay 1.4s ease-in-out infinite;animation-delay:calc(var(--i) * 180ms)}
@keyframes ncs-ui-lay{0%,100%{opacity:.25;transform:translateY(-3px)}40%,70%{opacity:1;transform:none}}

/* GuideShot */
.ncs-ui .ui-shot{display:grid;gap:12px}
.ncs-ui .ui-shot__frame{container-type:inline-size;position:relative;border-radius:var(--ui-radius);overflow:hidden;border:1px solid var(--ui-rule);background:var(--ui-surface);box-shadow:0 18px 40px -28px rgb(0 0 0 / .45)}
.ncs-ui .ui-shot__frame>img,.ncs-ui .ui-shot__frame>.ui-shot__art{display:block;width:100%;height:auto}
.ncs-ui .ui-shot__marks{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.ncs-ui .ui-shot__stone{position:absolute;transform:translate(-50%,-50%)}
@container (max-width:560px){.ncs-ui .ui-shot__stone .ui-stone{transform:scale(.72)}}
@container (max-width:400px){.ncs-ui .ui-shot__stone .ui-stone{transform:scale(.56)}}
.ncs-ui .ui-shot__key{list-style:none;padding:0;display:grid;gap:8px;font-size:15px;color:var(--ui-muted)}
.ncs-ui .ui-shot__key li{display:flex;gap:10px;align-items:center}
.ncs-ui .ui-shot__cap{font-size:15px;color:var(--ui-muted)}

/* Print: the letterhead shows; the banner, buttons and motion do not */
.ncs-ui .ui-print-only{display:none}
@media print{
  .ncs-ui{font-size:12pt;color:#000}
  .ncs-ui .ui-print-only{display:block}
  .ncs-ui .ui-no-print{display:none!important}
  .ncs-ui .ui-banner{background:none;color:#000;border-radius:0}
  .ncs-ui .ui-banner__title,.ncs-ui .ui-banner__lead,.ncs-ui .ui-banner__eyebrow{color:#000!important}
  .ncs-ui .ui-banner__title span{color:#000!important}
  .ncs-ui .ui-banner__disc,.ncs-ui .ui-sill{display:none}
  .ncs-ui .ui-notice,.ncs-ui .ui-card,.ncs-ui .ui-step{break-inside:avoid}
  .ncs-ui .ncs-anim *{transition:none!important;opacity:1!important;transform:none!important}
}
@media (prefers-reduced-motion:reduce){.ncs-ui .ncs-anim *{transition:none!important;animation:none!important}}

/* ===== Card 131: the surfaces ===== */
.ncs-ui .ui-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* Tool heading */
.ncs-ui .ui-toolhead{display:grid;gap:18px}
.ncs-ui .ui-toolhead__row{display:flex;align-items:center;gap:18px;min-width:0}
.ncs-ui .ui-toolhead__title{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:clamp(30px,2.6vw + 16px,42px);line-height:1.08;letter-spacing:-.01em;color:var(--ui-heading);text-wrap:balance;min-width:0;overflow-wrap:anywhere}
.ncs-ui .ui-toolhead__lead{font-size:18px;line-height:1.6;color:var(--ui-muted);max-width:40rem;text-wrap:pretty}

/* Pill action */
.ncs-ui .ui-action{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:7px 16px 8px;border-radius:999px;border:1.5px solid var(--ui-heading);background:transparent;color:var(--ui-heading);font:650 15px/1.2 var(--ui-body);text-decoration:none;cursor:pointer;white-space:nowrap;transition:background-color .15s ease,color .15s ease}
.ncs-ui a.ui-action:not([data-ui]){color:var(--ui-heading)}
.ncs-ui .ui-action:hover,.ncs-ui a.ui-action:not([data-ui]):hover{background:var(--ui-heading);color:var(--ui-surface)}
.ncs-ui .ui-action--strong,.ncs-ui a.ui-action--strong:not([data-ui]){background:var(--ui-heading);color:var(--ui-surface)}
.ncs-ui .ui-action--strong:hover{filter:brightness(1.12)}
.ncs-ui .ui-action--quiet,.ncs-ui a.ui-action--quiet:not([data-ui]){border-color:transparent;padding-inline:4px;min-height:32px;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px}
.ncs-ui .ui-action--quiet:hover,.ncs-ui a.ui-action--quiet:not([data-ui]):hover{background:none;color:var(--ui-heading);text-decoration-thickness:2.5px}
.ncs-ui .ui-action:disabled{opacity:.55;cursor:default}
.ncs-ui .ui-action:focus-visible{outline:3px solid var(--ui-focus);outline-offset:3px;border-radius:999px}

/* Home card / panel */
.ncs-ui .ui-box{position:relative;overflow:hidden;background:var(--ui-surface);border:1px solid var(--ui-rule);border-radius:var(--ui-radius);font-size:16px;line-height:1.55}
.ncs-ui .ui-box>.ui-edge{position:absolute;top:0;left:0;right:0}
.ncs-ui .ui-box__head{display:flex;align-items:center;gap:12px;padding:20px 22px 0;min-width:0}
.ncs-ui .ui-box__title{flex:1;min-width:0;font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:22px;line-height:1.2;color:var(--ui-heading);text-wrap:balance}
.ncs-ui .ui-box__action{flex:none;font-size:14px}
.ncs-ui .ui-box__body{padding:14px 22px 22px;display:grid;gap:14px;min-width:0}
@media (max-width:480px){.ncs-ui .ui-box__head{padding:16px 16px 0;flex-wrap:wrap}.ncs-ui .ui-box__body{padding:12px 16px 18px}}

/* Findings */
.ncs-ui .ui-group{display:grid;gap:12px}
.ncs-ui .ui-group__head{display:flex;align-items:center;gap:10px;font:700 13px/1.3 var(--ui-body);letter-spacing:.14em;text-transform:uppercase;color:var(--ui-ink)}
.ncs-ui .ui-group__head::after{content:'';flex:1;height:1px;background:var(--ui-rule)}
.ncs-ui .ui-group__count{display:inline-grid;place-items:center;min-width:24px;height:22px;padding:0 7px;border-radius:999px;background:var(--ui-paper);border:1px solid var(--ui-rule);font-size:12.5px;letter-spacing:0;color:var(--ui-muted)}
.ncs-ui .ui-group__list{display:grid;gap:10px}
.ncs-ui .ui-result{position:relative;display:grid;gap:14px;padding:18px 20px 18px 26px;background:var(--ui-surface);border:1px solid var(--ui-rule);border-radius:var(--ui-radius);overflow:hidden}
.ncs-ui .ui-result::before{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--edge)}
.ncs-ui .ui-result__level{font:700 12px/1.3 var(--ui-body);letter-spacing:.12em;text-transform:uppercase;color:var(--tone-title);margin-bottom:4px}
.ncs-ui .ui-result__title{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:20px;line-height:1.3;color:var(--ui-ink);text-wrap:balance}
.ncs-ui .ui-result__detail{margin-top:6px;font-size:16px;line-height:1.6;color:var(--ui-muted);max-width:40rem}
.ncs-ui .ui-result--dense{grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 14px 12px 20px}
.ncs-ui .ui-result--dense .ui-result__title{font-family:var(--ui-body);font-weight:650;font-size:15.5px;line-height:1.35;overflow-wrap:anywhere}
.ncs-ui .ui-result--dense .ui-result__detail{margin-top:2px;font-size:14px;line-height:1.45}
.ncs-ui .ui-result--dense .ui-result__level{font-size:11px;margin-bottom:2px}
.ncs-ui .ui-result--dense .ui-action{min-height:34px;padding:5px 13px 6px;font-size:14px}
@media (max-width:480px){.ncs-ui .ui-result--dense{grid-template-columns:minmax(0,1fr);justify-items:start}}
.ncs-ui .ui-clear{position:relative;overflow:hidden;background:var(--ui-surface);border:1px solid var(--ui-rule);border-radius:var(--ui-radius)}
.ncs-ui .ui-clear__in{display:grid;justify-items:start;gap:8px;padding:24px 24px 20px}
.ncs-ui .ui-clear__stones{display:inline-flex;gap:4px;margin-bottom:4px}
.ncs-ui .ui-clear__title{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:clamp(24px,1.6vw + 14px,30px);line-height:1.15;color:var(--ui-heading)}
.ncs-ui .ui-clear__lead{font-size:16px;color:var(--ui-muted);max-width:36rem}
.ncs-ui .ui-clear--compact{border:0;background:none;overflow:visible}
.ncs-ui .ui-clear--compact .ui-clear__in{padding:0;grid-template-columns:auto minmax(0,1fr);align-items:center;column-gap:14px;row-gap:2px}
.ncs-ui .ui-clear--compact .ui-clear__stones{grid-row:span 2;margin:0}
.ncs-ui .ui-clear--compact .ui-clear__title{font-size:20px}
.ncs-ui .ui-clear--compact .ui-clear__lead{font-size:15px}

/* The checklist as a path */
.ncs-ui .ui-check{list-style:none;padding:0;margin:0;display:grid}
.ncs-ui .ui-check__item{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr);column-gap:16px;padding-bottom:20px}
.ncs-ui .ui-check__item:last-child{padding-bottom:0}
.ncs-ui .ui-check__stone{position:relative;display:block;width:40px;height:36px}
.ncs-ui label.ui-check__stone{cursor:pointer}
.ncs-ui .ui-check__stone .ui-stone{transition:transform .2s ease}
.ncs-ui label.ui-check__stone:hover .ui-stone{transform:translateY(-1px) rotate(-3deg)}
.ncs-ui .ui-check__stone input:focus-visible+.ui-stone{outline:3px solid var(--ui-focus);outline-offset:3px;border-radius:12px}
.ncs-ui .ui-check__stone input:disabled+.ui-stone{opacity:.6}
.ncs-ui .ui-check .ui-step__link{left:17px;top:40px;bottom:2px;width:6px;opacity:.35;filter:grayscale(1)}
.ncs-ui .ui-check .ui-step__link.is-laid{opacity:1;filter:none}
.ncs-ui .ui-check .ui-link--line{left:19px;width:2px}
.ncs-ui .ui-check .ui-link--dots{left:18px;width:4px}
.ncs-ui .ui-check__body{min-width:0;padding-top:6px}
.ncs-ui .ui-check__title{font-weight:650;font-size:16.5px;line-height:1.35;color:var(--ui-ink)}
.ncs-ui .ui-check__title label{cursor:pointer}
.ncs-ui .is-done .ui-check__title{color:var(--ui-muted)}
.ncs-ui .ui-check__detail{margin-top:3px;font-size:15px;line-height:1.5;color:var(--ui-muted)}
.ncs-ui .ui-check__action{margin-top:10px}
@media (prefers-reduced-motion:no-preference){
  .ncs-ui .ui-motion--lay .is-fresh .ui-check__stone .ui-stone{animation:ncs-ui-set .5s cubic-bezier(.2,.8,.2,1)}
  .ncs-ui .ui-motion--draw .is-fresh .ui-step__link{animation:ncs-ui-draw .5s ease}
  .ncs-ui .ui-state--now::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:2px solid var(--ui-focus);opacity:0;animation:ncs-ui-ring 2s ease-out infinite}
}
@keyframes ncs-ui-set{0%{transform:translateY(-8px) scale(.6) rotate(-12deg);opacity:.3}100%{transform:none;opacity:1}}
@keyframes ncs-ui-draw{0%{transform:scaleY(0);transform-origin:top}100%{transform:none}}
@keyframes ncs-ui-ring{0%{opacity:.7;transform:scale(.75)}100%{opacity:0;transform:scale(1.25)}}

/* Is it live: three stones */
.ncs-ui .ui-live{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.ncs-ui .ui-live__step{display:grid;gap:8px;justify-items:start;min-width:0}
.ncs-ui .ui-live__mark{position:relative;display:flex;align-items:center;width:100%}
.ncs-ui .ui-live__link{flex:1;height:5px;margin:0 8px;border-radius:3px;background:repeating-linear-gradient(90deg,var(--ui-rule) 0 9px,transparent 9px 15px)}
.ncs-ui .ui-live__link.is-laid{background:repeating-linear-gradient(90deg,var(--ui-connector) 0 9px,transparent 9px 15px)}
.ncs-ui .ui-live__word{font-size:14px;font-weight:650;line-height:1.3;color:var(--ui-muted)}
.ncs-ui .ui-live__step:not(.is-todo) .ui-live__word{color:var(--ui-ink)}
.ncs-ui .ui-state{display:inline-grid;position:relative}
.ncs-ui .ui-live--compact{display:inline-flex;align-items:center}
.ncs-ui .ui-live--compact .ui-live__step{display:flex}
.ncs-ui .ui-live--compact .ui-live__mark{width:auto}
.ncs-ui .ui-live--compact .ui-live__link{flex:none;width:10px;height:3px;margin:0 3px;background:var(--ui-rule)}
.ncs-ui .ui-live--compact .ui-live__link.is-laid{background:var(--ui-connector)}
.ncs-ui .ui-live--compact .ui-state--now::after{inset:-3px;border-width:1.5px}

/* Quick update tiles and the done screen */
.ncs-ui .ui-tile{position:relative;display:block;width:100%;padding:0;overflow:hidden;text-align:left;font:inherit;color:inherit;cursor:pointer;background:var(--ui-surface);border:1px solid var(--ui-rule);border-radius:var(--ui-radius);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
.ncs-ui .ui-tile>.ui-edge{display:block}
.ncs-ui a.ui-tile:not([data-ui]){color:inherit;text-decoration:none}
.ncs-ui .ui-tile__in{display:grid;grid-template-columns:52px minmax(0,1fr);gap:14px;align-items:start;padding:18px 20px 20px;min-height:96px}
.ncs-ui .ui-tile__title{display:block;font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:22px;line-height:1.2;color:var(--ui-heading);text-wrap:balance}
.ncs-ui .ui-tile__lead{display:block;margin-top:5px;font-size:15px;line-height:1.5;color:var(--ui-muted)}
.ncs-ui .ui-tile:hover{transform:translateY(-2px);box-shadow:0 12px 26px -16px rgb(0 0 0 / .4);border-color:var(--ui-heading)}
.ncs-ui .ui-tile:focus-visible{outline:3px solid var(--ui-focus);outline-offset:3px}
@media (prefers-reduced-motion:reduce){.ncs-ui .ui-tile{transition:none}.ncs-ui .ui-tile:hover{transform:none}}
.ncs-ui .ui-done .ui-live{max-width:420px}
.ncs-ui .ui-done__actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.ncs-ui .ui-empty .ui-clear__in{padding:34px 30px 28px;gap:12px}
.ncs-ui .ui-empty .ui-art{margin-bottom:6px}
/* ===== Card 132: rows, dates, numbers, the trail ===== */
.ncs-ui .ui-state--todo{display:inline-grid}
.ncs-ui .ui-date{position:relative;display:grid;place-items:center;width:58px;height:52px;flex:none}
.ncs-ui .ui-date>.ui-stone{position:absolute;inset:0}
.ncs-ui .ui-date__words{position:relative;display:grid;justify-items:center;line-height:1}
.ncs-ui .ui-date__month{font:700 10.5px/1 var(--ui-body);letter-spacing:.14em;text-transform:uppercase;color:inherit}
.ncs-ui .ui-date__day{margin-top:3px;font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:22px;color:inherit}
.ncs-ui .ui-rows{list-style:none;margin:0;padding:0;display:grid}
.ncs-ui .ui-row{display:flex;align-items:center;gap:10px;min-width:0;border-top:1px solid var(--ui-rule)}
.ncs-ui .ui-row:first-child{border-top:0}
.ncs-ui .ui-row__hit{flex:1;display:flex;align-items:center;gap:14px;min-width:0;padding:10px 6px 10px 0;background:none;border:0;font:inherit;color:inherit;text-align:left;text-decoration:none;cursor:pointer;border-radius:10px}
.ncs-ui a.ui-row__hit:not([data-ui]){color:inherit}
.ncs-ui .ui-row__hit--still{cursor:default}
.ncs-ui .ui-row__hit .ui-art,.ncs-ui .ui-row__hit .ui-date{transition:transform .2s ease}
.ncs-ui .ui-row__hit:not(.ui-row__hit--still):hover .ui-art,.ncs-ui .ui-row__hit:not(.ui-row__hit--still):hover .ui-date{transform:translateY(-2px) rotate(-3deg)}
.ncs-ui .ui-row__hit:not(.ui-row__hit--still):hover .ui-row__title{color:var(--ui-heading);text-decoration:underline;text-underline-offset:3px}
.ncs-ui .ui-row__hit:focus-visible{outline:3px solid var(--ui-focus);outline-offset:2px}
.ncs-ui .ui-row__words{flex:1;display:grid;gap:1px;min-width:0}
.ncs-ui .ui-row--action{flex-wrap:wrap;gap:0}
.ncs-ui .ui-row--action .ui-row__action{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:0 0 12px 58px}
.ncs-ui .ui-row__title{font-weight:650;font-size:15.5px;line-height:1.35;color:var(--ui-ink);overflow-wrap:anywhere}
.ncs-ui .ui-row__meta{font-size:14px;line-height:1.4;color:var(--ui-muted)}
.ncs-ui .ui-row__tag{display:block;margin-top:5px}
.ncs-ui .ui-row__tag .ui-tag{font-size:11px;padding:6px 11px 6px 9px}
.ncs-ui .ui-row__action{flex:none}
@media (prefers-reduced-motion:reduce){.ncs-ui .ui-row__hit .ui-art,.ncs-ui .ui-row__hit .ui-date{transition:none;transform:none!important}}
.ncs-ui .ui-figure{display:grid;gap:2px}
.ncs-ui .ui-figure__value{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:clamp(40px,3vw + 22px,56px);line-height:1;color:var(--ui-heading);letter-spacing:-.01em;font-variant-numeric:lining-nums}
.ncs-ui .ui-figure__label{font-weight:650;font-size:15px;color:var(--ui-ink)}
.ncs-ui .ui-figure__sub{font-size:14px;color:var(--ui-muted)}
.ncs-ui .ui-bars{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.ncs-ui .ui-bars__row{display:grid;grid-template-columns:minmax(0,9rem) minmax(0,1fr) auto;align-items:center;gap:12px;font-size:14.5px}
.ncs-ui .ui-bars__label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ui-ink)}
.ncs-ui .ui-bars__track{height:12px;min-width:0}
.ncs-ui .ui-bars__bar{display:block;height:100%;border-radius:var(--ui-tag-radius)}
.ncs-ui .ui-bars__value{font-weight:650;font-variant-numeric:tabular-nums;color:var(--ui-ink)}
@media (max-width:480px){.ncs-ui .ui-bars__row{grid-template-columns:minmax(0,1fr) auto}.ncs-ui .ui-bars__track{grid-column:1 / -1;grid-row:2}}
.ncs-ui .ui-trail .ui-live{max-width:520px}
.ncs-ui .ui-tour-trail .ui-live{max-width:none}
.ncs-ui.ui-toast{display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.45}
.ncs-ui.ui-toast .ui-toast__steps{display:flex;align-items:center}
.ncs-ui .ui-switch{display:flex;align-items:center;gap:14px;width:100%;min-height:52px;padding:8px 14px;background:var(--ui-surface);border:2px solid var(--ui-ink);border-radius:var(--ui-radius);color:var(--ui-ink);font:inherit;font-size:16px;text-align:left;cursor:pointer}
.ncs-ui .ui-switch__track{flex:none;position:relative;width:52px;height:30px;border-radius:999px;border:2px solid var(--ui-ink);background:var(--ui-surface);transition:background .15s}
.ncs-ui .ui-switch__thumb{position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;background:var(--ui-ink);transition:transform .15s}
.ncs-ui .ui-switch.is-on .ui-switch__track{background:var(--ui-heading);border-color:var(--ui-heading)}
.ncs-ui .ui-switch.is-on .ui-switch__thumb{transform:translateX(22px);background:var(--ui-surface)}
.ncs-ui .ui-switch__label{flex:1;min-width:0}
.ncs-ui .ui-switch__state{flex:none;font-weight:700;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:var(--ui-ink)}
@media (prefers-reduced-motion:reduce){.ncs-ui .ui-switch__track,.ncs-ui .ui-switch__thumb{transition:none}}
/* Card 145: Home as a dashboard (not under .ncs-ui: it lays out Sanity UI cards too). */
.ui-dash-wrap{container-type:inline-size;width:100%}
.ui-dash{display:grid;gap:24px;grid-template-columns:minmax(0,1fr);grid-template-areas:"banner" "tiles" "rail" "main" "foot";max-width:1760px;margin:0 auto;align-items:start}
.ui-dash__banner{grid-area:banner;min-width:0}
.ui-dash__tiles{grid-area:tiles;min-width:0}
.ui-dash__rail{grid-area:rail;display:grid;gap:24px;min-width:0}
.ui-dash__main{grid-area:main;display:grid;gap:24px;grid-template-columns:minmax(0,1fr);min-width:0}
.ui-dash__foot{grid-area:foot;min-width:0}
.ui-dash__wide{grid-column:1 / -1;min-width:0}
@container (min-width:960px){
  .ui-dash{grid-template-columns:minmax(0,1fr) minmax(340px,400px);grid-template-areas:"banner rail" "tiles rail" "main rail" "foot foot"}
  .ui-dash__rail{position:sticky;top:0;align-self:start}
}
@container (min-width:1500px){
  .ui-dash__main{grid-template-columns:repeat(2,minmax(0,1fr))}
}
/* Card 147: the Checkup in columns by level, with a count strip above */
.ncs-ui .ui-levels{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:10px 28px}
.ncs-ui .ui-levels__item{display:inline-flex;align-items:center;gap:8px;font-size:15px;color:var(--ui-muted)}
.ncs-ui .ui-levels__item b{font-family:var(--ui-display);font-weight:var(--ui-display-weight);font-size:24px;line-height:1;color:var(--ui-ink)}
.ncs-ui .ui-checkup{display:grid;gap:28px 24px;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));align-items:start}
/* Card 148: Quick update's form with a rail beside it on a wide pane (phones: the form alone) */
.ui-quick-wrap{container-type:inline-size;width:100%}
.ui-quick{display:grid;grid-template-columns:minmax(0,1fr);gap:28px}
.ui-quick__rail{display:none}
@container (min-width:860px){
  .ui-quick{grid-template-columns:minmax(0,600px) minmax(280px,1fr);align-items:start}
  .ui-quick__rail{display:block;position:sticky;top:0}
}
`;

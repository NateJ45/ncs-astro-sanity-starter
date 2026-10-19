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
.ncs-ui a{color:var(--ui-heading)}
.ncs-ui :where(a,button,[tabindex]):focus-visible{outline:3px solid var(--ui-focus);outline-offset:3px;border-radius:6px}
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
.ncs-ui .ui-shot__frame{position:relative;border-radius:var(--ui-radius);overflow:hidden;border:1px solid var(--ui-rule);background:var(--ui-surface);box-shadow:0 18px 40px -28px rgb(0 0 0 / .45)}
.ncs-ui .ui-shot__frame>img,.ncs-ui .ui-shot__frame>.ui-shot__art{display:block;width:100%;height:auto}
.ncs-ui .ui-shot__marks{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.ncs-ui .ui-shot__stone{position:absolute;transform:translate(-50%,-50%)}
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
`;

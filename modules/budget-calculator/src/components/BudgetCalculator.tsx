// Safe to edit by hand
// Budget calculator React island. Hydrated with client:visible — only activates
// when the section scrolls into view, keeping TTI clean on slower devices.
//
// Intent: this is a planning tool, not a gate. The estimate always shows without
// requiring an email. The optional "email me this estimate" section collects the
// address only if the visitor wants a copy in their inbox.
//
// Accessibility:
//   - All inputs are native form controls with explicit <label htmlFor=>.
//   - The estimate output sits in an aria-live="polite" region so screen readers
//     announce the number as soon as inputs change (no submit required).
//   - Error states use role="alert" with aria-live="polite".
//   - Keyboard flow is linear; no traps.
//   - Animations honor prefers-reduced-motion via CSS (no JS motion logic here).
//
// Voice conventions (per CLAUDE.md):
//   - Money shown plainly: "Roughly $1,200 to $2,400"
//   - No em-dashes. No banned words (transformative, curated, elevated, etc.)
//   - Warm, confident, smart-friend tone.

import { useState, useId, type FormEvent } from 'react';
import { subscribeEmail } from '@/lib/subscribe';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CalcConfig {
  rooms: Array<{ label: string; baseLow: number; baseHigh: number }>;
  scopeOptions: Array<{ label: string; addLow: number; addHigh: number }>;
  addOns: Array<{ label: string; low: number; high: number }>;
  /** Result copy with {{low}} and {{high}} placeholders. */
  resultCopy: string;
  /** Small-print disclaimer shown beneath the estimate. */
  disclaimer: string;
  /** CTA button label. */
  ctaLabel: string;
  /** Optional line near the CTA (e.g. "Starting with a $150 in-home consultation."). */
  consultPriceNote: string;
}

interface Props {
  config: CalcConfig;
}

type EmailStatus = 'idle' | 'submitting' | 'success' | 'error';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Format a dollar amount as a plain-English figure (no cents, with commas). */
function fmt(n: number): string {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Replace {{low}} and {{high}} placeholders in the result copy. */
function interpolateCopy(template: string, low: number, high: number): string {
  return template
    .replace('{{low}}', `Roughly ${fmt(low)}`)
    .replace('{{high}}', fmt(high));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BudgetCalculator({ config }: Props) {
  const { rooms, scopeOptions, addOns, resultCopy, disclaimer, ctaLabel, consultPriceNote } = config;

  // Form state
  const [selectedRoom, setSelectedRoom] = useState<number>(0); // index into rooms[]
  const [selectedScope, setSelectedScope] = useState<number>(0); // index into scopeOptions[]
  const [selectedAddOns, setSelectedAddOns] = useState<Set<number>>(new Set()); // indices into addOns[]

  // Email capture state (optional)
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const [emailMsg, setEmailMsg] = useState('');

  // Stable IDs for aria relationships
  const uid = useId();
  const resultsId = `${uid}-results`;
  const emailFormId = `${uid}-email-form`;
  const honeypotId = `${uid}-hp`;

  // ── Compute estimate ─────────────────────────────────────────────────────────

  const room = rooms[selectedRoom];
  const scope = scopeOptions[selectedScope];

  let totalLow = (room?.baseLow ?? 0) + (scope?.addLow ?? 0);
  let totalHigh = (room?.baseHigh ?? 0) + (scope?.addHigh ?? 0);

  for (const idx of selectedAddOns) {
    const addon = addOns[idx];
    if (addon) {
      totalLow += addon.low;
      totalHigh += addon.high;
    }
  }

  const estimateText = interpolateCopy(resultCopy, totalLow, totalHigh);
  const rangeLabel = `${fmt(totalLow)} to ${fmt(totalHigh)}`;

  // ── Add-on toggle ────────────────────────────────────────────────────────────

  function toggleAddOn(idx: number) {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  // ── Email capture ─────────────────────────────────────────────────────────────

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (emailStatus === 'submitting') return;

    // Honeypot: if filled, fake success silently.
    if (honeypot) {
      setEmailStatus('success');
      setEmailMsg("You're all set. Check your inbox.");
      return;
    }

    if (!email.trim() || !/.+@.+\..+/.test(email)) {
      setEmailStatus('error');
      setEmailMsg('Please enter a valid email address.');
      return;
    }

    setEmailStatus('submitting');
    const result = await subscribeEmail({
      email: email.trim(),
      source: 'budget-calculator',
      tag: 'calculator-estimate',
    });

    setEmailStatus(result.ok ? 'success' : 'error');
    setEmailMsg(result.message);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <section
      className="bg-background"
      aria-label="Budget estimate calculator"
    >
      <div className="mx-auto max-w-content px-m py-section-lg">
        <div className="mx-auto max-w-2xl">

          {/* ── Step 1: Room ────────────────────────────────────────────────── */}
          <div className="mb-l">
            <label
              htmlFor={`${uid}-room`}
              className="block text-sm font-semibold text-foreground mb-xs"
            >
              What kind of room?
            </label>
            <select
              id={`${uid}-room`}
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(Number(e.target.value))}
              className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {rooms.map((r, i) => (
                <option key={i} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Step 2: Scope ───────────────────────────────────────────────── */}
          <div className="mb-l">
            <fieldset>
              <legend className="block text-sm font-semibold text-foreground mb-xs">
                How much of the room are you redesigning?
              </legend>
              <div className="space-y-s">
                {scopeOptions.map((opt, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-s cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name={`${uid}-scope`}
                      value={i}
                      checked={selectedScope === i}
                      onChange={() => setSelectedScope(i)}
                      className="w-4 h-4 accent-primary shrink-0"
                    />
                    <span className="text-foreground/90 text-base group-hover:text-foreground transition-colors">
                      {opt.label}
                    </span>
                    {opt.addLow > 0 && (
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        +{fmt(opt.addLow)} to {fmt(opt.addHigh)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* ── Step 3: Add-ons (optional) ──────────────────────────────────── */}
          {addOns.length > 0 && (
            <div className="mb-l">
              <fieldset>
                <legend className="block text-sm font-semibold text-foreground mb-xs">
                  Anything else on your list?{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </legend>
                <div className="space-y-s">
                  {addOns.map((addon, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-s cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddOns.has(i)}
                        onChange={() => toggleAddOn(i)}
                        className="w-4 h-4 accent-primary shrink-0 rounded"
                      />
                      <span className="text-foreground/90 text-base group-hover:text-foreground transition-colors">
                        {addon.label}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        +{fmt(addon.low)} to {fmt(addon.high)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {/* ── Estimate result ──────────────────────────────────────────────── */}
          {/* aria-live="polite" announces the range to screen readers on every
              input change. Role="region" scopes it for landmark navigation. */}
          <div
            id={resultsId}
            role="region"
            aria-live="polite"
            aria-atomic="true"
            aria-label="Estimate result"
            className="rounded-md border border-primary/30 bg-muted p-l"
          >
            {/* Brand stripe — consistent with card rhythm */}
            <div className="h-0.5 bg-primary -mx-l -mt-l mb-l rounded-t-md" aria-hidden="true"></div>

            <p className="text-foreground/80 text-base leading-relaxed">{estimateText}</p>

            {/* Prominent range figure */}
            <p
              className="mt-s font-display text-h2 text-foreground leading-tight"
              aria-label={`Estimate range: ${rangeLabel}`}
            >
              {fmt(totalLow)}{' '}
              <span className="text-foreground/50 text-h3" aria-hidden="true">to</span>{' '}
              {fmt(totalHigh)}
            </p>

            {disclaimer && (
              <p className="mt-s text-xs text-muted-foreground leading-relaxed">
                {disclaimer}
              </p>
            )}

            {/* CTA row */}
            <div className="mt-l flex flex-wrap items-center gap-s">
              <a
                href="/contact?type=consultation"
                className="inline-flex items-center px-l py-s bg-primary-dark text-white font-semibold uppercase tracking-widest text-sm hover:bg-accent-dark transition-colors press-tactile"
              >
                {ctaLabel || 'Book a consultation'}
              </a>
              {consultPriceNote && (
                <p className="text-sm text-muted-foreground">{consultPriceNote}</p>
              )}
            </div>
          </div>

          {/* ── Optional email capture ───────────────────────────────────────── */}
          {/* Offer to email the estimate — never required, never gates the result. */}
          <div className="mt-m">
            {!emailOpen ? (
              <button
                type="button"
                onClick={() => setEmailOpen(true)}
                className="text-sm text-link hover:text-primary-dark underline underline-offset-2 transition-colors"
              >
                Email me this estimate
              </button>
            ) : (
              <form
                id={emailFormId}
                onSubmit={handleEmailSubmit}
                noValidate
                aria-label="Email estimate form"
                className="mt-s space-y-s"
              >
                {/* Honeypot field — hidden from humans, bots fill it */}
                <div
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
                >
                  <label>
                    Leave this blank
                    <input
                      id={honeypotId}
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </label>
                </div>

                {emailStatus === 'success' ? (
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-sm text-foreground/80"
                  >
                    {emailMsg || "You're all set. Check your inbox."}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-foreground/80">
                      We will send this estimate to your inbox. No strings attached.
                    </p>
                    <div className="flex flex-wrap gap-s items-start">
                      <div className="flex-1 min-w-[200px]">
                        <label
                          htmlFor={`${uid}-email`}
                          className="block text-sm font-semibold text-foreground mb-xs"
                        >
                          Your email
                        </label>
                        <input
                          id={`${uid}-email`}
                          type="email"
                          name="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          aria-invalid={emailStatus === 'error'}
                          aria-describedby={emailStatus === 'error' ? `${uid}-email-error` : undefined}
                          className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          placeholder="you@example.com"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={emailStatus === 'submitting'}
                        className="mt-[1.625rem] inline-flex items-center px-m py-s bg-primary-dark text-white font-semibold text-sm uppercase tracking-wider hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors press-tactile rounded-sm"
                      >
                        {emailStatus === 'submitting' ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                    {emailStatus === 'error' && (
                      <p
                        id={`${uid}-email-error`}
                        role="alert"
                        aria-live="polite"
                        className="text-sm text-destructive"
                      >
                        {emailMsg || "Something went wrong. Please try again."}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      No spam. Just your estimate.
                    </p>
                  </>
                )}
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

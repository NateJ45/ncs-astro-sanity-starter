// Safe to edit by hand
// Newsletter email-capture island. Hydrates client:visible so it doesn't
// cost JS on pages where the footer is never scrolled to.
//
// Renders NOTHING (null) when:
//   - newsletter.enabled is false in Sanity siteSettings
//   - both formActionUrl and PUBLIC_WEB3FORMS_KEY are absent
//     (no point showing a form that can't submit)
//
// A11y:
//   - success state uses role="status" aria-live="polite" (non-urgent announcement)
//   - error state uses role="alert" aria-live="polite" (urgent, announced immediately)
//   - per-field error ids wired to aria-describedby
//   - on error, focus moves to the email input so keyboard/SR users don't get lost
//   - 44px minimum touch targets on all interactive elements
//
// Honeypot: a visually-hidden `website` field. Bots fill it; humans can't see it.
// The component fakes success when it's filled so the bot moves on.

import { useRef, useState, type FormEvent } from 'react';
import { subscribeEmail } from '@/lib/subscribe';

export interface NewsletterConfig {
  /** Set by siteSettings.newsletter.enabled in Sanity. When false, render null. */
  enabled?: boolean;
  heading?: string;
  blurb?: string;
  buttonLabel?: string;
  successMessage?: string;
  /** Consent / privacy note shown below the submit button. */
  consentNote?: string;
  /** The ESP form-action URL (e.g. ConvertKit or MailerLite). When absent, falls back to Web3Forms. */
  formActionUrl?: string | null;
  /** Optional audience / list ID for the ESP. */
  audienceId?: string | null;
}

interface Props {
  newsletter: NewsletterConfig;
  /** Human-readable source label for tracking (e.g. "footer", "journal-index"). */
  source?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const WEB3FORMS_KEY = import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined;

export default function NewsletterSignup({ newsletter, source = 'newsletter' }: Props) {
  // Guard: render nothing when the feature is disabled or unconfigured.
  if (!newsletter?.enabled) return null;
  if (!newsletter.formActionUrl && !WEB3FORMS_KEY) return null;

  const heading = newsletter.heading ?? 'Stay in the loop.';
  const blurb =
    newsletter.blurb ??
    'Design ideas, project notes, and the occasional resource. No noise — just good reads when they land.';
  const buttonLabel = newsletter.buttonLabel ?? 'Subscribe';
  const successMessage =
    newsletter.successMessage ??
    "You're on the list. Good things incoming.";
  const consentNote =
    newsletter.consentNote ??
    'No spam. Unsubscribe any time. Read the privacy policy.';

  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const emailRef = useRef<HTMLInputElement | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');

    // Honeypot check — bots fill this field, humans can't see it.
    if (website) {
      setStatus('success');
      return;
    }

    if (!email.trim() || !/.+@.+\..+/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      emailRef.current?.focus();
      return;
    }

    setStatus('submitting');
    const result = await subscribeEmail({
      email: email.trim(),
      tag: undefined,
      source,
      formActionUrl: newsletter.formActionUrl,
      audienceId: newsletter.audienceId,
    });

    if (result.ok) {
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMsg(result.message);
      emailRef.current?.focus();
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-primary bg-muted p-l"
      >
        <p className="font-display text-h4 text-foreground">{successMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-l">
      {/* Brand accent stripe at the top — matches card grammar. */}
      <div className="h-0.5 bg-primary mb-l" aria-hidden="true"></div>

      <h3 className="font-display text-h3 text-foreground">{heading}</h3>
      {blurb && (
        <p className="mt-s text-sm text-foreground/80 leading-relaxed">{blurb}</p>
      )}

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-m space-y-s"
        aria-busy={status === 'submitting'}
      >
        {/* Honeypot — visually hidden, bots fill it, real users can't see it. */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
        >
          <label>
            Website (leave blank)
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-md border border-destructive bg-destructive/10 p-s text-sm text-foreground"
          >
            {errorMsg}
          </div>
        )}

        <div>
          <label htmlFor="newsletter-email" className="block text-sm font-semibold text-foreground mb-1">
            Email address
          </label>
          <input
            ref={emailRef}
            id="newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            aria-invalid={!!errorMsg}
            aria-describedby={errorMsg ? 'newsletter-email-error' : undefined}
            placeholder="you@example.com"
            className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
          />
          {errorMsg && (
            <p id="newsletter-email-error" role="alert" aria-live="polite" className="mt-xs text-sm text-destructive">
              {errorMsg}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex items-center justify-center min-h-[44px] w-full px-l py-s bg-primary-dark text-white font-semibold uppercase tracking-widest text-xs hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-sm press-tactile"
        >
          {status === 'submitting' ? 'Subscribing…' : buttonLabel}
        </button>
      </form>

      {/* Consent / privacy note. Parses the privacy link pattern for the /privacy page. */}
      <p className="mt-s text-xs text-foreground/70 leading-relaxed">
        {consentNote.includes('privacy policy') ? (
          <>
            {consentNote.replace('privacy policy', '').trimEnd()}{' '}
            <a href="/privacy" className="underline underline-offset-2 hover:text-link transition-colors">
              privacy policy
            </a>
            .
          </>
        ) : (
          consentNote
        )}
      </p>
    </div>
  );
}

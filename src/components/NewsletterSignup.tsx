// Safe to edit by hand
// Newsletter email-capture island. Hydrates client:visible so it doesn't
// cost JS on pages where the footer is never scrolled to.
//
// Where a sign-up goes (src/lib/subscribe.ts): the ESP form when Site settings has
// one, else the site's OWN list (/api/subscribe/, double opt-in, PORTS.md card 127)
// when the Worker has it switched on, else Web3Forms.
//
// Renders NOTHING (null) when:
//   - newsletter.enabled is false in Sanity siteSettings
//   - no ESP form, no Web3Forms key, and the own list says it is not ready
//     (no point showing a form that can't submit). With `fallbackUrl` it shows
//     a link to that sign-up page instead.
// With no ESP and no Web3Forms key the box asks /api/subscribe/ first and appears
// only once the answer is yes; with the own list it also offers an optional
// first name, used once to say hello in the confirmation email and not stored.
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

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ownListReady, subscribeEmail } from '@/lib/subscribe';

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
  /**
   * Leave out the box's own heading and line, for a page block that draws its own above it
   * (the church library's Newsletter sign-up block, 2026-10-18). Default: shown, as before.
   */
  hideHeading?: boolean;
  /** Prefix for the field ids, so a block and the footer box can share a page. */
  idPrefix?: string;
  /** A sign-up page to link to when no way of signing up here is switched on. */
  fallbackUrl?: string | null;
  /** Classes for that link (the site's secondary button). */
  fallbackClassName?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const WEB3FORMS_KEY = import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined;

export default function NewsletterSignup({
  newsletter,
  source = 'newsletter',
  hideHeading = false,
  idPrefix = 'newsletter',
  fallbackUrl = null,
  fallbackClassName = 'press-tactile inline-flex min-h-[44px] items-center justify-center rounded-sm border border-primary px-l py-s text-sm font-semibold text-foreground',
}: Props) {
  // Which way a sign-up can go. An ESP form or a Web3Forms key is known at build
  // time; the site's own list is asked once, when the box comes into view.
  const staticPath = Boolean(newsletter?.formActionUrl || WEB3FORMS_KEY);
  const [ownList, setOwnList] = useState<'checking' | 'ready' | 'off'>(
    staticPath ? 'off' : 'checking',
  );
  useEffect(() => {
    if (!newsletter?.enabled || newsletter.formActionUrl) return;
    let live = true;
    ownListReady().then((ready) => live && setOwnList(ready ? 'ready' : 'off'));
    return () => {
      live = false;
    };
  }, [newsletter?.enabled, newsletter?.formActionUrl]);

  const heading = newsletter?.heading ?? 'Stay in the loop.';
  const blurb =
    newsletter?.blurb ??
    'Design ideas, project notes, and the occasional resource. No noise — just good reads when they land.';
  const buttonLabel = newsletter?.buttonLabel ?? 'Subscribe';
  const successMessage = newsletter?.successMessage ?? "You're on the list. Good things incoming.";
  const consentNote =
    newsletter?.consentNote ?? 'No spam. Unsubscribe any time. Read the privacy policy.';

  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [firstName, setFirstName] = useState('');
  // The own list needs one more step (the confirmation email), so it says so.
  const [doneMessage, setDoneMessage] = useState('');

  // Guard: render nothing (or the fallback link) when the feature is off or
  // nothing can take a sign-up.
  if (!newsletter?.enabled) return null;
  const canSubmit = staticPath || ownList === 'ready';
  if (!canSubmit) {
    if (ownList === 'checking' || !fallbackUrl) return null;
    return (
      <a className={fallbackClassName} href={fallbackUrl} target="_blank" rel="noopener noreferrer">
        Sign up for the newsletter<span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  const askName = !newsletter.formActionUrl && ownList === 'ready';

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
      name: askName ? firstName.trim() || undefined : undefined,
      tag: undefined,
      source,
      formActionUrl: newsletter.formActionUrl,
      audienceId: newsletter.audienceId,
    });

    if (result.ok) {
      setDoneMessage(askName ? result.message : successMessage);
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
        <p className="font-display text-h4 text-foreground">{doneMessage || successMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-l">
      {/* Brand accent stripe at the top — matches card grammar. */}
      <div className="mb-l h-0.5 bg-primary" aria-hidden="true"></div>

      {!hideHeading && <h3 className="font-display text-h3 text-foreground">{heading}</h3>}
      {!hideHeading && blurb && (
        <p className="mt-s text-sm leading-relaxed text-foreground/80">{blurb}</p>
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

        {askName && (
          <div>
            <label
              htmlFor={`${idPrefix}-name`}
              className="mb-1 block text-sm font-semibold text-foreground"
            >
              First name <span className="font-normal text-foreground/70">(optional)</span>
            </label>
            <input
              id={`${idPrefix}-name`}
              name="name"
              type="text"
              autoComplete="given-name"
              maxLength={60}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="min-h-[44px] w-full rounded-md border border-input bg-background px-s py-s text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>
        )}

        <div>
          <label
            htmlFor={`${idPrefix}-email`}
            className="mb-1 block text-sm font-semibold text-foreground"
          >
            Email address
          </label>
          <input
            ref={emailRef}
            id={`${idPrefix}-email`}
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
            aria-describedby={errorMsg ? `${idPrefix}-email-error` : undefined}
            placeholder="you@example.com"
            className="min-h-[44px] w-full rounded-md border border-input bg-background px-s py-s text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
          />
          {errorMsg && (
            <p
              id={`${idPrefix}-email-error`}
              role="alert"
              aria-live="polite"
              className="mt-xs text-sm text-destructive"
            >
              {errorMsg}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="press-tactile inline-flex min-h-[44px] w-full items-center justify-center rounded-sm bg-primary-dark px-l py-s text-xs font-semibold tracking-widest text-white uppercase transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting' ? 'Subscribing…' : buttonLabel}
        </button>
      </form>

      {/* Consent / privacy note. Parses the privacy link pattern for the /privacy page. */}
      <p className="mt-s text-xs leading-relaxed text-foreground/70">
        {consentNote.includes('privacy policy') ? (
          <>
            {consentNote.replace('privacy policy', '').trimEnd()}{' '}
            <a
              href="/privacy/"
              className="underline underline-offset-2 transition-colors hover:text-link"
            >
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

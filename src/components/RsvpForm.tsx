// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care (the words are safe to edit)
// =============================================================================
// RsvpForm - the reply form inside an RSVP section (PORTS.md card 121)
// =============================================================================
// Hydrates client:visible. Before it shows the form it asks /api/rsvp/ about the
// event, so it can say plainly when replies are closed, when the event is full,
// or when RSVPs are not switched on yet, instead of a form that cannot work.
// The server checks everything again (src/lib/mail-rsvp.ts): this file only
// draws and posts.
//
// Classes are the shared design tokens (bg-card, border-input, text-foreground)
// so the form takes each site's colours and works in light and dark (rule 3).
// A site's own section component wraps it (the starter's RsvpSection.astro,
// FBC Auburn's RsvpBlock.astro) and owns the heading and the band.
//
// A11y: every control has a visible label; errors are tied to their field with
// aria-describedby and the first one is focused; the result is announced in a
// role="status" region; 44px tap targets.
// =============================================================================
import { useEffect, useRef, useState, type FormEvent } from 'react';

export interface RsvpQuestion {
  label: string;
  kind: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
  options: string[];
  required: boolean;
}

interface Props {
  /** "<page id>:<block key>", from the section's projection. */
  eventKey: string;
  eventName: string;
  questions: RsvpQuestion[];
  maxParty: number;
  /** Closed at build time already (the server decides again). */
  closedAtBuild?: boolean;
  /** Where to send people when RSVPs are off: usually the contact page. */
  contactHref?: string;
  idPrefix?: string;
  /** The site's primary button classes. */
  buttonClassName?: string;
}

type Phase = 'checking' | 'open' | 'off' | 'closed' | 'full' | 'sending' | 'done';

const FIELD =
  'min-h-[44px] w-full rounded-md border border-input bg-background px-s py-s text-foreground focus:ring-2 focus:ring-ring focus:outline-none';
const LABEL = 'mb-1 block text-sm font-semibold text-foreground';

export default function RsvpForm({
  eventKey,
  eventName,
  questions,
  maxParty,
  closedAtBuild = false,
  contactHref = '/contact/',
  idPrefix = 'rsvp',
  buttonClassName = 'press-tactile inline-flex min-h-[44px] items-center justify-center rounded-sm bg-primary-dark px-l py-s text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60',
}: Props) {
  const [phase, setPhase] = useState<Phase>(closedAtBuild ? 'closed' : 'checking');
  const [waitlist, setWaitlist] = useState(false);
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ status: string; emailed: boolean } | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const renderedAt = useRef(Date.now());

  useEffect(() => {
    if (closedAtBuild) return;
    let live = true;
    fetch(`/api/rsvp/?event=${encodeURIComponent(eventKey)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          s: {
            ready?: boolean;
            closed?: boolean;
            full?: boolean;
            waitlist?: boolean;
            seatsLeft?: number | null;
          } | null,
        ) => {
          if (!live) return;
          if (!s?.ready) return setPhase('off');
          setWaitlist(Boolean(s.waitlist));
          setSeatsLeft(typeof s.seatsLeft === 'number' ? s.seatsLeft : null);
          if (s.closed) return setPhase('closed');
          if (s.full && !s.waitlist) return setPhase('full');
          setPhase('open');
        },
      )
      .catch(() => live && setPhase('off'));
    return () => {
      live = false;
    };
  }, [eventKey, closedAtBuild]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const answers: Record<string, string> = {};
    questions.forEach((q, i) => {
      const v = data.get(`q${i}`);
      answers[String(i)] = q.kind === 'checkbox' ? (v ? 'yes' : '') : String(v ?? '');
    });
    setErrors({});
    setMessage('');
    setPhase('sending');
    try {
      const res = await fetch('/api/rsvp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          event: eventKey,
          name: data.get('name'),
          email: data.get('email'),
          partySize: Number(data.get('partySize') ?? 1),
          answers,
          website: data.get('website'),
          renderedAt: renderedAt.current,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: string;
        emailed?: boolean;
        errors?: Record<string, string>;
        error?: string;
        full?: boolean;
        closed?: boolean;
      };
      if (res.ok && body.ok) {
        setResult({ status: body.status ?? 'going', emailed: Boolean(body.emailed) });
        setPhase('done');
        return;
      }
      if (body.full) return setPhase('full');
      if (body.closed) return setPhase('closed');
      setErrors(body.errors ?? {});
      setMessage(
        body.error ??
          (body.errors
            ? 'Please check the boxes marked below.'
            : 'Sorry, that did not go through. Please try again.'),
      );
      setPhase('open');
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.focus();
      });
    } catch {
      setMessage('Could not reach the website. Check your connection and try again.');
      setPhase('open');
    }
  }

  if (phase === 'checking')
    return <p className="text-sm text-foreground/70">Loading the RSVP form…</p>;

  if (phase === 'off' || phase === 'closed' || phase === 'full') {
    const text =
      phase === 'closed'
        ? `RSVPs for ${eventName} have closed.`
        : phase === 'full'
          ? `${eventName} is full. Thank you for your interest.`
          : `RSVPs for ${eventName} open here soon.`;
    return (
      <div role="status" className="rounded-md border border-border bg-card p-l">
        <p className="text-foreground">
          {text}{' '}
          <a href={contactHref} className="underline underline-offset-2 hover:text-link">
            Get in touch
          </a>{' '}
          if you have a question.
        </p>
      </div>
    );
  }

  if (phase === 'done' && result) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-primary bg-muted p-l"
      >
        <p className="font-display text-h4 text-foreground">
          {result.status === 'waitlist'
            ? 'You are on the waiting list.'
            : 'Thank you, you are booked in.'}
        </p>
        <p className="mt-s text-foreground/80">
          {result.emailed
            ? 'We have emailed you the details. If it is not in your inbox, check your spam folder.'
            : 'We have your reply.'}
        </p>
      </div>
    );
  }

  const err = (name: string) =>
    errors[name] ? (
      <p id={`${idPrefix}-${name}-error`} className="mt-xs text-sm text-destructive">
        {errors[name]}
      </p>
    ) : null;
  const described = (name: string) => (errors[name] ? `${idPrefix}-${name}-error` : undefined);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-busy={phase === 'sending'}
      className="space-y-m rounded-md border border-border bg-card p-l"
    >
      {seatsLeft !== null && seatsLeft > 0 && seatsLeft <= 20 && (
        <p className="text-sm text-foreground/80">
          {seatsLeft === 1 ? 'One place left.' : `${seatsLeft} places left.`}
        </p>
      )}
      {seatsLeft === 0 && waitlist && (
        <p className="text-sm text-foreground/80">
          This event is full. Reply below to join the waiting list.
        </p>
      )}
      {message && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 p-s text-sm text-foreground"
        >
          {message}
        </div>
      )}

      {/* Honeypot: hidden from people, filled by bots. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label>
          Website (leave blank)
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-name`} className={LABEL}>
          Your name
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          type="text"
          required
          autoComplete="name"
          maxLength={120}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={described('name')}
          className={FIELD}
        />
        {err('name')}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-email`} className={LABEL}>
          Email, for your confirmation
        </label>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={described('email')}
          className={FIELD}
        />
        {err('email')}
      </div>

      {maxParty > 1 && (
        <div>
          <label htmlFor={`${idPrefix}-party`} className={LABEL}>
            How many people, including you?
          </label>
          <select
            id={`${idPrefix}-party`}
            name="partySize"
            defaultValue="1"
            aria-invalid={Boolean(errors.partySize)}
            aria-describedby={described('partySize')}
            className={FIELD}
          >
            {Array.from({ length: maxParty }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          {err('partySize')}
        </div>
      )}

      {questions.map((q, i) => {
        const id = `${idPrefix}-q${i}`;
        const name = `q${i}`;
        const label = (
          <>
            {q.label}
            {!q.required && <span className="font-normal text-foreground/70"> (optional)</span>}
          </>
        );
        if (q.kind === 'checkbox') {
          return (
            <div key={i}>
              <label htmlFor={id} className="flex min-h-[44px] items-center gap-s text-foreground">
                <input
                  id={id}
                  name={name}
                  type="checkbox"
                  value="yes"
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={described(name)}
                  className="size-5"
                />
                <span>{label}</span>
              </label>
              {err(name)}
            </div>
          );
        }
        return (
          <div key={i}>
            <label htmlFor={id} className={LABEL}>
              {label}
            </label>
            {q.kind === 'textarea' ? (
              <textarea
                id={id}
                name={name}
                rows={4}
                maxLength={1000}
                required={q.required}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={described(name)}
                className={FIELD}
              />
            ) : q.kind === 'select' ? (
              <select
                id={id}
                name={name}
                required={q.required}
                defaultValue=""
                aria-invalid={Boolean(errors[name])}
                aria-describedby={described(name)}
                className={FIELD}
              >
                <option value="">Choose one</option>
                {q.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={name}
                type={q.kind === 'email' ? 'email' : q.kind === 'phone' ? 'tel' : 'text'}
                autoComplete={q.kind === 'phone' ? 'tel' : 'off'}
                maxLength={1000}
                required={q.required}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={described(name)}
                className={FIELD}
              />
            )}
            {err(name)}
          </div>
        );
      })}

      <button type="submit" disabled={phase === 'sending'} className={buttonClassName}>
        {phase === 'sending'
          ? 'Sending…'
          : seatsLeft === 0 && waitlist
            ? 'Join the waiting list'
            : 'Send my RSVP'}
      </button>
    </form>
  );
}

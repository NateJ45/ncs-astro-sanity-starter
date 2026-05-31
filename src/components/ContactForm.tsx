// Foundation, edit with care
// Contact form. Posts to Web3Forms (env: PUBLIC_WEB3FORMS_KEY).
// Autosaves draft to localStorage so a long message survives accidental navigation.
// Honeypot included. Accessible focus management on error.
//
// Form scope (in order):
//   1. Name (required)
//   2. Email + Phone (email required, phone optional)
//   3. Location + Project type (both required) — paired row
//   4. Budget range + Timeline (both required) — paired row
//   5. Tell us about the space (required, textarea)
//   6. How did you hear about us? (optional, dropdown) — marketing intel
//
// Why these fields and not more: every additional field costs conversion.
// These four added fields (location, budget, timeline, source) cover what
// the studio needs to scope a project and prep for the first call —
// service-area + travel-fee bucket, ballpark tier, urgency, and a lightweight
// lead-source signal for marketing decisions later.
//
// All five dropdowns (project type, location, budget, timeline, source) accept
// Sanity-driven overrides via props (passed from contact.astro). The constants
// below remain the fallback so the form renders cleanly even before
// contactPage.form*Options are set in Studio.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { site } from '@/data/site';

const DRAFT_KEY = `${site.storageKeyPrefix}-contact-draft`;
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const ACCESS_KEY = import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined;

const DEFAULT_PROJECT_TYPES = [
  'In-Home Consultation',
  'E-Design',
  'Full Room Design',
  'Full Room Design + Styling',
  'Shopping & Sourcing',
  'Builder or Realtor Partnership',
  'Gift Certificate',
  "Not sure yet, let's chat",
] as const;

// Map ?type= URL param values to dropdown option labels.
// Defensive: unrecognised values produce undefined, which leaves the default blank.
const TYPE_PARAM_MAP: Record<string, string> = {
  'consultation': 'In-Home Consultation',
  'e-design':     'E-Design',
  'full-room':    'Full Room Design',
  'styling':      'Full Room Design + Styling',
  'shopping':     'Shopping & Sourcing',
  'builder-realtor': 'Builder or Realtor Partnership',
  'gift-certificate': 'Gift Certificate',
  // quiz: map to the catch-all so the user sees a reasonable default
  'quiz':         "Not sure yet, let's chat",
};

// Service-area cities — replace with your actual service area before launch.
const LOCATION_OPTIONS = [
  'My City',
  'Nearby City',
  'Outside the area',
] as const;

// Budget brackets — adjust to your studio's actual price points before launch.
// The "Not sure yet" option keeps the form approachable.
const BUDGET_OPTIONS = [
  'Under $2K (just a consultation or quick advice)',
  '$2K – $10K (a single room or two)',
  '$10K – $30K (multiple rooms or styling)',
  '$30K – $75K (whole-home design)',
  '$75K+ (major project)',
  "Not sure yet, happy to talk it through",
] as const;

// Timeline buckets cover the realistic spread for residential design work.
const TIMELINE_OPTIONS = [
  'ASAP, within the next month',
  '1–3 months out',
  '3–6 months out',
  'More than 6 months',
  "Flexible, I'm just exploring",
] as const;

// Lead-source options. Optional field; helps understand where good leads
// come from over time without forcing the question.
const SOURCE_OPTIONS = [
  'Google search',
  'Instagram',
  'Facebook',
  'Houzz',
  'Friend or family referral',
  'Builder or realtor referral',
  'Took the style quiz',
  'Downloaded a free guide',
  'Reading the journal',
  'Saw a project in person',
  'Other',
] as const;

interface ContactFormProps {
  /** Optional. Override the default project-type dropdown options (from contactPage.formProjectTypeOptions). */
  projectTypes?: string[];
  /** Optional. Override the default location dropdown options (from contactPage.formLocationOptions). */
  locations?: string[];
  /** Optional. Override the default budget dropdown options (from contactPage.formBudgetOptions). */
  budgets?: string[];
  /** Optional. Override the default timeline dropdown options (from contactPage.formTimelineOptions). */
  timelines?: string[];
  /** Optional. Override the default "how did you hear" dropdown options (from contactPage.formSourceOptions). */
  sources?: string[];
}

interface Draft {
  name: string;
  email: string;
  phone: string;
  location: string;
  projectType: string;
  budget: string;
  timeline: string;
  message: string;
  source: string;
  zip: string;
}

const EMPTY: Draft = {
  name: '',
  email: '',
  phone: '',
  location: '',
  projectType: '',
  budget: '',
  timeline: '',
  message: '',
  source: '',
  zip: '',
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactForm({
  projectTypes,
  locations,
  budgets,
  timelines,
  sources,
}: ContactFormProps = {}) {
  // Use Sanity-driven options when provided; fall back to defaults so the form
  // is still usable when contactPage.form*Options haven't been filled in.
  const pick = (override?: string[], fallback?: readonly string[]) =>
    Array.isArray(override) && override.length > 0 ? override : [...(fallback ?? [])];
  const projectTypeOptions = pick(projectTypes, DEFAULT_PROJECT_TYPES);
  const locationOptions = pick(locations, LOCATION_OPTIONS);
  const budgetOptions = pick(budgets, BUDGET_OPTIONS);
  const timelineOptions = pick(timelines, TIMELINE_OPTIONS);
  const sourceOptions = pick(sources, SOURCE_OPTIONS);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const formRef = useRef<HTMLFormElement | null>(null);
  const restoredOnce = useRef(false);

  // Restore draft on mount, then apply ?type= URL param if present.
  // URL param wins over saved draft for the projectType field on first load
  // only — this is the "preselect" behaviour for CTAs on /e-design,
  // /gift-certificates, etc. Other draft fields are still restored normally.
  useEffect(() => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;

    // Read the ?type= query param before touching localStorage.
    let preselectedType = '';
    try {
      const params = new URLSearchParams(window.location.search);
      const typeParam = params.get('type') ?? '';
      preselectedType = TYPE_PARAM_MAP[typeParam] ?? '';
      // Only accept the preselected value if the option actually exists in the
      // current projectTypeOptions list (respects Sanity overrides).
      if (preselectedType && !projectTypeOptions.includes(preselectedType)) {
        preselectedType = '';
      }
    } catch { /* ignore — SSR / non-browser environment */ }

    // Restore saved draft, then override projectType if the URL param matched.
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDraft({
          ...EMPTY,
          ...parsed,
          // URL param always wins for projectType on first load.
          ...(preselectedType ? { projectType: preselectedType } : {}),
        });
      } else if (preselectedType) {
        setDraft((d) => ({ ...d, projectType: preselectedType }));
      }
    } catch {
      if (preselectedType) {
        setDraft((d) => ({ ...d, projectType: preselectedType }));
      }
    }
  }, []);

  // Persist on every change, debounced lightly via the natural re-render cadence.
  useEffect(() => {
    if (!restoredOnce.current) return;
    // Don't bother writing an empty draft (avoids overwriting an existing one on first mount if state lags)
    const hasContent = Object.values(draft).some((v) => v.trim().length > 0);
    if (!hasContent) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* localStorage may be full or disabled */ }
  }, [draft]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(d: Draft): Partial<Record<keyof Draft, string>> {
    const errs: Partial<Record<keyof Draft, string>> = {};
    if (!d.name.trim()) errs.name = 'Please enter your name.';
    if (!d.email.trim()) errs.email = 'Please enter an email address.';
    else if (!/.+@.+\..+/.test(d.email)) errs.email = 'That email address looks off.';
    if (!d.location) errs.location = "Pick the closest area — even if it's 'outside.'";
    if (!d.projectType) errs.projectType = 'Pick the closest match — we can sort the rest later.';
    if (!d.budget) errs.budget = 'A rough range helps us suggest the right tier.';
    if (!d.timeline) errs.timeline = 'A timeline helps us know if we can take this on.';
    if (!d.message.trim()) errs.message = 'A sentence or two helps us prep.';
    return errs;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage('');
    const errs = validate(draft);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Focus the first invalid field for screen-reader and keyboard users
      const firstKey = Object.keys(errs)[0] as keyof Draft;
      const el = formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`);
      el?.focus();
      return;
    }

    // Honeypot check (botcheck) — bots fill it, humans don't.
    if (draft.zip) {
      // Pretend success so the bot moves on; don't actually submit.
      setStatus('success');
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      return;
    }

    if (!ACCESS_KEY) {
      setStatus('error');
      setErrorMessage(
        "The form isn't connected yet (missing Web3Forms key). Please email " + site.name + " directly."
      );
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          // Subject line front-loads project type + location for easy inbox triage.
          subject: `Inquiry: ${draft.projectType} in ${draft.location} (${draft.name})`,
          from_name: `${site.name} website`,
          name: draft.name,
          email: draft.email,
          phone: draft.phone || undefined,
          location: draft.location,
          project_type: draft.projectType,
          budget_range: draft.budget,
          timeline: draft.timeline,
          message: draft.message,
          // Lead source is optional; omit from the payload when blank so it
          // doesn't add a "Source: " line to the notification email for no reason.
          source: draft.source || undefined,
          // Web3Forms autoresponder fields. When these are set, Web3Forms
          // sends a confirmation email to the visitor in addition to the
          // notification email to the studio. The reply-to_email key is
          // documented at https://docs.web3forms.com/#autoresponder.
          // The autoresponder must be enabled in the Web3Forms dashboard
          // for this project's access key.
          replyto: draft.email,
          autoresponse: true,
          autoresponse_from: `${site.name} <noreply@${site.domain}>`,
          autoresponse_subject: `Got your note. We'll be in touch soon.`,
          autoresponse_message: `Hi ${draft.name},\n\nThank you for reaching out! We read every inquiry personally and will get back to you within a couple of business days.\n\nIf your project is time-sensitive, just mention that in your reply to this email and we'll prioritize accordingly.\n\n${site.name}\n${site.domain}`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setStatus('success');
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        setDraft(EMPTY);
      } else {
        setStatus('error');
        setErrorMessage(
          json.message ||
            "Couldn't send right now. Try again in a minute, or contact us directly."
        );
      }
    } catch {
      setStatus('error');
      setErrorMessage(
        "Couldn't send right now. Check your connection, or contact us directly."
      );
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-primary bg-muted p-l"
      >
        <h3 className="font-display text-h3 text-foreground">Thanks, your note's on its way.</h3>
        <p className="mt-s text-foreground/80">
          We read everything personally and get back within a couple of business days.
          If your project's time-sensitive, mention that when you reply.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-m" aria-busy={status === 'submitting'}>
      {errorMessage && (
        <div role="alert" aria-live="polite" className="rounded-md border border-destructive bg-destructive/10 p-m text-foreground">
          {errorMessage}
        </div>
      )}

      {/* Honeypot: bots fill this; humans can't see it. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          ZIP code (leave blank)
          <input
            type="text"
            name="zip"
            tabIndex={-1}
            autoComplete="off"
            value={draft.zip}
            onChange={(e) => update('zip', e.target.value)}
          />
        </label>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-1">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          value={draft.name}
          onChange={(e) => update('name', e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.name && <p id="name-error" role="alert" aria-live="polite" className="mt-xs text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-m">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={draft.email}
            onChange={(e) => update('email', e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.email && <p id="email-error" role="alert" aria-live="polite" className="mt-xs text-sm text-destructive">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-1">
            Phone <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={draft.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Location + project type — paired row. Location is asked first so the
          studio can mentally bucket the lead before reading the rest. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-m">
        <div>
          <label htmlFor="location" className="block text-sm font-semibold text-foreground mb-1">
            Where's the project?
          </label>
          <select
            id="location"
            name="location"
            required
            value={draft.location}
            onChange={(e) => update('location', e.target.value)}
            aria-invalid={!!errors.location}
            aria-describedby={errors.location ? 'location-error location-hint' : 'location-hint'}
            className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Pick the closest area</option>
            {locationOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {errors.location ? (
            <p id="location-error" role="alert" aria-live="polite" className="mt-xs text-sm text-destructive">{errors.location}</p>
          ) : (
            <p id="location-hint" className="mt-xs text-sm text-muted-foreground">
              Pick the closest match to your project location.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="projectType" className="block text-sm font-semibold text-foreground mb-1">Project type</label>
          <select
            id="projectType"
            name="projectType"
            required
            value={draft.projectType}
            onChange={(e) => update('projectType', e.target.value)}
            aria-invalid={!!errors.projectType}
            aria-describedby={errors.projectType ? 'projectType-error' : undefined}
            className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Pick the closest match</option>
            {projectTypeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {errors.projectType && <p id="projectType-error" role="alert" aria-live="polite" className="mt-xs text-sm text-destructive">{errors.projectType}</p>}
        </div>
      </div>

      {/* Budget + timeline — paired row. Budget phrasing is deliberate ("rough"
          + "no judgment" hint) so the question doesn't feel transactional. The
          "Not sure yet" option in BUDGET_OPTIONS keeps the form approachable
          for people who genuinely don't know what room design costs. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-m">
        <div>
          <label htmlFor="budget" className="block text-sm font-semibold text-foreground mb-1">
            Rough budget range
          </label>
          <select
            id="budget"
            name="budget"
            required
            value={draft.budget}
            onChange={(e) => update('budget', e.target.value)}
            aria-invalid={!!errors.budget}
            aria-describedby={errors.budget ? 'budget-error budget-hint' : 'budget-hint'}
            className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Pick a bracket</option>
            {budgetOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {errors.budget ? (
            <p id="budget-error" role="alert" aria-live="polite" className="mt-xs text-sm text-destructive">{errors.budget}</p>
          ) : (
            <p id="budget-hint" className="mt-xs text-sm text-muted-foreground">
              No judgment — this helps us suggest the right tier.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="timeline" className="block text-sm font-semibold text-foreground mb-1">
            Timeline
          </label>
          <select
            id="timeline"
            name="timeline"
            required
            value={draft.timeline}
            onChange={(e) => update('timeline', e.target.value)}
            aria-invalid={!!errors.timeline}
            aria-describedby={errors.timeline ? 'timeline-error' : undefined}
            className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">When do you want to start?</option>
            {timelineOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {errors.timeline && <p id="timeline-error" role="alert" aria-live="polite" className="mt-xs text-sm text-destructive">{errors.timeline}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-foreground mb-1">Tell us about the space</label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          value={draft.message}
          onChange={(e) => update('message', e.target.value)}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error message-hint' : 'message-hint'}
          className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.message ? (
          <p id="message-error" role="alert" aria-live="polite" className="mt-xs text-sm text-destructive">{errors.message}</p>
        ) : (
          <p id="message-hint" className="mt-xs text-sm text-muted-foreground">
            What room or rooms? What's not working? Any photos you can describe in words?
          </p>
        )}
      </div>

      {/* Optional lead-source. Quiet UI — small, no error state, no hint text.
          Marketing intelligence accrues over time without making the form
          longer to fill out. */}
      <div>
        <label htmlFor="source" className="block text-sm font-semibold text-foreground mb-1">
          How did you hear about us? <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <select
          id="source"
          name="source"
          value={draft.source}
          onChange={(e) => update('source', e.target.value)}
          className="w-full px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Skip if you'd rather not say</option>
          {sourceOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center px-l py-s bg-primary-dark text-white font-semibold uppercase tracking-widest text-sm hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'submitting' ? 'Sending…' : 'Send message'}
      </button>

      <p className="text-xs text-muted-foreground">
        We never sign you up for anything. We read every note personally.
      </p>
    </form>
  );
}

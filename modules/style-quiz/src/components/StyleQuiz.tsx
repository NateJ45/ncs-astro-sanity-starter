// Safe to edit by hand
// /quiz React island. Hydrates client:visible.
//
// Flow:
//   1. Image-answer questions (one per step)
//   2. Qualifier questions (budget / timeline / room) — optional, shown when present
//   3. Email gate — mode from Sanity (optional / required / required-for-bonus)
//   4. Result screen — archetype name, description, images, CTA
//
// Accessibility:
//   - aria-live="polite" region announces each step change
//   - Answers are real <button> elements (Enter/Space select by default)
//   - Focus moves to the step heading on step change
//   - Visible focus indicators via ring-2 ring-ring
//   - Progress bar carries aria-valuenow / aria-valuemax
//   - All interactive targets are min 44px
//   - Respects prefers-reduced-motion via CSS (no JS animation logic)
//   - Honeypot on the email form
//
// Theming:
//   - Uses only semantic tokens (bg-background, text-foreground, bg-muted, etc.)
//     so both light and dark mode work correctly by construction.
//   - Brand stripe on result card per brand-stripe rhythm.

import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeEmail } from '@/lib/subscribe';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnswerImageUrl {
  url: string;
  url2x: string;
  alt: string;
}

export interface AnswerWithUrl {
  label: string;
  image?: AnswerImageUrl;
  archetypeWeights: Array<{ archetypeSlug: string; weight: number }>;
}

export interface QuestionWithUrls {
  prompt: string;
  helpText?: string;
  answers: AnswerWithUrl[];
}

export interface QualifierOption {
  label: string;
  value: string;
}

export interface Qualifier {
  prompt: string;
  type: 'budget' | 'timeline' | 'room';
  options: QualifierOption[];
}

export interface ArchetypeImageUrl {
  url: string;
  url2x: string;
  alt: string;
}

export interface ArchetypeWithUrls {
  name: string;
  slug: string;
  // Portable Text blocks — typed loosely to avoid pulling full PT types into the bundle
  description: Array<{
    _type: string;
    _key?: string;
    style?: string;
    children?: Array<{ _type: string; text?: string; marks?: string[] }>;
  }> | null;
  images: ArchetypeImageUrl[];
  recommendedServiceRef?: { _id: string; name: string; slug: string } | null;
  resultCtaLabel?: string;
}

export interface GateConfig {
  mode: 'optional' | 'required' | 'required-for-bonus';
  heading?: string;
  blurb?: string;
  consentNote?: string;
  espTag?: string;
}

export interface RoutingConfig {
  highIntentRule?: string;
  bookCtaLabel?: string;
  guideCtaLabel?: string;
  guideRef?: { slug: string } | null;
}

export interface StyleQuizConfig {
  questions: QuestionWithUrls[];
  qualifiers: Qualifier[];
  archetypes: ArchetypeWithUrls[];
  gate: GateConfig;
  routing: RoutingConfig;
}

interface Props {
  config: StyleQuizConfig;
}

// ── Archetype score computation ───────────────────────────────────────────────

function computeArchetype(
  archetypes: ArchetypeWithUrls[],
  chosenAnswers: AnswerWithUrl[],
): ArchetypeWithUrls {
  const scores = new Map<string, number>(archetypes.map((a) => [a.slug, 0]));
  for (const answer of chosenAnswers) {
    for (const w of answer.archetypeWeights) {
      if (scores.has(w.archetypeSlug)) {
        scores.set(w.archetypeSlug, (scores.get(w.archetypeSlug) ?? 0) + w.weight);
      }
    }
  }
  // Highest score wins; tie -> first defined archetype.
  let best = archetypes[0];
  let bestScore = scores.get(best.slug) ?? 0;
  for (const arch of archetypes.slice(1)) {
    const s = scores.get(arch.slug) ?? 0;
    if (s > bestScore) {
      best = arch;
      bestScore = s;
    }
  }
  return best;
}

// ── Intent routing ────────────────────────────────────────────────────────────

function isHighIntent(qualifierAnswers: string[], highIntentRule: string | undefined): boolean {
  if (!highIntentRule?.trim()) return false;
  const ruleValues = highIntentRule.split(',').map((v) => v.trim()).filter(Boolean);
  return qualifierAnswers.some((ans) => ruleValues.includes(ans));
}

// ── Minimal Portable Text renderer ───────────────────────────────────────────
// Renders only paragraph + bold + italic — the subset the archetype description
// schema allows. No external @portabletext/react import to keep bundle lean.

function renderPortableText(
  blocks: ArchetypeWithUrls['description'],
): React.ReactNode {
  if (!blocks || blocks.length === 0) return null;
  return blocks.map((block, bi) => {
    if (block._type !== 'block') return null;
    const children = (block.children ?? []).map((span, si) => {
      const text = span.text ?? '';
      const marks = span.marks ?? [];
      let node: React.ReactNode = text;
      if (marks.includes('strong')) node = <strong key={si} className="font-semibold">{node}</strong>;
      if (marks.includes('em')) node = <em key={si} className="italic">{node}</em>;
      return <span key={si}>{node}</span>;
    });
    return (
      <p key={bi} className="my-s text-foreground/90 text-base leading-relaxed">
        {children}
      </p>
    );
  });
}

// ── Email gate form ───────────────────────────────────────────────────────────

interface GateFormProps {
  gate: GateConfig;
  archetypeName: string;
  mode: 'required' | 'optional' | 'required-for-bonus';
  onSuccess: () => void;
  onSkip?: () => void;
}

function GateForm({ gate, archetypeName, mode, onSuccess, onSkip }: GateFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [honeypot, setHoneypot] = useState(''); // hidden — bots fill this
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    // Honeypot: if filled, silently fake success
    if (honeypot) {
      onSuccess();
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      emailRef.current?.focus();
      return;
    }
    if (!/.+@.+\..+/.test(trimmedEmail)) {
      setErrorMsg('That email address looks off. Double-check and try again.');
      emailRef.current?.focus();
      return;
    }

    setStatus('submitting');
    const result = await subscribeEmail({
      email: trimmedEmail,
      name: name.trim() || undefined,
      tag: gate.espTag || 'style-quiz',
      source: 'style-quiz',
    });

    if (result.ok) {
      setStatus('success');
      onSuccess();
    } else {
      setStatus('error');
      setErrorMsg(result.message);
      // Focus the error region so screen readers announce
      setTimeout(() => errorRef.current?.focus(), 50);
    }
  }

  const heading = gate.heading || `You found your style, ${archetypeName.split(' ')[0]}.`;
  const blurb = gate.blurb || "Pop your email in and we'll send your full result.";

  return (
    <div className="mx-auto max-w-md w-full">
      <h3 className="font-display text-h3 text-foreground mb-s">{heading}</h3>
      {blurb && <p className="text-foreground/80 mb-m">{blurb}</p>}

      {/* Error region — focused on error for screen-reader announcement */}
      {errorMsg && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="mb-m rounded-md border border-destructive bg-destructive/10 p-s text-sm text-foreground"
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-s">
        {/* Honeypot — visually hidden, bots fill it */}
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
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>
        </div>

        <div>
          <label htmlFor="quiz-gate-name" className="block text-sm font-semibold text-foreground mb-1">
            First name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="quiz-gate-name"
            name="name"
            type="text"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full min-h-[44px] px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="quiz-gate-email" className="block text-sm font-semibold text-foreground mb-1">
            Email
          </label>
          <input
            id="quiz-gate-email"
            ref={emailRef}
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="quiz-gate-consent"
            className="w-full min-h-[44px] px-s py-s border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <p id="quiz-gate-consent" className="text-xs text-muted-foreground">
          {gate.consentNote
            ? gate.consentNote
            : 'No spam, ever.'}
          {' '}
          <a href="/privacy" className="text-link underline underline-offset-2 hover:text-primary transition-colors">
            Privacy policy
          </a>
          .
        </p>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex items-center justify-center min-h-[44px] w-full px-l py-s bg-primary-dark text-white font-semibold uppercase tracking-widest text-sm hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors press-tactile"
        >
          {status === 'submitting' ? 'Sending…' : 'Send my results'}
        </button>
      </form>

      {mode === 'optional' && onSkip && (
        <button
          onClick={onSkip}
          className="mt-m block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-ring rounded"
        >
          Skip and see my result
        </button>
      )}
    </div>
  );
}

// ── Result screen ─────────────────────────────────────────────────────────────

interface ResultScreenProps {
  archetype: ArchetypeWithUrls;
  qualifierAnswers: string[];
  routing: RoutingConfig;
  gate: GateConfig;
  gateEmailSubmitted: boolean;
  onGateSuccess: () => void;
  onGateSkip: () => void;
  onRetake: () => void;
}

function ResultScreen({
  archetype,
  qualifierAnswers,
  routing,
  gate,
  gateEmailSubmitted,
  onGateSuccess,
  onGateSkip,
  onRetake,
}: ResultScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the result heading when the screen mounts
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Intent routing
  const highIntent = isHighIntent(qualifierAnswers, routing.highIntentRule);
  const ctaLabel = highIntent
    ? (routing.bookCtaLabel || 'Book a consultation')
    : (routing.guideCtaLabel || 'Get the free guide');
  const ctaHref = highIntent
    ? '/contact?type=quiz'
    : routing.guideRef?.slug
      ? `/guides/${routing.guideRef.slug}`
      : '/guides';

  // Gate: should we show the email gate?
  const showGate =
    !gateEmailSubmitted &&
    (gate.mode === 'required' || gate.mode === 'required-for-bonus' || gate.mode === 'optional');

  // For 'required' mode: gate blocks the result entirely until email is submitted
  const gateBlocksResult = gate.mode === 'required' && !gateEmailSubmitted;

  // For 'required-for-bonus': result is visible; bonus line shows after email
  const bonusMode = gate.mode === 'required-for-bonus';

  return (
    <div className="mx-auto max-w-content px-m py-section-lg">
      {/* Brand stripe */}
      <div className="h-0.5 bg-primary mb-l" aria-hidden="true" />

      {gateBlocksResult ? (
        // 'required' gate: show the form, no result preview
        <div className="mx-auto max-w-lg">
          <GateForm
            gate={gate}
            archetypeName={archetype.name}
            mode="required"
            onSuccess={onGateSuccess}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-section-md items-start">
          {/* Result copy column */}
          <div>
            <p className="text-xs uppercase tracking-eyebrow text-foreground/80 mb-s">
              Your design style
            </p>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-h1 text-foreground leading-headline-tight mb-m focus:outline-none"
            >
              {archetype.name}
            </h2>

            {archetype.description && archetype.description.length > 0 && (
              <div className="prose-none">
                {renderPortableText(archetype.description)}
              </div>
            )}

            {/* Email gate — optional or required-for-bonus */}
            {showGate && (
              <div className="mt-l border-t border-border pt-l">
                {bonusMode && gateEmailSubmitted && (
                  // Bonus unlocked message
                  <p className="text-sm text-foreground/80 mb-m">
                    Your results are on their way to your inbox.
                  </p>
                )}
                {!gateEmailSubmitted && (
                  <GateForm
                    gate={gate}
                    archetypeName={archetype.name}
                    mode={gate.mode as 'optional' | 'required-for-bonus'}
                    onSuccess={onGateSuccess}
                    onSkip={gate.mode === 'optional' ? onGateSkip : undefined}
                  />
                )}
              </div>
            )}

            {/* CTA */}
            <div className="mt-l flex flex-wrap gap-s">
              <a
                href={ctaHref}
                className="inline-flex items-center min-h-[44px] px-l py-s bg-primary-dark text-white font-semibold uppercase tracking-widest text-sm hover:bg-accent-dark transition-colors press-tactile"
              >
                {ctaLabel}
              </a>
              <button
                onClick={onRetake}
                className="inline-flex items-center min-h-[44px] px-l py-s border border-primary text-link font-semibold uppercase tracking-widest text-sm hover:bg-accent transition-colors press-tactile focus:outline-none focus:ring-2 focus:ring-ring rounded"
              >
                Retake the quiz
              </button>
            </div>
          </div>

          {/* Archetype images column */}
          {archetype.images.length > 0 && (
            <div className="grid grid-cols-2 gap-s">
              {archetype.images.slice(0, 4).map((img, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-md bg-muted aspect-[4/3]"
                >
                  <img
                    src={img.url}
                    srcSet={`${img.url} 1x, ${img.url2x} 2x`}
                    alt={img.alt}
                    width={300}
                    height={225}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Retake link when gate is blocking */}
      {gateBlocksResult && (
        <div className="mt-l text-center">
          <button
            onClick={onRetake}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-ring rounded"
          >
            Start over
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main quiz component ───────────────────────────────────────────────────────

export default function StyleQuiz({ config }: Props) {
  const { questions, qualifiers, archetypes, gate, routing } = config;

  // Total steps: image questions + qualifier steps (if any)
  const totalQuestionSteps = questions.length;
  const hasQualifiers = qualifiers.length > 0;
  const totalSteps = totalQuestionSteps + (hasQualifiers ? qualifiers.length : 0);

  // step index: 0 .. totalSteps-1 → then 'result'
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'questions' | 'qualifiers' | 'result'>('questions');

  // Accumulated answers
  const [chosenAnswers, setChosenAnswers] = useState<AnswerWithUrl[]>([]);
  const [qualifierAnswers, setQualifierAnswers] = useState<string[]>([]);

  // Gate state
  const [gateEmailSubmitted, setGateEmailSubmitted] = useState(false);

  // Computed result (set when we reach result phase)
  const [result, setResult] = useState<ArchetypeWithUrls | null>(null);

  // Refs for focus management
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  // Announce step changes to screen readers
  const [announcement, setAnnouncement] = useState('');

  function announceStep(msg: string) {
    setAnnouncement('');
    // Force re-announcement even if the text is the same
    setTimeout(() => setAnnouncement(msg), 50);
  }

  // Move focus to the step heading after step changes
  const focusHeading = useCallback(() => {
    setTimeout(() => stepHeadingRef.current?.focus(), 100);
  }, []);

  // Current question or qualifier
  const isInQuestions = phase === 'questions';
  const isInQualifiers = phase === 'qualifiers';

  const currentQuestion = isInQuestions ? questions[step] : null;
  const qualifierIndex = isInQualifiers ? step - totalQuestionSteps : -1;
  const currentQualifier = isInQualifiers && qualifierIndex >= 0 ? qualifiers[qualifierIndex] : null;

  // Progress: how many steps completed out of total (before result)
  const progressStep = isInQuestions ? step : step;
  const progressPercent = Math.round((progressStep / totalSteps) * 100);

  function handleAnswerSelect(answer: AnswerWithUrl) {
    const newAnswers = [...chosenAnswers, answer];
    setChosenAnswers(newAnswers);

    const nextStep = step + 1;

    if (nextStep < totalQuestionSteps) {
      // More image questions
      setStep(nextStep);
      announceStep(`Question ${nextStep + 1} of ${totalQuestionSteps}`);
      focusHeading();
    } else if (hasQualifiers && qualifiers.length > 0) {
      // Move into qualifiers
      setStep(nextStep);
      setPhase('qualifiers');
      announceStep(`Step ${nextStep + 1} of ${totalSteps}: ${qualifiers[0]?.prompt}`);
      focusHeading();
    } else {
      // No qualifiers — go straight to result
      const computed = computeArchetype(archetypes, newAnswers);
      setResult(computed);
      setPhase('result');
      announceStep(`Your result: ${computed.name}`);
    }
  }

  function handleQualifierSelect(value: string) {
    const newQualifierAnswers = [...qualifierAnswers, value];
    setQualifierAnswers(newQualifierAnswers);

    const nextStep = step + 1;
    const nextQualifierIndex = qualifierIndex + 1;

    if (nextQualifierIndex < qualifiers.length) {
      // More qualifiers
      setStep(nextStep);
      announceStep(`Step ${nextStep + 1} of ${totalSteps}: ${qualifiers[nextQualifierIndex]?.prompt}`);
      focusHeading();
    } else {
      // All done — compute result
      const computed = computeArchetype(archetypes, chosenAnswers);
      setResult(computed);
      setPhase('result');
      announceStep(`Your result: ${computed.name}`);
    }
  }

  function handleRetake() {
    setStep(0);
    setPhase('questions');
    setChosenAnswers([]);
    setQualifierAnswers([]);
    setResult(null);
    setGateEmailSubmitted(false);
    announceStep(`Question 1 of ${totalQuestionSteps}`);
    focusHeading();
  }

  // Result screen
  if (phase === 'result' && result) {
    return (
      <div role="main" aria-label="Quiz result">
        {/* Live region — always in DOM */}
        <div
          ref={liveRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>
        <ResultScreen
          archetype={result}
          qualifierAnswers={qualifierAnswers}
          routing={routing}
          gate={gate}
          gateEmailSubmitted={gateEmailSubmitted}
          onGateSuccess={() => setGateEmailSubmitted(true)}
          onGateSkip={() => setGateEmailSubmitted(true)}
          onRetake={handleRetake}
        />
      </div>
    );
  }

  // Question / qualifier step
  const stepLabel = isInQuestions
    ? `Question ${step + 1} of ${totalQuestionSteps}`
    : `Step ${step + 1} of ${totalSteps}`;

  const promptText = isInQuestions
    ? currentQuestion?.prompt
    : currentQualifier?.prompt;

  const helpText = isInQuestions ? currentQuestion?.helpText : undefined;

  return (
    <section
      className="mx-auto max-w-content px-m py-section-lg"
      aria-labelledby="quiz-step-heading"
    >
      {/* Live region for screen readers */}
      <div
        ref={liveRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Progress indicator */}
      <div className="mb-section-md">
        <div className="flex items-center justify-between mb-s">
          <p className="text-xs uppercase tracking-eyebrow text-foreground/80">
            {stepLabel}
          </p>
          <p className="text-xs text-muted-foreground" aria-hidden="true">
            {progressPercent}%
          </p>
        </div>
        <div
          className="h-1 bg-muted rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progressStep}
          aria-valuemax={totalSteps}
          aria-label={stepLabel}
        >
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step heading */}
      <h2
        id="quiz-step-heading"
        ref={stepHeadingRef}
        tabIndex={-1}
        className="font-display text-h2 text-foreground mb-s focus:outline-none"
      >
        {promptText}
      </h2>
      {helpText && (
        <p className="text-base text-foreground/75 mb-l">{helpText}</p>
      )}

      {/* Image answer grid (questions phase) */}
      {isInQuestions && currentQuestion && (
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-m mt-l"
          role="group"
          aria-label={`Answer options for: ${currentQuestion.prompt}`}
        >
          {currentQuestion.answers.map((answer, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAnswerSelect(answer)}
              className={[
                // 44px min height via aspect ratio + the explicit min-h fallback
                'group relative flex flex-col overflow-hidden rounded-md bg-muted',
                'border-2 border-transparent',
                'hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'transition-all duration-150 ease-out press-tactile card-lift',
                'min-h-[44px]',
              ].join(' ')}
            >
              {/* Answer image — decorative; the visible label below is the accessible name */}
              {answer.image ? (
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={answer.image.url}
                    srcSet={`${answer.image.url} 1x, ${answer.image.url2x} 2x`}
                    alt=""
                    width={400}
                    height={300}
                    loading={i < 4 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 motion-reduce:transform-none transition-transform duration-300 ease-out"
                  />
                </div>
              ) : (
                // Fallback when no image: a bronze-tinted placeholder
                <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-sm text-center px-s">
                    {answer.label}
                  </span>
                </div>
              )}
              {/* Answer label */}
              <span className="px-s py-xs text-sm font-medium text-foreground text-center leading-snug">
                {answer.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Qualifier options (qualifiers phase) */}
      {isInQualifiers && currentQualifier && (
        <div
          className="mt-l flex flex-col gap-s max-w-lg"
          role="group"
          aria-label={`Answer options for: ${currentQualifier.prompt}`}
        >
          {currentQualifier.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleQualifierSelect(opt.value)}
              className={[
                'group flex items-center min-h-[44px] w-full px-m py-s',
                'rounded-md border-2 border-border bg-background text-foreground',
                'hover:border-primary hover:bg-accent',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'transition-all duration-150 ease-out text-left text-base font-medium',
                'press-tactile',
              ].join(' ')}
            >
              <span className="inline-block w-3 h-3 rounded-full border-2 border-current mr-m flex-shrink-0 group-hover:border-primary group-focus:border-primary transition-colors" aria-hidden="true" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

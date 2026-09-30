// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// preview-navigation — the bounce-aware page-switch state machine
// =============================================================================
// The editor-visible promise these pin down: one click switches the page, even
// when Presentation drops the first navigate and then bounces its own param back
// to where the preview still is. See src/lib/preview-navigation.ts for the host
// behaviour each rule answers.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NAV_MAX_ATTEMPTS,
  NAV_WINDOW_MS,
  startNav,
  stepNav,
  type PendingNav,
} from './preview-navigation.ts';

const T0 = 1_000_000;
const click = (now = T0): PendingNav =>
  startNav('/preview/about', 'aboutPage', 'aboutPage', '/preview', now);

test('a fresh click is armed, once, from where the preview was', () => {
  const p = click();
  assert.equal(p.href, '/preview/about');
  assert.equal(p.from, '/preview');
  assert.equal(p.attempts, 1);
  assert.equal(p.sawTarget, false);
});

test('the studio still showing the old page is not a bounce, it is waiting', () => {
  const step = stepNav(click(), '/preview', T0 + 50);
  assert.equal(step.action, 'wait');
  assert.equal(step.pending?.sawTarget, false);
});

test('params matching the target does NOT clear the intent (the old bug)', () => {
  const step = stepNav(click(), '/preview/about', T0 + 20);
  assert.equal(step.action, 'wait');
  assert.equal(step.pending?.sawTarget, true, 'the match is remembered, not acted on');
});

test('a match then a flip back to the old path re-issues the navigate', () => {
  const seen = stepNav(click(), '/preview/about', T0 + 20).pending!;
  const bounced = stepNav(seen, '/preview', T0 + 120);
  assert.equal(bounced.action, 'retry');
  assert.equal(bounced.pending?.href, '/preview/about');
  assert.equal(bounced.pending?.attempts, 2);
  assert.equal(bounced.pending?.sawTarget, false, 'the next match has to be seen again');
  assert.equal(bounced.pending?.startedAt, T0 + 120, 'the retry gets its own window');
});

test('a settled match with nothing changing returns the same object', () => {
  const seen = stepNav(click(), '/preview/about', T0 + 20).pending!;
  const again = stepNav(seen, '/preview/about', T0 + 60);
  assert.equal(again.action, 'wait');
  assert.equal(again.pending, seen, 'identity, so the effect cannot loop on itself');
});

test('retries are capped, and the intent is dropped rather than looping', () => {
  let pending: PendingNav | null = click();
  let retries = 0;
  for (let i = 0; i < 20 && pending; i += 1) {
    pending = stepNav(pending, '/preview/about', T0 + i * 10).pending;
    if (!pending) break;
    const bounced = stepNav(pending, '/preview', T0 + i * 10 + 5);
    if (bounced.action === 'retry') retries += 1;
    pending = bounced.pending;
  }
  assert.equal(retries, NAV_MAX_ATTEMPTS - 1, 'the first attempt was the click itself');
  assert.equal(pending, null);
});

test('a click that simply worked settles once its window closes', () => {
  const seen = stepNav(click(), '/preview/about', T0 + 20).pending!;
  const late = stepNav(seen, '/preview/about', T0 + NAV_WINDOW_MS);
  assert.equal(late.action, 'settle');
  assert.equal(late.pending, null);
});

test('a click that never reflects at all gives up when the window closes', () => {
  const step = stepNav(click(), '/preview', T0 + NAV_WINDOW_MS + 1);
  assert.equal(step.action, 'settle');
  assert.equal(step.pending, null);
});

test('the preview going somewhere else entirely drops the intent', () => {
  const step = stepNav(click(), '/preview/faculty', T0 + 30);
  assert.equal(step.action, 'settle');
  assert.equal(step.pending, null);
});

test('one click end to end: dropped navigate, bounce, automatic second attempt', () => {
  // Exactly Nathan's repro, as a sequence of what params.preview reported.
  const timeline: string[] = ['/preview', '/preview/about', '/preview', '/preview/about'];
  let pending: PendingNav | null = click();
  const issued: string[] = [];
  timeline.forEach((current, i) => {
    if (!pending) return;
    const step = stepNav(pending, current, T0 + (i + 1) * 100);
    if (step.action === 'retry' && step.pending) issued.push(step.pending.href);
    pending = step.pending;
  });
  assert.deepEqual(issued, ['/preview/about'], 'exactly one automatic re-issue');
  assert.equal(pending?.sawTarget, true, 'still armed, now on the target');
});

// -----------------------------------------------------------------------------
// The SECOND click, made before the first had landed (2026-08-29)
// -----------------------------------------------------------------------------
// Reproduced in a deployed Studio: click one page, click another about a second
// later, and the second click did nothing. Presentation ignores a navigate()
// issued while it is still moving, so the first click's destination arrives
// afterwards — neither the second intent's target nor where it started — and the
// last branch used to call that "the editor moved on" and drop the click.

/** Click /preview/about, then /preview/faq before about had arrived. */
const secondClick = (now = T0): PendingNav =>
  startNav('/preview/faq', 'page', 'page-faq', '/preview', now, '/preview/about');

test('the superseded destination is remembered, and only when it is distinct', () => {
  assert.equal(secondClick().superseded, '/preview/about');
  // Re-clicking the page already in flight supersedes nothing.
  assert.equal(
    startNav('/preview/about', 'page', 'p', '/preview', T0, '/preview/about').superseded,
    undefined,
  );
  // A predecessor heading back where we started is already the bounce target.
  assert.equal(
    startNav('/preview/faq', 'page', 'p', '/preview', T0, '/preview').superseded,
    undefined,
  );
});

test('the predecessor landing re-issues the dropped click instead of losing it', () => {
  const step = stepNav(secondClick(), '/preview/about', T0 + 400);
  assert.equal(step.action, 'retry', 'the second click must be asked for again');
  assert.equal(step.pending?.href, '/preview/faq');
  assert.equal(step.pending?.attempts, 2);
  assert.equal(step.pending?.from, '/preview/about', 'the bounce target is where we now are');
  assert.equal(step.pending?.superseded, undefined, 'consumed; it cannot land twice');
});

test('a page the editor navigated to themselves is still left alone', () => {
  // Same intent, but the preview went somewhere neither click asked for — a
  // link clicked inside the iframe. Dropping the intent is correct here.
  const step = stepNav(secondClick(), '/preview/enroll', T0 + 400);
  assert.equal(step.action, 'settle');
  assert.equal(step.pending, null);
});

test('a genuine return to the superseded page is not yanked away', () => {
  // The predecessor landed and was consumed; going back there later is the
  // editor's own doing, so the intent drops rather than fighting them.
  const retried = stepNav(secondClick(), '/preview/about', T0 + 400).pending!;
  const step = stepNav({ ...retried, from: '/preview/faq' }, '/preview/about', T0 + 800);
  assert.equal(step.action, 'settle');
  assert.equal(step.pending, null);
});

test('the re-issued click still respects the window and the attempt cap', () => {
  const late = stepNav(secondClick(), '/preview/about', T0 + NAV_WINDOW_MS + 1);
  assert.equal(late.action, 'settle', 'too late to be the editor s intent any more');

  const maxed = stepNav(
    { ...secondClick(), attempts: NAV_MAX_ATTEMPTS },
    '/preview/about',
    T0 + 400,
  );
  assert.equal(maxed.action, 'settle');
});

test('two clicks end to end: the second one wins', () => {
  // What params.preview reports: the first click lands, then the re-issued
  // second click lands.
  let pending: PendingNav | null = secondClick();
  const issued: string[] = [];
  ['/preview', '/preview/about', '/preview/faq'].forEach((current, i) => {
    if (!pending) return;
    const step = stepNav(pending, current, T0 + (i + 1) * 200);
    if (step.action === 'retry' && step.pending) issued.push(step.pending.href);
    pending = step.pending;
  });
  assert.deepEqual(issued, ['/preview/faq'], 'the swallowed click was re-issued exactly once');
  assert.equal(pending?.sawTarget, true, 'and it arrived');
});

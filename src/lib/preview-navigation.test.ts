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

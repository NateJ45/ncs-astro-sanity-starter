// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { counterLabel, stepIndex, swipeStep, trapStep, viewerSources } from './lightbox.ts';

describe('stepIndex', () => {
  it('steps forward and back, wrapping at both ends', () => {
    assert.equal(stepIndex(0, 1, 3), 1);
    assert.equal(stepIndex(2, 1, 3), 0);
    assert.equal(stepIndex(0, -1, 3), 2);
    assert.equal(stepIndex(1, -1, 3), 0);
  });
  it('is safe on one photo and on none', () => {
    assert.equal(stepIndex(0, 1, 1), 0);
    assert.equal(stepIndex(0, -1, 1), 0);
    assert.equal(stepIndex(4, 1, 0), 0);
  });
});

describe('swipeStep', () => {
  it('a long leftward drag is next, a rightward one is previous', () => {
    assert.equal(swipeStep(-80, 5), 1);
    assert.equal(swipeStep(80, -5), -1);
  });
  it('a short or mostly vertical drag is not a swipe', () => {
    assert.equal(swipeStep(-20, 0), 0);
    assert.equal(swipeStep(-60, 70), 0);
    assert.equal(swipeStep(0, 0), 0);
  });
});

describe('counterLabel', () => {
  it('says where you are, and nothing for a single photo', () => {
    assert.equal(counterLabel(2, 8), '3 of 8');
    assert.equal(counterLabel(0, 1), '');
  });
});

describe('trapStep (the focus trap)', () => {
  it('wraps Tab and Shift+Tab around the controls', () => {
    assert.equal(trapStep(0, 3, false), 1);
    assert.equal(trapStep(2, 3, false), 0);
    assert.equal(trapStep(0, 3, true), 2);
  });
  it('enters from outside the controls at the right end', () => {
    assert.equal(trapStep(-1, 3, false), 0);
    assert.equal(trapStep(-1, 3, true), 2);
    assert.equal(trapStep(-1, 0, false), -1);
  });
});

describe('viewerSources', () => {
  const build = (w: number) => `https://cdn.example/photo.jpg?w=${w}&fit=max`;
  it('builds the ladder and links the JS-off view to a 2000-wide photo', () => {
    const s = viewerSources(build, 4000);
    assert.equal(s.href, build(2000));
    assert.match(s.srcset, /w=800&fit=max 800w/);
    assert.match(s.srcset, /w=2400&fit=max 2400w$/);
  });
  it('never asks for more than the photo has', () => {
    const s = viewerSources(build, 1300);
    assert.equal(s.href, build(1200));
    assert.doesNotMatch(s.srcset, /1600w/);
  });
  it('still gives one size for a very small photo', () => {
    const s = viewerSources(build, 500);
    assert.equal(s.srcset, `${build(500)} 500w`);
    assert.equal(s.href, build(500));
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LADDER_STEPS, buildLadder, smallestRenderedWidth } from './imageLadder.ts';

// The ladder before the small steps were added. Larger slots must keep picking
// from exactly these.
const OLD_STEPS = [400, 600, 700, 800, 900, 1200, 1600, 2400];

// What a browser does with a srcset: the smallest candidate at least as wide as
// the slot times the device pixel ratio, else the largest.
function pick(ladder: number[], cssWidth: number, dpr: number): number {
  const need = cssWidth * dpr;
  return ladder.find((w) => w >= need) ?? ladder[ladder.length - 1];
}

function oldLadder(width: number): number[] {
  const w = OLD_STEPS.filter((s) => s <= width);
  if (w[w.length - 1] !== width) w.push(width);
  return w;
}

test('the ladder keeps every original step and adds 160, 240 and 320', () => {
  assert.deepEqual(
    LADDER_STEPS.filter((s) => s >= 400),
    OLD_STEPS,
  );
  assert.deepEqual(
    LADDER_STEPS.filter((s) => s < 400),
    [160, 240, 320],
  );
  assert.deepEqual(
    [...LADDER_STEPS].sort((a, b) => a - b),
    LADDER_STEPS,
  );
});

test('is capped at the requested width, which is always the last candidate', () => {
  assert.deepEqual(buildLadder(1000), [160, 240, 320, 400, 600, 700, 800, 900, 1000]);
  assert.deepEqual(buildLadder(1200), [160, 240, 320, 400, 600, 700, 800, 900, 1200]);
  assert.deepEqual(buildLadder(3000).slice(-2), [2400, 3000]);
  assert.deepEqual(buildLadder(200), [160, 200]);
  assert.deepEqual(buildLadder(100), [100]);
  assert.deepEqual(buildLadder(400), [160, 240, 320, 400]);
});

test('a slot that needs 400px or more picks the same candidate as the old ladder', () => {
  for (const width of [400, 640, 900, 1000, 1200, 1800, 2400, 3000]) {
    for (const css of [400, 450, 600, 700, 900, 1200, 1600]) {
      for (const dpr of [1, 1.5, 1.875, 2, 3]) {
        if (css * dpr < 400 || css * dpr > width) continue;
        assert.equal(
          pick(buildLadder(width), css, dpr),
          pick(oldLadder(width), css, dpr),
          `width ${width}, slot ${css}px at DPR ${dpr}`,
        );
      }
    }
  }
});

test('a 112px thumbnail now picks 160w instead of 400w', () => {
  assert.equal(pick(oldLadder(800), 112, 1), 400);
  assert.equal(pick(buildLadder(800), 112, 1), 160);
  assert.equal(pick(buildLadder(800), 112, 2), 240);
  assert.equal(pick(buildLadder(800), 112, 3), 400);
  assert.equal(pick(buildLadder(800), 300, 1), 320);
});

test('smallestRenderedWidth reads px and vw lengths', () => {
  assert.equal(smallestRenderedWidth('112px'), 112);
  assert.equal(smallestRenderedWidth('100vw'), 320);
  assert.equal(smallestRenderedWidth('7rem'), 112);
  assert.equal(
    smallestRenderedWidth('(min-width: 1024px) 360px, (min-width: 640px) 45vw, 7rem'),
    112,
  );
  assert.equal(smallestRenderedWidth('(max-width: 600px) 100vw, 600px'), 320);
  assert.equal(smallestRenderedWidth('(min-width: 768px) 45vw, 100vw'), 320);
  assert.equal(
    smallestRenderedWidth('(min-width: 1024px) 40vw, (min-width: 768px) 80vw, 100vw'),
    320,
  );
  assert.equal(smallestRenderedWidth('(min-width: 768px) 45vw'), 345.6);
  assert.equal(smallestRenderedWidth('(max-width: 639px) 112px, 160px'), 112);
  assert.equal(smallestRenderedWidth('(min-width: 920px) 896px, 100vw'), 320);
});

test('smallestRenderedWidth gives up (null) on anything it cannot read', () => {
  assert.equal(smallestRenderedWidth(undefined), null);
  assert.equal(smallestRenderedWidth(null), null);
  assert.equal(smallestRenderedWidth(''), null);
  assert.equal(smallestRenderedWidth('calc(100vw - 32px)'), null);
  assert.equal(smallestRenderedWidth('(min-width: 768px) calc(50vw - 24px), 100vw'), null);
  assert.equal(smallestRenderedWidth('clamp(120px, 20vw, 240px)'), null);
  assert.equal(smallestRenderedWidth('50%'), null);
  assert.equal(smallestRenderedWidth('banana'), null);
  assert.equal(smallestRenderedWidth('0px'), null);
});

test('sizes drops steps well below the smallest slot, never the last one', () => {
  // A 600px slot: 160 and 240 are dead weight, 400 is 2/3 of the slot and stays as slack.
  assert.deepEqual(buildLadder(1200, '600px'), [600, 700, 800, 900, 1200]);
  // A 112px slot keeps everything: 160 is the one it will pick.
  assert.deepEqual(buildLadder(800, '112px'), [160, 240, 320, 400, 600, 700, 800]);
  // A 250px slot: 160 is under 75% of 250, so it goes; 240 stays.
  assert.deepEqual(buildLadder(800, '250px'), [240, 320, 400, 600, 700, 800]);
  // Full-width on a phone (100vw at 320) drops only 160.
  assert.deepEqual(buildLadder(1600, '100vw'), [240, 320, 400, 600, 700, 800, 900, 1200, 1600]);
  // Slot larger than the requested width: the width itself survives.
  assert.deepEqual(buildLadder(300, '1000px'), [300]);
});

test('unreadable sizes leave the full ladder alone', () => {
  assert.deepEqual(buildLadder(800, 'calc(100vw - 2rem)'), buildLadder(800));
  assert.deepEqual(buildLadder(800, undefined), buildLadder(800));
});

test('a sizes-filtered ladder still serves every slot the same file as the full ladder', () => {
  const sizes = '(min-width: 768px) 45vw, 100vw';
  for (const css of [320, 345.6, 400, 576, 800, 1200]) {
    for (const dpr of [1, 2, 3]) {
      assert.equal(pick(buildLadder(1600, sizes), css, dpr), pick(buildLadder(1600), css, dpr));
    }
  }
});

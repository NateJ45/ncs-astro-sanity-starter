// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Custom code (src/lib/custom-code.ts, PORTS.md card 121): the srcdoc builder,
// the parent's message check and height clamp, the Studio warning, and what
// the Checkup rules look for. The browser half (the sandbox really blocks the
// site's storage and DOM) is tests/custom-code.spec.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAME_MAX_HEIGHT,
  FRAME_MESSAGE_TYPE,
  FRAME_MIN_HEIGHT,
  FRAME_SANDBOX,
  RESIZE_SCRIPT,
  absolutizeCssUrls,
  buildFrameDocument,
  clampFrameHeight,
  codeWarningMessage,
  codeWarnings,
  cssValue,
  frameBaseCss,
  isFrameHeightMessage,
  isSiteCodeRoute,
  onPageCodePaths,
  safeStyleText,
  siteCodeFieldsInUse,
} from './custom-code.ts';

describe('the sandbox', () => {
  it('runs scripts but never shares the site origin or steers the top window', () => {
    const tokens = FRAME_SANDBOX.split(' ');
    assert.ok(tokens.includes('allow-scripts'));
    assert.ok(tokens.includes('allow-forms'));
    assert.ok(tokens.includes('allow-popups-to-escape-sandbox'));
    assert.ok(!tokens.includes('allow-same-origin'));
    assert.ok(!tokens.some((t) => t.startsWith('allow-top-navigation')));
  });
});

describe('buildFrameDocument', () => {
  const theme = {
    background: '#FBFBFA',
    foreground: '#2A2D31',
    link: '#434E5C',
    fontBody: '"Inter Variable", system-ui, sans-serif',
    fontDisplay: '"Libre Baskerville", Georgia, serif',
    radius: '0.5rem',
  };

  it('puts the pasted code in the body byte for byte', () => {
    const code = `<p class="a" data-x='1'>Tom & Jerry "quoted" &amp; <b>bold</b></p>\n<script>if (1 < 2) document.body.dataset.ok = "</div>";</script>`;
    const doc = buildFrameDocument(code, theme);
    assert.ok(doc.includes(`<body>\n${code}\n</body>`));
  });

  it('is a whole document with a new-tab base and the resize script in the head', () => {
    const doc = buildFrameDocument('<p>hi</p>', theme);
    assert.match(doc, /^<!doctype html>/);
    const head = doc.slice(0, doc.indexOf('</head>'));
    assert.ok(head.includes('<base target="_blank">'));
    assert.ok(!/<base[^>]*href/.test(head), 'no href: the base URL stays the parent page');
    assert.ok(head.includes(RESIZE_SCRIPT));
    assert.ok(head.indexOf('data-frame="base"') < head.indexOf('data-frame="resize"'));
  });

  it('carries the site fonts and light colours, and honours reduced motion', () => {
    const doc = buildFrameDocument('', theme);
    assert.ok(doc.includes('--background: #FBFBFA;'));
    assert.ok(doc.includes('--foreground: #2A2D31;'));
    assert.ok(doc.includes('--font-body: "Inter Variable", system-ui, sans-serif;'));
    assert.ok(doc.includes('--font-display: "Libre Baskerville", Georgia, serif;'));
    assert.ok(doc.includes('color-scheme: light'));
    assert.match(doc, /@media \(prefers-reduced-motion: reduce\)/);
  });

  it('loads the font files by absolute URL', () => {
    const fontCss =
      "@font-face{font-family:'Inter Variable';src:url(/_astro/inter-latin-wght-normal.abc.woff2) format('woff2')}" +
      '@font-face{font-family:X;src:url("/_astro/x.woff2")}';
    const doc = buildFrameDocument('', {
      ...theme,
      fontCss,
      assetOrigin: 'https://church.example/',
    });
    assert.ok(doc.includes('url(https://church.example/_astro/inter-latin-wght-normal.abc.woff2)'));
    assert.ok(doc.includes('url("https://church.example/_astro/x.woff2")'));
    assert.ok(!doc.includes('url(/_astro'));
  });

  it('cannot be broken out of by a stylesheet or a config value', () => {
    assert.equal(safeStyleText('a{}</style><script>x</script>'), 'a{}<\\/style><script>x</script>');
    const doc = buildFrameDocument('', {
      fontCss: '@font-face{}</STYLE><img src=x onerror=alert(1)>',
      background: 'red;}</style><script>alert(1)</script>{',
    });
    const head = doc.slice(0, doc.indexOf('</head>'));
    assert.equal((head.match(/<\/style>/gi) ?? []).length, 2, 'only our two style elements close');
    assert.ok(!head.includes('<script>alert'));
    assert.equal(cssValue('  ', '#fff'), '#fff');
    assert.equal(cssValue('#000;} body{x', '#fff'), '#000 bodyx');
  });

  it('leaves protocol-relative and absolute font URLs alone', () => {
    const css = 'url(//cdn.example/a.woff2) url(https://x/b.woff2) url(data:font/woff2;base64,AA)';
    assert.equal(absolutizeCssUrls(css, 'https://site'), css);
    assert.equal(absolutizeCssUrls('url(/a)', undefined), 'url(/a)');
  });

  it('has quiet defaults when there is no theme', () => {
    const css = frameBaseCss();
    assert.ok(css.includes('--background: #ffffff;'));
    assert.ok(css.includes('--font-body: system-ui'));
  });
});

describe('the resize script', () => {
  it('posts only the known message type and a number', () => {
    assert.ok(RESIZE_SCRIPT.includes(JSON.stringify(FRAME_MESSAGE_TYPE)));
    assert.ok(RESIZE_SCRIPT.includes('parent.postMessage({ type:'));
    assert.ok(
      !/addEventListener\(\s*['"]message/.test(RESIZE_SCRIPT),
      'the frame listens to nothing',
    );
  });
});

describe('isFrameHeightMessage', () => {
  it('accepts exactly { type, height } with a finite number', () => {
    assert.ok(isFrameHeightMessage({ type: FRAME_MESSAGE_TYPE, height: 320 }));
    assert.ok(isFrameHeightMessage({ height: 0, type: FRAME_MESSAGE_TYPE }));
  });

  it('rejects anything else', () => {
    for (const bad of [
      null,
      undefined,
      'ncs-custom-code-height',
      320,
      [],
      { type: FRAME_MESSAGE_TYPE },
      { type: FRAME_MESSAGE_TYPE, height: '320' },
      { type: FRAME_MESSAGE_TYPE, height: Number.NaN },
      { type: FRAME_MESSAGE_TYPE, height: Number.POSITIVE_INFINITY },
      { type: 'something-else', height: 320 },
      { type: FRAME_MESSAGE_TYPE, height: 320, href: 'https://evil.example' },
    ]) {
      assert.equal(isFrameHeightMessage(bad), false, JSON.stringify(bad));
    }
  });
});

describe('clampFrameHeight', () => {
  it('rounds up and keeps the height inside the range', () => {
    assert.equal(clampFrameHeight(320.2), 321);
    assert.equal(clampFrameHeight(-50), FRAME_MIN_HEIGHT);
    assert.equal(clampFrameHeight(1e9), FRAME_MAX_HEIGHT);
    assert.equal(clampFrameHeight(Number.NaN), FRAME_MIN_HEIGHT);
    assert.equal(clampFrameHeight(10, 100, 200), 100);
  });
});

describe('codeWarnings', () => {
  it('names each reaching-out pattern once, in order', () => {
    const code =
      'var c = document.cookie; localStorage.setItem("a", 1); top.location = "x"; parent.postMessage(1); window.parent.document';
    assert.deepEqual(codeWarnings(code), [
      'document.cookie',
      'localStorage',
      'top.location',
      'parent.',
    ]);
  });

  it('stays quiet on ordinary widget code', () => {
    const code =
      '<div class="parent-box"><span id="days"></span></div><script>const d = new Date("2027-06-14"); document.getElementById("days").textContent = Math.ceil((d - Date.now()) / 864e5);</script>';
    assert.deepEqual(codeWarnings(code), []);
    assert.deepEqual(codeWarnings(undefined), []);
    assert.equal(codeWarningMessage(code, false), true);
  });

  it('words the warning for the box and for the page', () => {
    const boxed = codeWarningMessage('localStorage.x', false);
    const onPage = codeWarningMessage('localStorage.x', true);
    assert.equal(typeof boxed, 'string');
    assert.match(String(boxed), /blocked/);
    assert.match(String(onPage), /trust/);
    assert.ok(!/—/.test(String(boxed) + String(onPage)), 'no em-dashes');
  });
});

describe('isSiteCodeRoute', () => {
  it('keeps site-wide code off the Studio, the preview and the API', () => {
    for (const p of [
      '/studio',
      '/studio/',
      '/studio/structure/page',
      '/preview/about',
      '/api/draft-mode/enable',
    ]) {
      assert.equal(isSiteCodeRoute(p), false, p);
    }
    for (const p of [
      '/',
      '/about/',
      '/studios-and-rooms/',
      '/previews/',
      '/styleguide/sections/',
    ]) {
      assert.equal(isSiteCodeRoute(p), true, p);
    }
  });
});

describe('what the Checkup looks for', () => {
  it('finds embed blocks switched to run on the page, with their paths', () => {
    const doc = {
      sections: [
        { _key: 'a', _type: 'embedSection', embedCode: '<p>x</p>', runsOnPage: true },
        { _key: 'b', _type: 'embedSection', embedCode: '<p>y</p>', runsOnPage: false },
        { _key: 'c', _type: 'embedSection', embedCode: '   ', runsOnPage: true },
        {
          _key: 'd',
          _type: 'embedSection',
          embedUrl: 'https://x',
          embedCode: '<p>z</p>',
          runsOnPage: true,
        },
      ],
    };
    assert.deepEqual(onPageCodePaths(doc), [['sections', '[_key=="a"]']]);
  });

  it('lists the site-wide code fields that hold something', () => {
    assert.deepEqual(siteCodeFieldsInUse({ headCode: '<meta>', bodyEndCode: '  ' }), ['headCode']);
    assert.deepEqual(siteCodeFieldsInUse({}), []);
  });
});

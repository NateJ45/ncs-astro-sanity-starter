// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Tests for the paste-and-go embed registry (src/lib/embed-providers.ts, PORTS.md card 172).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMBED_PROVIDERS,
  cspOriginsFor,
  describePlan,
  planEmbed,
  plansOwnSize,
  providerById,
  providerForScript,
  providerForUrl,
  readCode,
  readPaste,
  type EmbedPlan,
} from './embed-providers.ts';

const frame = (plan: EmbedPlan) => {
  assert.equal(plan.kind, 'frame', JSON.stringify(plan));
  return plan as Extract<EmbedPlan, { kind: 'frame' }>;
};

describe('the registry', () => {
  it('has every provider the registry promises, with unique ids', () => {
    const names = EMBED_PROVIDERS.map((p) => p.name);
    for (const want of [
      'YouTube',
      'Vimeo',
      'Facebook',
      'Google Maps',
      'Google Calendar',
      'Google Forms',
      'Spotify',
      'Apple Podcasts',
      'Church Trac',
      'Planning Center',
      'Tithe.ly',
      'Givelify',
      'Subsplash',
      'SignUpGenius',
      'Calendly',
    ]) {
      assert.ok(names.includes(want), `missing ${want}`);
    }
    const ids = EMBED_PROVIDERS.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.equal(providerById(id)?.id, id);
  });

  it('gives every provider a way to be sized', () => {
    for (const p of EMBED_PROVIDERS) {
      assert.ok(p.frame || p.size, `${p.name} has neither a frame() nor a size`);
    }
  });

  it('matches hosts by domain, not by substring', () => {
    assert.equal(providerForUrl('https://www.youtube.com/watch?v=abcdefghijk')?.id, 'youtube');
    assert.equal(providerForUrl('https://notyoutube.com/watch?v=abcdefghijk'), undefined);
    assert.equal(providerForUrl('https://youtube.com.evil.example/x'), undefined);
    assert.equal(
      providerForUrl('https://www.google.com/maps/place/Main+Street'),
      providerById('google-maps'),
    );
    assert.equal(providerForUrl('https://www.google.com/search?q=x'), undefined);
    assert.equal(providerForUrl('https://example.churchtrac.com/give')?.id, 'churchtrac');
  });

  it('knows script hosts', () => {
    assert.equal(providerForScript('https://tithe.ly/widget/v3/give.js?3')?.id, 'tithely');
    assert.equal(
      providerForScript('//assets.calendly.com/assets/external/widget.js')?.id,
      'calendly',
    );
    assert.equal(providerForScript('https://js.churchcenter.com/modal/v1')?.id, 'planning-center');
    assert.equal(providerForScript('https://cdn.example.com/x.js'), undefined);
  });
});

describe('links become the right frame', () => {
  it('YouTube watch, share, Shorts and live links all become the private player at 16:9', () => {
    for (const link of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ?si=abc',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share',
    ]) {
      const f = frame(planEmbed({ embedUrl: link }));
      assert.equal(f.src, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', link);
      assert.equal(f.aspect, '16 / 9');
    }
    assert.match(
      frame(planEmbed({ embedUrl: 'https://youtu.be/dQw4w9WgXcQ?t=90' })).src,
      /start=90$/,
    );
    assert.match(
      frame(planEmbed({ embedUrl: 'https://www.youtube.com/playlist?list=PL123abc' })).src,
      /videoseries\?list=PL123abc$/,
    );
    assert.equal(
      planEmbed({ embedUrl: 'https://www.youtube.com/@examplechannel' }).kind,
      'problem',
    );
  });

  it('Vimeo keeps the private hash of an unlisted video', () => {
    assert.equal(
      frame(planEmbed({ embedUrl: 'https://vimeo.com/123456789/abc123def' })).src,
      'https://player.vimeo.com/video/123456789?h=abc123def',
    );
    assert.equal(
      frame(planEmbed({ embedUrl: 'https://vimeo.com/123456789' })).src,
      'https://player.vimeo.com/video/123456789',
    );
  });

  it('Facebook videos use the video plugin; a page itself is refused politely', () => {
    const f = frame(
      planEmbed({ embedUrl: 'https://www.facebook.com/examplepage/videos/1234567890/' }),
    );
    assert.match(f.src, /^https:\/\/www\.facebook\.com\/plugins\/video\.php\?href=https%3A%2F%2F/);
    const p = planEmbed({ embedUrl: 'https://www.facebook.com/examplepage' });
    assert.equal(p.kind, 'problem');
  });

  it('Google Maps: embed links as they are, place links converted, share links explained', () => {
    const embed = 'https://www.google.com/maps/embed?pb=!1m18!1m12';
    assert.equal(frame(planEmbed({ embedUrl: embed })).src, embed);
    assert.equal(frame(planEmbed({ embedUrl: embed })).height, 450);
    assert.equal(
      frame(
        planEmbed({
          embedUrl: 'https://www.google.com/maps/place/Riverside+Bakery/@39.3,-84.5,17z',
        }),
      ).src,
      'https://www.google.com/maps?q=Riverside%20Bakery&output=embed',
    );
    const share = planEmbed({ embedUrl: 'https://maps.app.goo.gl/AbCdEf' });
    assert.equal(share.kind, 'problem');
    assert.match(describePlan(share), /Embed a map/);
  });

  it('Google Calendar decodes the share link to an embed', () => {
    const cid = btoa('events@example.org');
    assert.equal(
      frame(planEmbed({ embedUrl: `https://calendar.google.com/calendar/u/0?cid=${cid}` })).src,
      'https://calendar.google.com/calendar/embed?src=events%40example.org',
    );
  });

  it('Google Forms asks for the embedded form, and refuses the edit link', () => {
    assert.equal(
      frame(
        planEmbed({
          embedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSabc/viewform?usp=sf_link',
        }),
      ).src,
      'https://docs.google.com/forms/d/e/1FAIpQLSabc/viewform?embedded=true',
    );
    assert.equal(
      planEmbed({ embedUrl: 'https://docs.google.com/forms/d/1abcXYZ/edit' }).kind,
      'problem',
    );
  });

  it('Spotify and Apple Podcasts get their players and heights', () => {
    const ep = frame(
      planEmbed({ embedUrl: 'https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk?si=x' }),
    );
    assert.equal(ep.src, 'https://open.spotify.com/embed/episode/4rOoJ6Egrf8K2IrywzwOMk');
    assert.equal(ep.height, 152);
    assert.equal(frame(planEmbed({ embedUrl: 'https://open.spotify.com/show/abc' })).height, 352);
    const ap = frame(
      planEmbed({ embedUrl: 'https://podcasts.apple.com/us/podcast/sermons/id123?i=456' }),
    );
    assert.equal(ap.src, 'https://embed.podcasts.apple.com/us/podcast/sermons/id123?i=456');
    assert.equal(ap.height, 175);
  });

  it('giving, sign-up and booking services frame as they are, at a tall fixed height', () => {
    for (const link of [
      'https://example.churchtrac.com/give',
      'https://example.churchcenter.com/registrations',
      'https://tithe.ly/give?c=123',
      'https://www.givelify.com/donate/abc',
      'https://subsplash.com/u/-ABC/media',
      'https://www.signupgenius.com/go/10C0F4',
      'https://calendly.com/example/visit',
    ]) {
      const f = frame(planEmbed({ embedUrl: link }));
      assert.equal(f.src, new URL(link).href, link);
      assert.ok(f.height && f.height >= 700, link);
      assert.ok(plansOwnSize(f));
    }
  });

  it('an unknown service is still framed, with no size of its own', () => {
    const f = frame(planEmbed({ embedUrl: 'https://example.org/widget' }));
    assert.equal(f.provider, undefined);
    assert.equal(plansOwnSize(f), false);
    assert.match(describePlan(f), /sandboxed frame/);
  });
});

describe('pasted code', () => {
  it('reduces a lone iframe to its link, so it is framed with the provider shape', () => {
    const code =
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=x&amp;start=5" title="YouTube video player" frameborder="0" allowfullscreen></iframe>';
    const f = frame(planEmbed({ embedCode: code }));
    assert.equal(f.provider?.id, 'youtube');
    const pasted = readPaste(code);
    assert.equal(pasted?.embedUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=x&start=5');
    assert.equal(pasted?.embedCode, undefined);
    assert.equal(pasted?.runsOnPage, false);
  });

  it('a Google Maps embed code (an iframe in a div) is framed', () => {
    const code =
      '<div class="map"><iframe src="https://www.google.com/maps/embed?pb=!1m18" width="600" height="450" style="border:0;" loading="lazy"></iframe></div>';
    assert.equal(readCode(code).loneIframeSrc, 'https://www.google.com/maps/embed?pb=!1m18');
    assert.equal(frame(planEmbed({ embedCode: code })).height, 450);
  });

  it('a known giving widget is switched to run on the page and allowed there', () => {
    const code =
      '<button class="tithely-give-btn" data-church-id="123">Give</button>\n<script src="https://tithe.ly/widget/v3/give.js?3"></script>\n<script>var tw = create_tithely_widget();</script>';
    const pasted = readPaste(code);
    assert.equal(pasted?.runsOnPage, true);
    assert.equal(pasted?.embedCode, code);
    const plan = planEmbed({ embedCode: code, runsOnPage: true });
    assert.equal(plan.kind, 'page');
    assert.deepEqual(cspOriginsFor(plan), [
      'https://tithe.ly',
      'https://*.tithe.ly',
      'https://tithely.com',
      'https://*.tithely.com',
    ]);
    assert.match(describePlan(plan), /Tithe\.ly/);
  });

  it('known code with the switch off stays in its box, and still names its origins', () => {
    const code = '<script src="https://assets.calendly.com/assets/external/widget.js"></script>';
    const plan = planEmbed({ embedCode: code, runsOnPage: false });
    assert.equal(plan.kind, 'box');
    assert.ok(cspOriginsFor(plan).includes('https://*.calendly.com'));
  });

  it('BLOCKS unknown script code from running on the page, even with the switch on', () => {
    const code = '<div id="x"></div><script src="https://cdn.unknown.example/w.js"></script>';
    const plan = planEmbed({ embedCode: code, runsOnPage: true });
    assert.deepEqual(plan, { kind: 'box', provider: undefined, blocked: true });
    assert.match(describePlan(plan), /ask your web designer to approve it/);
    assert.match(describePlan(plan, { approver: 'Sam' }), /ask Sam to approve it/);
    assert.deepEqual(cspOriginsFor(plan), []);
    assert.equal(readPaste(code)?.runsOnPage, false);
  });

  it('blocks inline-only scripts and inline handlers on the page', () => {
    assert.equal(
      planEmbed({ embedCode: '<script>alert(1)</script>', runsOnPage: true }).kind,
      'box',
    );
    assert.equal(
      planEmbed({ embedCode: '<img src="x" onerror="alert(1)">', runsOnPage: true }).kind,
      'box',
    );
    // Mixing a known script with an unknown one is still unknown.
    assert.equal(
      planEmbed({
        embedCode:
          '<script src="https://tithe.ly/a.js"></script><script src="https://evil.example/b.js"></script>',
        runsOnPage: true,
      }).kind,
      'box',
    );
  });

  it('an origin the site approved may run on the page', () => {
    const code = '<script src="https://widget.example.com/w.js"></script>';
    assert.equal(
      planEmbed({ embedCode: code, runsOnPage: true }, ['https://widget.example.com']).kind,
      'page',
    );
    assert.equal(readPaste(code, ['https://widget.example.com'])?.runsOnPage, true);
  });

  it('plain HTML with no scripts may sit on the page', () => {
    assert.equal(planEmbed({ embedCode: '<p>Hello</p>', runsOnPage: true }).kind, 'page');
  });

  it('a pasted link goes in the address field', () => {
    const p = readPaste('  https://open.spotify.com/show/abc  ');
    assert.equal(p?.embedUrl, 'https://open.spotify.com/show/abc');
    assert.equal(p?.plan.kind, 'frame');
    assert.equal(readPaste('   '), null);
  });

  it('nothing pasted is nothing to show, and the empty sentence names the site examples', () => {
    assert.equal(planEmbed({}).kind, 'none');
    assert.match(describePlan({ kind: 'none' }), /YouTube, Google Maps, Spotify or Calendly\.$/);
    assert.match(describePlan({ kind: 'none' }, { examples: 'A or B' }), /such as A or B\.$/);
    assert.equal(planEmbed({ embedUrl: 'not a link' }).kind, 'problem');
  });
});

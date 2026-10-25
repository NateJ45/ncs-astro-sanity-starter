// Unit tests for the conversion-event snippet (PORTS.md card 89). Runs the exact
// text that EventTracking.astro inlines, in a node:vm sandbox with a tiny fake
// DOM, because a hostname-faked browser test would need a second build with a
// GA id baked in. The Playwright smoke test covers the "absent from a build with
// no PUBLIC_GA_ID" half.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const snippet = readFileSync(
  new URL('../components/analytics/event-tracking-snippet.js', import.meta.url),
  'utf8',
);

type Call = [string, string, Record<string, unknown>];
type Fake = {
  tagName: string;
  attrs: Record<string, string>;
  parent?: Fake;
  getAttribute(n: string): string | null;
  closest(sel: string): Fake | null;
};

function el(tagName: string, attrs: Record<string, string>, parent?: Fake): Fake {
  const self: Fake = {
    tagName,
    attrs,
    parent,
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    closest(sel) {
      for (let n: Fake | undefined = self; n; n = n.parent) {
        if (sel === 'a[href]' && n.tagName === 'A' && 'href' in n.attrs) return n;
        if (sel === '[data-track]' && 'data-track' in n.attrs) return n;
      }
      return null;
    },
  };
  return self;
}

function load(hostname: string, gaHosts: string[] | null, opts: { gtag?: boolean } = {}) {
  const calls: Call[] = [];
  const store = new Map<string, string>();
  let onClick: ((ev: { target: Fake | null }) => void) | undefined;
  const window: Record<string, unknown> = {};
  if (opts.gtag !== false)
    // JSON round-trip: objects built inside the vm are a different realm, and
    // deepStrictEqual compares prototypes.
    window.gtag = (...a: Call) => calls.push(JSON.parse(JSON.stringify(a)));
  const sandbox = {
    window,
    gaHosts,
    location: { hostname, pathname: '/contact' },
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    document: {
      addEventListener: (_: string, fn: typeof onClick) => {
        onClick = fn;
      },
    },
    Date,
    Number,
    Object,
    String,
  };
  vm.runInNewContext(`(function (gaHosts) {${snippet}})(gaHosts);`, sandbox);
  return { window, calls, click: (t: Fake | null) => onClick?.({ target: t }), store };
}

const HOSTS = ['example.com', 'www.example.com'];

test('tel: click sends click_to_call with link_url', () => {
  const t = load('example.com', HOSTS);
  const a = el('A', { href: 'tel:+15555550123' });
  t.click(el('SPAN', {}, a));
  assert.deepEqual(t.calls, [['event', 'click_to_call', { link_url: 'tel:+15555550123' }]]);
});

test('mailto: click sends click_email', () => {
  const t = load('www.example.com', HOSTS);
  t.click(el('A', { href: 'mailto:hi@example.com' }));
  assert.deepEqual(t.calls, [['event', 'click_email', { link_url: 'mailto:hi@example.com' }]]);
});

test('data-track on or above the target sends cta_click, with link_url for anchors', () => {
  const t = load('example.com', HOSTS);
  t.click(el('A', { href: '/contact', 'data-track': 'hero_primary' }));
  const wrapper = el('DIV', { 'data-track': 'pricing' });
  t.click(el('SPAN', {}, wrapper));
  assert.deepEqual(t.calls, [
    ['event', 'cta_click', { cta_name: 'hero_primary', link_url: '/contact' }],
    ['event', 'cta_click', { cta_name: 'pricing' }],
  ]);
});

test('a tel: link that is also tracked sends both events', () => {
  const t = load('example.com', HOSTS);
  t.click(el('A', { href: 'tel:123', 'data-track': 'call_cta' }));
  assert.deepEqual(
    t.calls.map((c) => c[1]),
    ['click_to_call', 'cta_click'],
  );
});

test('ordinary links and non-element targets send nothing and never throw', () => {
  const t = load('example.com', HOSTS);
  t.click(el('A', { href: '/about' }));
  t.click(null);
  assert.deepEqual(t.calls, []);
});

test('ncsTrackLead sends generate_lead and de-duplicates per form for 5 seconds', () => {
  const t = load('example.com', HOSTS);
  const lead = t.window.ncsTrackLead as (f: string, e?: object) => void;
  lead('contact');
  lead('contact');
  lead('newsletter');
  assert.deepEqual(t.calls, [
    ['event', 'generate_lead', { form_name: 'contact', form_location: '/contact' }],
    ['event', 'generate_lead', { form_name: 'newsletter', form_location: '/contact' }],
  ]);
  // Age the stored timestamp past the window: the same form may fire again.
  t.store.set('ncs_lead_contact', String(Date.now() - 6000));
  lead('contact');
  assert.equal(t.calls.length, 3);
});

test('extra params are merged but cannot override form_name or form_location', () => {
  const t = load('example.com', HOSTS);
  (t.window.ncsTrackLead as (f: string, e?: object) => void)('contact', {
    form_name: 'evil',
    service: 'kitchens',
  });
  assert.deepEqual(t.calls[0][2], {
    form_name: 'contact',
    form_location: '/contact',
    service: 'kitchens',
  });
});

test('off the production hostname nothing is installed', () => {
  const t = load('localhost', HOSTS);
  assert.equal(t.window.ncsTrackLead, undefined);
  t.click(el('A', { href: 'tel:123' }));
  assert.deepEqual(t.calls, []);
});

test('fails open when site is unset (gaHosts null), like the GA tag', () => {
  const t = load('anything.test', null);
  t.click(el('A', { href: 'tel:123' }));
  assert.equal(t.calls.length, 1);
});

test('without a gtag function it does nothing and does not throw', () => {
  const t = load('example.com', HOSTS, { gtag: false });
  t.click(el('A', { href: 'tel:123' }));
  (t.window.ncsTrackLead as (f: string) => void)('contact');
  assert.deepEqual(t.calls, []);
});

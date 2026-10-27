// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Tests for mergePageSwitches (src/lib/page-switches.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergePageSwitches } from './page-switches.ts';
import type { NavItem } from './siteSettings.ts';

const nav: NavItem[] = [
  { kind: 'flat', label: 'About', href: '/about/' },
  { kind: 'dropdown', label: 'Services', items: [{ label: 'Design', href: '/design/' }] },
];
const footer = [
  { title: 'Company', links: [{ label: 'About', href: '/about/' }] },
  { title: 'Help', links: [{ label: 'FAQ', href: '/faq/' }] },
];

test('a ticked page joins the end of the menu and the last footer column', () => {
  const out = mergePageSwitches(nav, footer, [
    { title: 'Pricing', slug: 'pricing', addToMainNav: true, addToFooter: true },
  ]);
  assert.deepEqual(out.nav.at(-1), { kind: 'flat', label: 'Pricing', href: '/pricing/' });
  assert.deepEqual(out.footer[1].links.at(-1), { label: 'Pricing', href: '/pricing/' });
  assert.equal(out.footer[0].links.length, 1, 'other columns are untouched');
});

test('the menu label wins over the title, and nothing is listed twice', () => {
  const out = mergePageSwitches(nav, footer, [
    { title: 'A long page title', slug: 'vip', navLabel: 'VIP', addToMainNav: true },
    { title: 'About us', slug: 'about', addToMainNav: true, addToFooter: true },
    { title: 'Design', slug: 'design', addToMainNav: true },
  ]);
  assert.deepEqual(
    out.nav.map((i) => i.label),
    ['About', 'Services', 'VIP'],
  );
  assert.equal(out.footer[0].links.length, 1, 'About is already in the footer');
});

test('"under Services" lands in that dropdown when the menu has one', () => {
  const out = mergePageSwitches(nav, footer, [
    { title: 'Audits', slug: 'audits', addToMainNav: true, navGroup: 'services' },
    { title: 'Guides', slug: 'guides', addToMainNav: true, navGroup: 'resources' },
  ]);
  const services = out.nav.find((i) => i.label === 'Services');
  assert.equal(services?.kind === 'dropdown' && services.items.at(-1)?.href, '/audits/');
  // No Resources dropdown in this menu: the page gets its own item instead of vanishing.
  assert.deepEqual(out.nav.at(-1), { kind: 'flat', label: 'Guides', href: '/guides/' });
});

test('switches off, or no pages: nothing changes', () => {
  const out = mergePageSwitches(nav, footer, [{ title: 'Draft', slug: 'draft' }, null]);
  assert.deepEqual(out, { nav, footer });
  assert.deepEqual(mergePageSwitches(nav, footer, null), { nav, footer });
});

test('a footer switch with no columns makes a "More" column', () => {
  const out = mergePageSwitches([], [], [{ title: 'Terms', slug: 'terms', addToFooter: true }]);
  assert.deepEqual(out.footer, [{ title: 'More', links: [{ label: 'Terms', href: '/terms/' }] }]);
});

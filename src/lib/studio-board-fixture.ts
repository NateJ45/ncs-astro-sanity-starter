// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// =============================================================================
// Made-up numbers for the Report tool (Studio kit, PORTS.md card 218)
// =============================================================================
// Nothing local can reach the studio-status binding, so the unit tests, the
// bench page (/styleguide/report/) and the Playwright spec all read this: a
// series report worked out from the dates alone (no clock, no randomness), and
// a small config that has one of everything the rules cover:
//   - give_click was first counted on 2026-09-01 (earlier: "Not tracked yet"),
//   - counting was down in December 2025 (a gap),
//   - "today" is BENCH_TODAY, so November 2026 is still running.
// No number here belongs to a real site.
// =============================================================================

import type { BoardConfig, SeriesReport } from './studio-board.ts';

export const BENCH_TODAY = '2026-11-05';

export const BENCH_CONFIG: BoardConfig = {
  siteName: 'Example Site',
  firstMonth: '2025-01',
  timeZone: 'America/New_York',
  since: { all: '2025-01-01', 'event:give_click': '2026-09-01' },
  gaps: [
    {
      months: ['2025-12'],
      text: 'Counting was switched off by mistake for most of December 2025, so that month is left out.',
    },
  ],
  overview: {
    tiles: [
      {
        measure: 'visitors',
        label: 'Visitors',
        explain: 'People who came to the website, each counted once in the period.',
      },
      {
        measure: 'pageViews',
        label: 'Pages viewed',
        explain: 'Every page opened, by anyone.',
      },
      {
        measure: 'event:generate_lead',
        label: 'Forms sent',
        explain: 'Each time someone sent a form on the website.',
      },
      {
        measure: 'event:give_click',
        label: 'Give clicks',
        explain: 'Clicks on a link to online giving. A click is not a gift.',
      },
      {
        measure: 'searchClicks',
        label: 'Clicks from Google',
        explain: 'Times someone chose the website in a Google search.',
      },
    ],
    charts: [
      { measure: 'visitors', title: 'Visitors by month' },
      { measure: 'pageViews', title: 'Pages viewed by month', type: 'line' },
      { measure: 'channels', title: 'How people found the website' },
      { measure: 'topContent', title: 'Most viewed pages' },
    ],
  },
  parts: [
    {
      id: 'forms',
      title: 'Forms and giving',
      explain:
        'Forms sent are counted when the form says thank you. Give clicks are clicks through to online giving, counted since September 2026.',
      tiles: [
        { measure: 'event:generate_lead', label: 'Forms sent' },
        { measure: 'event:give_click', label: 'Give clicks' },
      ],
      charts: [
        { measure: 'event:generate_lead', title: 'Forms sent by month' },
        { measure: 'event:give_click', title: 'Give clicks by month' },
      ],
      more: [{ measure: 'event:form_view', title: 'Forms seen by month' }],
    },
    {
      id: 'google',
      title: 'Found on Google',
      explain: 'From Google Search Console, which keeps about sixteen months.',
      tiles: [
        { measure: 'searchClicks', label: 'Clicks from Google' },
        { measure: 'searchAppearances', label: 'Times you appeared', up: 'flat' },
      ],
      charts: [
        { measure: 'searchQueries', title: 'Searches that found you' },
        { measure: 'places', title: 'Where visitors were' },
      ],
      more: [
        { measure: 'searchPages', title: 'Pages Google sent people to' },
        { measure: 'countries', title: 'Countries' },
      ],
    },
  ],
};

const ymOf = (y: number, m: number) => {
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** A steady climb with a summer dip: the same number for the same month every time. */
function base(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  const age = (y - 2024) * 12 + m;
  return Math.round(300 + age * 14 + [0, 30, 60, 40, 10, -40, -70, -50, 20, 70, 90, 120][m - 1]);
}

const daysIn = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** The share of a month that the inclusive span from..to covers. */
function share(ym: string, from: string, to: string): number {
  const a = from.slice(0, 7) === ym ? Number(from.slice(8)) : 1;
  const b = to.slice(0, 7) === ym ? Number(to.slice(8)) : daysIn(ym);
  if (ym < from.slice(0, 7) || ym > to.slice(0, 7)) return 0;
  return (b - a + 1) / daysIn(ym);
}

const prevYm = (ym: string) => `${Number(ym.slice(0, 4)) - 1}${ym.slice(4)}`;

/** The series report studio-status would give for from..to (inclusive, at most 366 days). */
export function fixtureReport(from: string, to: string): SeriesReport {
  const [ty, tm] = to.split('-').map(Number);
  const yms = Array.from({ length: 24 }, (_, i) => ymOf(ty, tm - 1 - (23 - i)));
  const users = (ym: string) => (ym === '2025-12' ? 12 : base(ym));
  const months = yms.map((ym) => ({
    ym,
    users: users(ym),
    newUsers: Math.round(users(ym) * 0.7),
    sessions: Math.round(users(ym) * 1.3),
    views: Math.round(users(ym) * 2.6),
  }));
  // Every month the period touches, weighted by the days it covers, and the same a year before.
  const span: string[] = [];
  for (let ym = from.slice(0, 7); ym <= to.slice(0, 7);) {
    span.push(ym);
    const [y, m] = ym.split('-').map(Number);
    ym = ymOf(y, m);
  }
  const sum = (f: (ym: string) => number, shift = false) =>
    Math.round(span.reduce((n, ym) => n + f(shift ? prevYm(ym) : ym) * share(ym, from, to), 0));
  const totals = (shift: boolean) => ({
    users: sum(users, shift),
    newUsers: sum((ym) => users(ym) * 0.7, shift),
    sessions: sum((ym) => users(ym) * 1.3, shift),
    views: sum((ym) => users(ym) * 2.6, shift),
    engagementRate: 0.58,
  });
  // name: [share of visitors, first month counted]
  const events: Record<string, [number, string]> = {
    generate_lead: [0.03, '2025-01'],
    form_view: [0.2, '2025-01'],
    give_click: [0.05, '2026-09'],
    // The events other sites' configs name, so /styleguide/report/?config=site shows numbers.
    watch_click: [0.12, '2025-01'],
    directions_click: [0.04, '2025-01'],
    contact_click: [0.06, '2025-01'],
    article_read: [0.09, '2025-01'],
    embed_interact: [0.05, '2025-01'],
  };
  const ev = (name: string) => (ym: string) =>
    ym < events[name][1] ? 0 : users(ym) * events[name][0];
  const scale = sum(users) / 600;
  const list = (rows: [string, number][]) =>
    rows.map(([name, n]) => ({ name, n: Math.max(1, Math.round(n * scale)) }));
  return {
    from,
    to,
    fetched: `${BENCH_TODAY}T09:00:00Z`,
    previous: {
      startDate: prevYm(from.slice(0, 7)) + from.slice(7),
      endDate: prevYm(to.slice(0, 7)) + to.slice(7),
    },
    totals: { cur: totals(false), prev: totals(true) },
    months,
    channels: list([
      ['Organic Search', 280],
      ['Direct', 190],
      ['Organic Social', 90],
      ['Referral', 40],
      ['Email', 25],
    ]).map((x) => ({ name: x.name, sessions: x.n })),
    regions: list([
      ['Indiana', 310],
      ['Ohio', 70],
      ['Illinois', 45],
      ['Michigan', 30],
      ['Kentucky', 22],
      ['Texas', 12],
    ]).map((x) => ({ name: x.name, users: x.n })),
    countries: list([
      ['United States', 540],
      ['Canada', 18],
      ['United Kingdom', 9],
    ]).map((x) => ({ name: x.name, users: x.n })),
    events: Object.fromEntries(
      Object.keys(events).map((name) => [name, { cur: sum(ev(name)), prev: sum(ev(name), true) }]),
    ),
    eventsByMonth: Object.fromEntries(
      Object.keys(events).map((name) => [
        name,
        yms.map((ym) => (ym < events[name][1] ? null : Math.round(ev(name)(ym)))),
      ]),
    ),
    content: list([
      ['/', 420],
      ['/about/', 160],
      ['/services/', 140],
      ['/journal/a-good-start/', 90],
      ['/contact/', 85],
      ['/journal/second-thoughts/', 40],
    ]).map((x, i) => ({
      path: x.name,
      title:
        ['Home', 'About', 'Services', 'A good start', 'Contact', 'Second thoughts'][i] +
        ' | Example Site',
      views: x.n,
      reads: Math.round(x.n / 3),
    })),
    groups: {},
    search: {
      totals: {
        cur: {
          clicks: sum((ym) => users(ym) * 0.4),
          impressions: sum((ym) => users(ym) * 9),
          ctr: 0.044,
          position: 11.2,
        },
        prev: {
          clicks: sum((ym) => users(ym) * 0.4, true),
          impressions: sum((ym) => users(ym) * 9, true),
          ctr: 0.041,
          position: 12.9,
        },
      },
      months: yms.slice(8).map((ym) => ({
        ym,
        clicks: Math.round(users(ym) * 0.4),
        impressions: Math.round(users(ym) * 9),
      })),
      queries: list([
        ['example site', 60],
        ['example services near me', 34],
        ['a good start', 12],
      ]).map((x) => ({ query: x.name, clicks: x.n, impressions: x.n * 14 })),
      pages: list([
        ['/', 80],
        ['/services/', 30],
        ['/journal/a-good-start/', 14],
      ]).map((x) => ({ path: x.name, clicks: x.n, impressions: x.n * 12 })),
    },
  };
}

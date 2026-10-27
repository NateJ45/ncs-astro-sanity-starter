// Safe to edit by hand
// The browser half of the opening hours (PORTS.md card 196). A static page was
// built at one moment; this keeps three things right at the moment it is read,
// on the site's clock (site.timeZone, never the visitor's):
//
//   [data-biz-status]  the "Open now until 5 pm" line (OpenStatus.astro), from
//                      the week's hours it carries as data-hours
//   [data-biz-until]   a dated change (HoursTable.astro) is hidden once its last
//                      day has passed, even if no rebuild ran; a
//                      [data-biz-changes] list with none left hides too
//   [data-biz-days]    the hours-table row that holds today gets data-today
//
// Imported by the components' <script> tags, so it is bundled once and only on
// pages that show hours. Re-runs on astro:page-load and once a minute.
import { site } from '@/data/site';
import {
  openState,
  statusParts,
  weekdayOf,
  zonedClock,
  type WeeklyHours,
} from '@/lib/business-hours';

function refresh() {
  const now = new Date();
  for (const el of document.querySelectorAll<HTMLElement>('[data-biz-status]')) {
    let hours: WeeklyHours;
    try {
      hours = JSON.parse(el.dataset.hours ?? '');
    } catch {
      continue;
    }
    const state = openState(hours, now, site.timeZone);
    const parts = statusParts(state);
    el.dataset.open = state.open ? 'true' : 'false';
    const head = el.querySelector('[data-headline]');
    const detail = el.querySelector('[data-detail]');
    if (head) head.textContent = parts.headline;
    if (detail) detail.textContent = parts.detail;
  }
  const { date } = zonedClock(now, site.timeZone);
  for (const el of document.querySelectorAll<HTMLElement>('[data-biz-until]')) {
    el.hidden = (el.dataset.bizUntil ?? '') < date;
  }
  for (const list of document.querySelectorAll<HTMLElement>('[data-biz-changes]')) {
    list.hidden = !list.querySelector('[data-biz-until]:not([hidden])');
  }
  const weekday = String(weekdayOf(date));
  for (const el of document.querySelectorAll<HTMLElement>('[data-biz-days]')) {
    if ((el.dataset.bizDays ?? '').split(',').includes(weekday)) el.dataset.today = 'true';
    else delete el.dataset.today;
  }
}

refresh();
document.addEventListener('astro:page-load', refresh);
window.setInterval(refresh, 60_000);

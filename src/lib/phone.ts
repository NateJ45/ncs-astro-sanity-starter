// Safe to edit by hand
// Turns a display phone string from Sanity (siteSettings.phone, e.g.
// "(931) 539-5255") into a tel: href. Strips formatting; a US 10-digit
// number gets a +1 country code. Returns '' when there is no number so
// callers can hide the link rather than render a dead tel:.

export function telHref(phone?: string | null): string {
  const digits = (phone ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return `tel:${digits.length === 10 ? `+1${digits}` : digits}`;
}

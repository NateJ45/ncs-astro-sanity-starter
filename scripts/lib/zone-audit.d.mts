// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Types for scripts/lib/zone-audit.mjs, so src/lib/zone-audit.test.ts can import
// the audit's pure logic without a ts directive. The script stays plain JS
// because scripts/cutover.mjs runs it with bare `node`.

export interface ZoneRecord {
  /** Owner name exactly as the export spelled it: `@`, `www`, `_dmarc`, ... */
  name: string;
  ttl: number | null;
  class: string;
  /** Uppercased RR type: A, CNAME, MX, TXT, ... */
  type: string;
  /** MX/SRV preference, null for every other type. */
  priority: number | null;
  /** For TXT, the joined contents of the quoted strings, bytes intact. */
  value: string;
  /** The original line, kept so a skipped record can be shown verbatim. */
  line: string;
}

export type FindingLevel = 'error' | 'warn' | 'info';

export interface ZoneFinding {
  level: FindingLevel;
  /** Stable identifier: assert on this, never on the prose. */
  code: string;
  message: string;
  values?: string[];
}

export interface ZonePlanStep {
  record: ZoneRecord;
  action: 'import' | 'rewrite' | 'skip';
  reason: string;
  /** Present only on `rewrite`: the corrected value. */
  value?: string;
}

export interface ZoneAudit {
  domain: string;
  /** Recognised mail provider id, or null. */
  provider: string | null;
  findings: ZoneFinding[];
  plan: ZonePlanStep[];
  counts: { import: number; rewrite: number; skip: number };
}

export interface MailProvider {
  id: string;
  label: string;
  mx: RegExp;
  include: string;
}

export function parseZoneFile(text: string): ZoneRecord[];
export function auditZone(records: ZoneRecord[], options?: { domain?: string }): ZoneAudit;
export function renderZoneFile(audit: ZoneAudit, options?: { header?: string }): string;
export function spfIncludes(value: string): string[];
export function mergeSpf(values: string[], requiredInclude?: string | null): string;
export function detectMailProvider(records: ZoneRecord[]): MailProvider | null;

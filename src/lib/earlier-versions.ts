// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// "Earlier versions": the pure half (Studio kit, PORTS.md card 125)
// =============================================================================
// Sanity's free plan keeps three days of history. The nightly backups keep
// fourteen, encrypted with BACKUP_PASSPHRASE, which only GitHub Actions holds.
// So a document's "Earlier versions" panel works in three hops:
//
//   Studio panel (src/sanity/kit/EarlierVersions.tsx)
//     -> Worker /api/studio/earlier-versions/ (same origin, a signed-in Sanity
//        editor, rate limited; holds GITHUB_DEPLOY_TOKEN, never the passphrase)
//     -> GitHub Actions restore-doc.yml, which decrypts in CI and either lists
//        the versions (scan) or writes ONE draft (restore: dry run, then the
//        write behind NCS_PRODUCTION_WRITE).
//
// The answer comes back through the run's log, as one marker line the script
// prints (scripts/restore-doc.mjs --no-values): field names and list lengths,
// never field values, because a public repository's logs are public.
//
// Everything here is pure (no Worker, no React) so src/lib/earlier-versions.test.ts
// can check it in bare Node: the input checks, who may ask, the rate limit, the
// backups list, finding the run for a request, reading the marker, and the
// GitHub request shapes.
// =============================================================================

import { githubHeaders, isRepoName } from './deploy-status.ts';

export { githubHeaders, isRepoName };

/** The workflow the Worker starts. */
export const RESTORE_WORKFLOW = 'restore-doc.yml';
/** The backup artifact's name (sanity-backup.yml). */
export const BACKUP_ARTIFACT = 'sanity-backup';
/** How many nightly backups the panel lists (GitHub keeps them 14 days). */
export const MAX_BACKUPS = 14;

export type VersionsMode = 'scan' | 'restore';

// -----------------------------------------------------------------------------
// Input checks (the workflow checks them again)
// -----------------------------------------------------------------------------

/** A Sanity document id the panel may ask about. Not Sanity's own "_." ids. */
export function isDocId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    /^(drafts\.)?[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(id) &&
    !id.includes('..')
  );
}

/** A GitHub run id. */
export function isRunId(id: unknown): id is string {
  return typeof id === 'string' && /^\d{1,15}$/.test(id);
}

/** The request id the Worker makes and the run's name carries. */
export function isRequestId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);
}

/** The published id ("drafts.x" and "x" both give "x"). */
export const publishedId = (id: string): string => id.replace(/^drafts\./, '');

// -----------------------------------------------------------------------------
// Who may ask
// -----------------------------------------------------------------------------

/**
 * A project member who can edit. Viewers are refused: a restore writes a draft
 * with the site's own token, so asking must need at least the right to write
 * a draft yourself.
 */
export function canEdit(roles: string[] | undefined): boolean {
  return (roles ?? []).some((r) => r && r !== 'viewer');
}

// -----------------------------------------------------------------------------
// The rate limit (per Worker instance, like deploy-status's "Try again")
// -----------------------------------------------------------------------------

export const PER_USER_GAP_MS = 20 * 1000;
export const PER_USER_HOURLY = 10;
export const ALL_HOURLY = 30;
const HOUR = 60 * 60 * 1000;

export interface DispatchLog {
  /** Start times of this Worker's recent dispatches, with who asked. */
  entries: Array<{ at: number; user: string }>;
}

/** May this user start a run now? null when they may, else the plain reason. */
export function dispatchRefusal(log: DispatchLog, user: string, now: number): string | null {
  const recent = log.entries.filter((e) => now - e.at < HOUR);
  const mine = recent.filter((e) => e.user === user);
  const last = mine.reduce((m, e) => Math.max(m, e.at), 0);
  if (last && now - last < PER_USER_GAP_MS)
    return 'One moment: the last request is still starting.';
  if (mine.length >= PER_USER_HOURLY || recent.length >= ALL_HOURLY) {
    return 'That is a lot of requests for one hour. Try again later, or ask for help.';
  }
  return null;
}

/** The log with this dispatch added and anything older than an hour dropped. */
export function recordDispatch(log: DispatchLog, user: string, now: number): DispatchLog {
  return { entries: [...log.entries.filter((e) => now - e.at < HOUR), { at: now, user }] };
}

// -----------------------------------------------------------------------------
// The backups the panel can offer
// -----------------------------------------------------------------------------

/** The slice of GitHub's artifact listing this file reads. */
export interface GithubArtifact {
  id: number;
  name: string;
  expired: boolean;
  created_at: string | null;
  size_in_bytes?: number;
  workflow_run?: { id?: number | null } | null;
}

export interface Backup {
  /** The sanity-backup run that made it: what a restore asks for. */
  run: string;
  /** "2026-10-17" (UTC, the day the backup ran). */
  date: string;
}

/**
 * The kept backups, newest first, one per night (the newest run that night),
 * at most MAX_BACKUPS. Expired artifacts and other names are left out.
 */
export function backupsFromArtifacts(artifacts: GithubArtifact[] | null | undefined): Backup[] {
  const live = (artifacts ?? [])
    .filter((a) => a.name === BACKUP_ARTIFACT && !a.expired && a.created_at && a.workflow_run?.id)
    .sort((a, b) => Date.parse(b.created_at!) - Date.parse(a.created_at!));
  const out: Backup[] = [];
  const nights = new Set<string>();
  for (const a of live) {
    const date = a.created_at!.slice(0, 10);
    if (nights.has(date)) continue;
    nights.add(date);
    out.push({ run: String(a.workflow_run!.id), date });
    if (out.length >= MAX_BACKUPS) break;
  }
  return out;
}

// -----------------------------------------------------------------------------
// From a request to its run, and from the run's log to an answer
// -----------------------------------------------------------------------------

/** The slice of a workflow run this file reads. */
export interface RestoreRun {
  id: number;
  status: string;
  conclusion: string | null;
  display_title?: string;
  name?: string;
  created_at: string;
}

/** The run started for this request: its title is "restore-doc <mode> <request>". */
export function runForRequest(
  runs: RestoreRun[] | null | undefined,
  request: string,
): RestoreRun | null {
  if (!isRequestId(request)) return null;
  const suffix = ` ${request}`;
  return (
    (runs ?? []).find((r) => (r.display_title ?? r.name ?? '').trim().endsWith(suffix)) ?? null
  );
}

export type RequestState = 'starting' | 'running' | 'done' | 'failed';

/** What to tell the panel about a run (or about no run yet). */
export function requestState(run: RestoreRun | null): RequestState {
  if (!run) return 'starting';
  if (run.status !== 'completed') return 'running';
  return run.conclusion === 'success' ? 'done' : 'failed';
}

/** One field that differs between a backup and now. No values, ever. */
export interface FieldChange {
  field: string;
  change: 'changed' | 'restored' | 'cleared';
  /** List lengths, when the field is a list. */
  then: number | null;
  now: number | null;
}

export interface FoundVersion {
  run: number;
  date: string;
  kind: string;
  found: true;
  wasDraft: boolean;
  sameAsNow: boolean;
  sameAsNewer: boolean;
  changes: FieldChange[];
}

export interface ScanResult {
  id: string;
  exists: boolean;
  looked: number;
  versions: Array<FoundVersion | { run: number; date: string; kind: string; found: false }>;
}

export interface RestoreResult {
  id: string;
  applied: boolean;
  same?: boolean;
  fields?: number;
}

export const SCAN_MARKER = 'NCS_EARLIER_VERSIONS';
export const RESTORE_MARKER = 'NCS_RESTORE';

/**
 * The JSON after the LAST `name ` marker in a run log, or null. GitHub puts a
 * timestamp before every log line, so the marker is found anywhere on a line.
 * The command line itself never carries a marker (the script prints it), so a
 * log line echoing the command cannot be mistaken for one.
 */
export function parseMarker<T>(log: string, name: string): T | null {
  const lines = log.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const at = lines[i].indexOf(`${name} {`);
    if (at === -1) continue;
    try {
      return JSON.parse(lines[i].slice(at + name.length + 1)) as T;
    } catch {
      return null;
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// GitHub request shapes
// -----------------------------------------------------------------------------

const API = 'https://api.github.com';

export function artifactsUrl(repo: string): string {
  return `${API}/repos/${repo}/actions/artifacts?name=${BACKUP_ARTIFACT}&per_page=50`;
}

export function restoreRunsUrl(repo: string): string {
  return `${API}/repos/${repo}/actions/workflows/${RESTORE_WORKFLOW}/runs?event=workflow_dispatch&per_page=30`;
}

export function restoreDispatchUrl(repo: string): string {
  return `${API}/repos/${repo}/actions/workflows/${RESTORE_WORKFLOW}/dispatches`;
}

export function runJobsUrl(repo: string, runId: number): string {
  return `${API}/repos/${repo}/actions/runs/${runId}/jobs`;
}

export function jobLogsUrl(repo: string, jobId: number): string {
  return `${API}/repos/${repo}/actions/jobs/${jobId}/logs`;
}

/** The workflow_dispatch body. Inputs are checked before this is built. */
export function dispatchBody(input: {
  branch: string;
  mode: VersionsMode;
  document: string;
  backupRun?: string;
  request: string;
  requestedBy: string;
}): { ref: string; inputs: Record<string, string> } {
  return {
    ref: input.branch,
    inputs: {
      mode: input.mode,
      document: publishedId(input.document),
      backup_run: input.mode === 'restore' ? (input.backupRun ?? '') : '',
      request: input.request,
      requested_by: input.requestedBy.replace(/[^A-Za-z0-9_.@-]/g, '').slice(0, 64) || 'unknown',
    },
  };
}

// -----------------------------------------------------------------------------
// Words for the panel
// -----------------------------------------------------------------------------

/** "Friday 17 October" from "2026-10-17" (UTC, so a backup never moves a day). */
export function nightLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

/**
 * One short line for what differs, with the fields named the way the editor
 * sees them: "Title, Sections (6 now, 5 then)".
 */
export function changesLine(changes: FieldChange[], title: (field: string) => string): string {
  return changes
    .map((c) => {
      const name = title(c.field);
      if (c.change === 'restored') return `${name} (empty now)`;
      if (c.change === 'cleared') return `${name} (empty then)`;
      if (c.then !== null && c.now !== null && c.then !== c.now) {
        return `${name} (${c.now} now, ${c.then} then)`;
      }
      return name;
    })
    .join(', ');
}

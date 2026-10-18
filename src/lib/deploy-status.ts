// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// Did the last website update go through? (Studio kit, PORTS.md card 111)
// =============================================================================
// The Studio's status line used to compare only the build time with the last
// publish, so a FAILED build read as "taking longer than usual" for ever. The
// Worker route /api/studio/deploy-status/ (src/pages/api/studio/deploy-status.ts)
// reads the production deploy workflow's latest runs from GitHub with a
// server-side token and hands the Studio one word: ok, failed, running or
// unknown. This file is the pure half (the mapping, the request shapes and the
// rate limit rule), kept free of Worker and React imports so
// src/lib/deploy-status.test.ts can check it in bare Node.
// =============================================================================

/** What the Studio is told. Never anything more (no URLs, no log text). */
export type DeployState = 'ok' | 'failed' | 'running' | 'unknown';

export interface DeployStatus {
  /** False when the Worker has no GitHub token: the Studio keeps its old behaviour. */
  configured: boolean;
  state: DeployState;
  /** When the run that decided the state started (ISO), or null. */
  at: string | null;
}

/** The slice of a GitHub workflow run this file reads. */
export interface WorkflowRun {
  status: string; // queued | in_progress | completed | waiting | requested | pending
  conclusion: string | null; // success | failure | cancelled | skipped | timed_out | ...
  created_at: string;
}

const FAILED = new Set(['failure', 'timed_out', 'startup_failure', 'action_required']);

/**
 * The newest run decides. One still going is "running" (a fresh attempt is
 * under way, so an older failure no longer matters). A cancelled or skipped
 * run says nothing about the website, so the next older run decides instead.
 */
export function deployStatusFromRuns(runs: WorkflowRun[] | null | undefined): DeployStatus {
  const sorted = [...(runs ?? [])].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  for (const run of sorted) {
    if (run.status !== 'completed') {
      return { configured: true, state: 'running', at: run.created_at };
    }
    if (run.conclusion === 'success') return { configured: true, state: 'ok', at: run.created_at };
    if (run.conclusion && FAILED.has(run.conclusion)) {
      return { configured: true, state: 'failed', at: run.created_at };
    }
  }
  return { configured: true, state: 'unknown', at: null };
}

/** The answer when the Worker has no token: the Studio falls back quietly. */
export const NOT_CONFIGURED: DeployStatus = { configured: false, state: 'unknown', at: null };

export interface DeployTarget {
  /** "owner/name" */
  repo: string;
  /** The workflow file, "deploy.yml". */
  workflow: string;
  /** The branch production deploys from. */
  branch: string;
}

const API = 'https://api.github.com';

/** Headers for every GitHub call. User-Agent is required by GitHub. */
export function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ncs-studio-kit',
  };
}

/** GET: the newest runs of the deploy workflow on the production branch. */
export function runsUrl(t: DeployTarget, perPage = 10): string {
  return `${API}/repos/${t.repo}/actions/workflows/${encodeURIComponent(t.workflow)}/runs?branch=${encodeURIComponent(t.branch)}&per_page=${perPage}`;
}

/** POST: run the deploy workflow again (workflow_dispatch). */
export function dispatchUrl(t: DeployTarget): string {
  return `${API}/repos/${t.repo}/actions/workflows/${encodeURIComponent(t.workflow)}/dispatches`;
}

/** "owner/name", and nothing that could steer the URL elsewhere. */
export function isRepoName(repo: string | undefined | null): repo is string {
  return typeof repo === 'string' && /^[\w.-]+\/[\w.-]+$/.test(repo);
}

/** How long one "Try again" holds off the next (per Worker instance). */
export const RETRY_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * May the Studio start a deploy now? Not while one is already running, and not
 * twice inside the cooldown. Returns null when it may, else the plain reason.
 */
export function retryRefusal(
  status: DeployStatus,
  lastDispatchAt: number | null,
  now: number,
): string | null {
  if (!status.configured) return 'Trying again is not set up for this website.';
  if (status.state === 'running') return 'The website is already updating. Give it a few minutes.';
  if (lastDispatchAt !== null && now - lastDispatchAt < RETRY_COOLDOWN_MS) {
    return 'It is already trying again. Give it a few minutes.';
  }
  return null;
}

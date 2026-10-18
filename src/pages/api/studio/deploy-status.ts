// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// Foundation, edit with care
// =============================================================================
// /api/studio/deploy-status/ - did the last website update go through?
// =============================================================================
// Studio kit, PORTS.md card 111. The Studio's status line and Home's "Is it
// live?" card read this, so a FAILED build says so plainly instead of reading
// as "taking longer than usual" for ever, and the editor gets a "Try again".
//
// GET  -> { configured, state: 'ok' | 'failed' | 'running' | 'unknown', at }
//         Public on purpose: it says one word about the deploy, and the
//         workflow runs of a public repo are public anyway. Cached for 60
//         seconds per Worker instance, so the Studio's once-a-minute check
//         costs GitHub at most one call a minute.
// POST -> { ok: true } (202) | { ok: false, error } (401 / 403 / 409 / 429 / 502)
//         Runs the deploy workflow again. Same origin only, a signed-in Studio
//         member only (src/lib/studio-auth.ts), never while a deploy is running,
//         and at most once every five minutes per Worker instance. GitHub's own
//         concurrency group queues anything that slips past.
//
// THE WORKER'S SETTINGS (both optional; without the token the Studio keeps the
// old build-time comparison and offers no "Try again"):
//   GITHUB_DEPLOY_TOKEN  secret (`npx wrangler secret put GITHUB_DEPLOY_TOKEN`).
//                        A fine-grained token on this repository only, with
//                        "Actions: Read and write" and nothing else. Never sent
//                        to the browser, never logged.
//   GITHUB_REPO          "owner/name", a plain var in wrangler.jsonc.
//   DEPLOY_WORKFLOW      default "deploy.yml". DEPLOY_BRANCH default "main".
// =============================================================================

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  deployStatusFromRuns,
  dispatchUrl,
  githubHeaders,
  isRepoName,
  NOT_CONFIGURED,
  retryRefusal,
  runsUrl,
  type DeployStatus,
  type DeployTarget,
  type WorkflowRun,
} from '@/lib/deploy-status';
import { bearerToken, isSameOrigin, verifyStudioUser } from '@/lib/studio-auth';

export const prerender = false;

interface DeployEnv {
  GITHUB_DEPLOY_TOKEN?: string;
  GITHUB_REPO?: string;
  DEPLOY_WORKFLOW?: string;
  DEPLOY_BRANCH?: string;
}

const CACHE_MS = 60 * 1000;

// Per Worker instance. Good enough: the point is not hammering GitHub, and the
// deploy workflow's concurrency group is the real backstop.
let cached: { at: number; value: DeployStatus } | null = null;
let lastDispatchAt: number | null = null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function settings(): { token: string; target: DeployTarget } | null {
  const e = env as unknown as DeployEnv;
  if (!e.GITHUB_DEPLOY_TOKEN || !isRepoName(e.GITHUB_REPO)) return null;
  return {
    token: e.GITHUB_DEPLOY_TOKEN,
    target: {
      repo: e.GITHUB_REPO,
      workflow: e.DEPLOY_WORKFLOW || 'deploy.yml',
      branch: e.DEPLOY_BRANCH || 'main',
    },
  };
}

async function readStatus(fresh = false): Promise<DeployStatus> {
  const s = settings();
  if (!s) return NOT_CONFIGURED;
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    const res = await fetch(runsUrl(s.target), { headers: githubHeaders(s.token) });
    if (!res.ok) {
      console.error(`deploy-status: GitHub answered ${res.status}`);
      return { configured: true, state: 'unknown', at: null };
    }
    const body = (await res.json()) as { workflow_runs?: WorkflowRun[] };
    const value = deployStatusFromRuns(body.workflow_runs);
    cached = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.error(`deploy-status: ${err instanceof Error ? err.message : 'fetch failed'}`);
    return { configured: true, state: 'unknown', at: null };
  }
}

export const GET: APIRoute = async () => json(await readStatus());

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ ok: false, error: 'Not allowed.' }, 403);
  const user = await verifyStudioUser(
    bearerToken(request),
    import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  );
  if (!user)
    return json({ ok: false, error: 'Sign in to the Studio again, then try once more.' }, 401);

  const s = settings();
  const status = await readStatus(true);
  const refusal = retryRefusal(status, lastDispatchAt, Date.now());
  if (refusal || !s) {
    return json({ ok: false, error: refusal ?? 'Not set up.' }, status.configured ? 429 : 409);
  }

  const res = await fetch(dispatchUrl(s.target), {
    method: 'POST',
    headers: { ...githubHeaders(s.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: s.target.branch }),
  }).catch(() => null);
  if (!res || res.status !== 204) {
    console.error(`deploy-status: dispatch answered ${res?.status ?? 'nothing'}`);
    return json({ ok: false, error: 'GitHub did not take the request.' }, 502);
  }
  lastDispatchAt = Date.now();
  // Say "running" straight away; GitHub takes a few seconds to list the run.
  cached = {
    at: Date.now(),
    value: { configured: true, state: 'running', at: new Date().toISOString() },
  };
  console.log(`deploy-status: deploy started again by Studio user ${user.id}`);
  return json({ ok: true }, 202);
};

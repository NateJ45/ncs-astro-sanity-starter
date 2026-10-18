// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// The deploy-status mapping, request shapes and retry rule (src/lib/deploy-status.ts),
// plus the Studio-session check behind "Try again" (src/lib/studio-auth.ts). Card 111.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deployStatusFromRuns,
  dispatchUrl,
  isRepoName,
  NOT_CONFIGURED,
  RETRY_COOLDOWN_MS,
  retryRefusal,
  runsUrl,
  type WorkflowRun,
} from './deploy-status.ts';
import { bearerToken, isSameOrigin, verifyStudioUser } from './studio-auth.ts';

const run = (created_at: string, status: string, conclusion: string | null): WorkflowRun => ({
  created_at,
  status,
  conclusion,
});

describe('deployStatusFromRuns', () => {
  it('the newest finished run decides', () => {
    const s = deployStatusFromRuns([
      run('2026-10-18T09:00:00Z', 'completed', 'success'),
      run('2026-10-18T10:00:00Z', 'completed', 'failure'),
    ]);
    assert.equal(s.state, 'failed');
    assert.equal(s.at, '2026-10-18T10:00:00Z');
  });
  it('a success after a failure clears it', () => {
    const s = deployStatusFromRuns([
      run('2026-10-18T10:00:00Z', 'completed', 'failure'),
      run('2026-10-18T11:00:00Z', 'completed', 'success'),
    ]);
    assert.equal(s.state, 'ok');
  });
  it('a run still going is "running", whatever came before', () => {
    assert.equal(
      deployStatusFromRuns([
        run('2026-10-18T10:00:00Z', 'completed', 'failure'),
        run('2026-10-18T11:00:00Z', 'in_progress', null),
      ]).state,
      'running',
    );
    assert.equal(
      deployStatusFromRuns([run('2026-10-18T11:00:00Z', 'queued', null)]).state,
      'running',
    );
  });
  it('cancelled and skipped runs are passed over', () => {
    assert.equal(
      deployStatusFromRuns([
        run('2026-10-18T10:00:00Z', 'completed', 'failure'),
        run('2026-10-18T11:00:00Z', 'completed', 'cancelled'),
        run('2026-10-18T12:00:00Z', 'completed', 'skipped'),
      ]).state,
      'failed',
    );
  });
  it('timed out and startup failures count as failed', () => {
    for (const c of ['timed_out', 'startup_failure']) {
      assert.equal(
        deployStatusFromRuns([run('2026-10-18T10:00:00Z', 'completed', c)]).state,
        'failed',
      );
    }
  });
  it('no runs, or nothing decisive, is unknown but configured', () => {
    assert.deepEqual(deployStatusFromRuns([]), { configured: true, state: 'unknown', at: null });
    assert.equal(deployStatusFromRuns(undefined).state, 'unknown');
    assert.equal(
      deployStatusFromRuns([run('2026-10-18T10:00:00Z', 'completed', 'cancelled')]).state,
      'unknown',
    );
  });
});

describe('GitHub requests', () => {
  const t = { repo: 'Owner/site-repo', workflow: 'deploy.yml', branch: 'main' };
  it('builds the runs and dispatch URLs', () => {
    assert.equal(
      runsUrl(t),
      'https://api.github.com/repos/Owner/site-repo/actions/workflows/deploy.yml/runs?branch=main&per_page=10',
    );
    assert.equal(
      dispatchUrl(t),
      'https://api.github.com/repos/Owner/site-repo/actions/workflows/deploy.yml/dispatches',
    );
  });
  it('accepts only a plain owner/name repo', () => {
    assert.equal(isRepoName('NateJ45/fbc-auburn'), true);
    assert.equal(isRepoName('a/b/c'), false);
    assert.equal(isRepoName('evil.com?x=/y'), false);
    assert.equal(isRepoName(undefined), false);
  });
});

describe('retryRefusal', () => {
  const failed = { configured: true, state: 'failed' as const, at: null };
  const now = 1_000_000_000;
  it('allows a retry after a failure', () => {
    assert.equal(retryRefusal(failed, null, now), null);
  });
  it('refuses while a deploy is running', () => {
    assert.match(
      retryRefusal({ ...failed, state: 'running' }, null, now) ?? '',
      /already updating/,
    );
  });
  it('refuses twice inside the cooldown, allows after it', () => {
    assert.match(retryRefusal(failed, now - 1000, now) ?? '', /already trying/);
    assert.equal(retryRefusal(failed, now - RETRY_COOLDOWN_MS - 1, now), null);
  });
  it('refuses when not configured', () => {
    assert.ok(retryRefusal(NOT_CONFIGURED, null, now));
  });
});

describe('the Studio session check', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://church.example/api/studio/deploy-status/', { method: 'POST', headers });

  it('same origin by Origin, or by Sec-Fetch-Site when Origin is absent', () => {
    assert.equal(isSameOrigin(req({ Origin: 'https://church.example' })), true);
    assert.equal(isSameOrigin(req({ Origin: 'https://evil.example' })), false);
    assert.equal(isSameOrigin(req({ 'Sec-Fetch-Site': 'same-origin' })), true);
    assert.equal(isSameOrigin(req({ 'Sec-Fetch-Site': 'cross-site' })), false);
    assert.equal(isSameOrigin(req({})), false);
  });

  it('reads a bearer token', () => {
    assert.equal(bearerToken(req({ Authorization: 'Bearer abc.def' })), 'abc.def');
    assert.equal(bearerToken(req({ Authorization: 'Basic abc' })), null);
    assert.equal(bearerToken(req({})), null);
  });

  const answer = (status: number, body: unknown) => async () =>
    new Response(JSON.stringify(body), { status });

  it('a project member with a role passes', async () => {
    const user = await verifyStudioUser(
      't',
      'abc123',
      answer(200, { id: 'pX', name: 'Ann', roles: [{ name: 'editor' }] }),
    );
    assert.deepEqual(user, { id: 'pX', name: 'Ann' });
  });
  it('no role, no id, a 401, a throw or a bad project id all fail closed', async () => {
    assert.equal(await verifyStudioUser('t', 'abc123', answer(200, { id: 'pX', roles: [] })), null);
    assert.equal(await verifyStudioUser('t', 'abc123', answer(200, {})), null);
    assert.equal(await verifyStudioUser('t', 'abc123', answer(401, { id: 'pX' })), null);
    assert.equal(
      await verifyStudioUser('t', 'abc123', async () => {
        throw new Error('down');
      }),
      null,
    );
    assert.equal(
      await verifyStudioUser('t', 'abc.evil.com/x', answer(200, { id: 'p', role: 'a' })),
      null,
    );
    assert.equal(await verifyStudioUser(null, 'abc123', answer(200, { id: 'p', role: 'a' })), null);
  });
  it('asks this project, with the token', async () => {
    let seen = '';
    let auth = '';
    await verifyStudioUser('tok', 'abc123', async (url, init) => {
      seen = url;
      auth = new Headers(init?.headers).get('Authorization') ?? '';
      return new Response('{}', { status: 200 });
    });
    assert.equal(seen, 'https://abc123.api.sanity.io/v2025-02-19/users/me');
    assert.equal(auth, 'Bearer tok');
  });
});

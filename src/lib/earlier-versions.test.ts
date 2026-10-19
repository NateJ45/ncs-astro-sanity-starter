// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
// "Earlier versions" (PORTS.md card 125): the endpoint's checks and limits, the
// backups list, finding a request's run, reading the run log back, and that the
// route and the workflow keep their safety rails.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  backupsFromArtifacts,
  canEdit,
  changesLine,
  dispatchBody,
  dispatchRefusal,
  isDocId,
  isRequestId,
  isRunId,
  MAX_BACKUPS,
  nightLabel,
  parseMarker,
  recordDispatch,
  requestState,
  runForRequest,
  SCAN_MARKER,
  type ScanResult,
} from './earlier-versions.ts';
// The script's own marker writer and value-free summary, so the two halves agree.
import { changeSummary, markerLine } from '../../scripts/lib/restore-doc.mjs';

const root = join(import.meta.dirname, '..', '..');

describe('input checks', () => {
  it('document ids: plain ids and drafts, never system ids or tricks', () => {
    for (const id of ['aboutPage', 'drafts.aboutPage', '3f2a-91b0', 'page.sub-1']) {
      assert.ok(isDocId(id), id);
    }
    for (const id of ['', '_.groups.administrator', 'a..b', 'a b', 'a"; rm', 'x'.repeat(200), 3]) {
      assert.ok(!isDocId(id), String(id));
    }
  });
  it('run and request ids', () => {
    assert.ok(isRunId('123456789'));
    assert.ok(!isRunId('12a'));
    assert.ok(isRequestId(crypto.randomUUID()));
    assert.ok(!isRequestId('short'));
    assert.ok(!isRequestId('a b c d e f g h'));
  });
});

describe('who may ask', () => {
  it('editors and administrators may, viewers and nobody may not', () => {
    assert.ok(canEdit(['editor']));
    assert.ok(canEdit(['administrator']));
    assert.ok(canEdit(['viewer', 'contributor']));
    assert.ok(!canEdit(['viewer']));
    assert.ok(!canEdit([]));
    assert.ok(!canEdit(undefined));
  });
});

describe('the rate limit', () => {
  const now = 10_000_000;
  it('one start per editor every 20 seconds', () => {
    const log = recordDispatch({ entries: [] }, 'u1', now);
    assert.ok(dispatchRefusal(log, 'u1', now + 5_000));
    assert.equal(dispatchRefusal(log, 'u1', now + 21_000), null);
    assert.equal(dispatchRefusal(log, 'u2', now + 5_000), null);
  });
  it('ten an hour per editor, thirty an hour in all', () => {
    let log = { entries: [] as Array<{ at: number; user: string }> };
    for (let i = 0; i < 10; i++) log = recordDispatch(log, 'u1', now + i * 60_000);
    assert.ok(dispatchRefusal(log, 'u1', now + 11 * 60_000));
    assert.equal(dispatchRefusal(log, 'u1', now + 70 * 60_000), null, 'an hour later');
    let all = { entries: [] as Array<{ at: number; user: string }> };
    for (let i = 0; i < 30; i++) all = recordDispatch(all, `u${i}`, now + i * 1000);
    assert.ok(dispatchRefusal(all, 'new', now + 40_000));
  });
});

describe('the backups list', () => {
  const art = (id: number, run: number, at: string, extra = {}) => ({
    id,
    name: 'sanity-backup',
    expired: false,
    created_at: at,
    workflow_run: { id: run },
    ...extra,
  });
  it('newest first, one per night, no expired or other artifacts', () => {
    const list = backupsFromArtifacts([
      art(1, 101, '2026-10-15T07:05:00Z'),
      art(2, 102, '2026-10-16T07:05:00Z'),
      art(3, 103, '2026-10-16T15:00:00Z'), // a manual run the same day: the newer wins
      art(4, 104, '2026-10-17T07:05:00Z', { expired: true }),
      art(5, 105, '2026-10-17T07:05:00Z', { name: 'playwright-report' }),
    ]);
    assert.deepEqual(list, [
      { run: '103', date: '2026-10-16' },
      { run: '101', date: '2026-10-15' },
    ]);
  });
  it(`at most ${MAX_BACKUPS}`, () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      art(i, 200 + i, `2026-10-${String(i + 1).padStart(2, '0')}T07:00:00Z`),
    );
    assert.equal(backupsFromArtifacts(many).length, MAX_BACKUPS);
    assert.deepEqual(backupsFromArtifacts(null), []);
  });
});

describe('from a request to its run and its answer', () => {
  const req = crypto.randomUUID();
  const runs = [
    {
      id: 1,
      status: 'completed',
      conclusion: 'success',
      display_title: 'restore-doc scan other-1234',
      created_at: '',
    },
    {
      id: 2,
      status: 'in_progress',
      conclusion: null,
      display_title: `restore-doc scan ${req}`,
      created_at: '',
    },
  ];
  it('finds the run by the request id in its title', () => {
    assert.equal(runForRequest(runs, req)?.id, 2);
    assert.equal(runForRequest(runs, crypto.randomUUID()), null);
    assert.equal(runForRequest(runs, 'bad id'), null);
  });
  it('maps a run to a state', () => {
    assert.equal(requestState(null), 'starting');
    assert.equal(requestState(runs[1]), 'running');
    assert.equal(requestState(runs[0]), 'done');
    assert.equal(requestState({ ...runs[0], conclusion: 'failure' }), 'failed');
    assert.equal(requestState({ ...runs[0], conclusion: 'cancelled' }), 'failed');
  });
  it("reads the script's marker back out of a timestamped log", () => {
    const payload = { id: 'aboutPage', exists: true, looked: 1, versions: [] };
    const log = [
      '2026-10-18T07:00:00.0000000Z ##[group]Run node scripts/restore-doc.mjs "$DOC_ID" --scan --no-values',
      '2026-10-18T07:00:09.1000000Z   2026-10-17  same as now',
      `2026-10-18T07:00:09.2000000Z ${markerLine(SCAN_MARKER, payload)}`,
      '2026-10-18T07:00:10.0000000Z Post job cleanup.',
    ].join('\n');
    assert.deepEqual(parseMarker<ScanResult>(log, SCAN_MARKER), payload);
    assert.equal(parseMarker(log, 'NCS_RESTORE'), null);
    assert.equal(parseMarker('NCS_EARLIER_VERSIONS {not json', SCAN_MARKER), null);
  });
});

describe("nothing from a field's words reaches the log", () => {
  it('the value-free summary carries names and list lengths only', () => {
    const now = {
      _id: 'p',
      _type: 'page',
      title: 'Secret new words',
      pageBuilder: [1, 2, 3],
      note: 'x',
    };
    const then = {
      _id: 'p',
      _type: 'page',
      title: 'Private old words',
      pageBuilder: [1, 2],
      extra: 'y',
    };
    const rows = changeSummary(now, then);
    const text = JSON.stringify(rows);
    assert.ok(!/Secret|Private|"x"|"y"/.test(text), text);
    assert.deepEqual(rows, [
      { field: 'extra', change: 'restored', then: null, now: null },
      { field: 'note', change: 'cleared', then: null, now: null },
      { field: 'pageBuilder', change: 'changed', then: 2, now: 3 },
      { field: 'title', change: 'changed', then: null, now: null },
    ]);
  });
  it('the panel names fields the way the editor sees them', () => {
    const line = changesLine(
      [
        { field: 'title', change: 'changed', then: null, now: null },
        { field: 'pageBuilder', change: 'changed', then: 5, now: 6 },
        { field: 'intro', change: 'restored', then: null, now: null },
      ],
      (f) => ({ title: 'Title', pageBuilder: 'Sections', intro: 'Intro' })[f] ?? f,
    );
    assert.equal(line, 'Title, Sections (6 now, 5 then), Intro (empty now)');
    assert.equal(nightLabel('2026-10-17'), 'Saturday 17 October');
  });
});

describe('the dispatch', () => {
  it('sends the published id, the run only for a restore, a clean user id', () => {
    const body = dispatchBody({
      branch: 'main',
      mode: 'scan',
      document: 'drafts.aboutPage',
      backupRun: '99',
      request: 'r-1234567',
      requestedBy: 'p"; echo hi',
    });
    assert.deepEqual(body, {
      ref: 'main',
      inputs: {
        mode: 'scan',
        document: 'aboutPage',
        backup_run: '',
        request: 'r-1234567',
        requested_by: 'pechohi',
      },
    });
  });
});

describe('the safety rails stay in place', () => {
  const route = readFileSync(join(root, 'src/pages/api/studio/earlier-versions.ts'), 'utf8');
  const flow = readFileSync(join(root, '.github/workflows/restore-doc.yml'), 'utf8');

  it('the route checks origin, a Sanity session and the role on GET and POST', () => {
    assert.match(route, /isSameOrigin\(request\)/);
    assert.match(route, /verifyStudioUser\(/);
    assert.match(route, /canEdit\(user\.roles\)/);
    const gets = route.match(
      /export const (GET|POST): APIRoute = async \(\{[^}]*\}\) => \{\s*const who = await gate\(request\);/g,
    );
    assert.equal(gets?.length, 2, 'both handlers start with gate()');
    assert.match(route, /dispatchRefusal\(/);
    assert.ok(
      !/BACKUP_PASSPHRASE/.test(route.replace(/^\/\/.*$/gm, '')),
      'the Worker never holds the passphrase',
    );
  });

  it('the workflow sets the production gate on the write step only, after a dry run', () => {
    const gates = flow.match(/NCS_PRODUCTION_WRITE: 'yes'/g) ?? [];
    assert.equal(gates.length, 1);
    const dry = flow.indexOf('name: Dry run');
    const write = flow.indexOf('name: Put it back as a draft');
    assert.ok(dry > 0 && write > dry, 'the dry run comes first');
    assert.ok(flow.indexOf("NCS_PRODUCTION_WRITE: 'yes'") > write);
    assert.match(flow, /--no-values --apply/);
    const scriptRuns = flow.match(/run: node scripts\/restore-doc\.mjs.*$/gm) ?? [];
    assert.equal(scriptRuns.length, 3);
    for (const r of scriptRuns) assert.match(r, /--no-values/, 'every run is value-free');
  });

  it('the workflow never pastes an input into a script', () => {
    // Inputs reach the shell only as the job's environment variables (and the
    // run's title, which is never executed).
    const uses = flow.split(/\r?\n/).filter((l) => l.includes('${{ inputs.'));
    assert.ok(uses.length > 0);
    for (const line of uses) {
      assert.ok(
        /^run-name: /.test(line) ||
          /^\s+(MODE|DOC_ID|BACKUP_RUN|REQUEST|REQUESTED_BY): \$\{\{ inputs\.\w+ \}\}$/.test(line),
        line,
      );
    }
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCompany } from '../src/company.mjs';
import { createPhase2 } from '../src/phase2.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const serve = async (options) => {
  const company = createCompany({ executionToken: 'secret', getHarness: () => null, port: 0, ...options });
  const { port } = await company.listen();
  return { company, url: (path) => `http://127.0.0.1:${port}${path}` };
};

test('saved reports are served read-only, redacted, and a missing report is reported as missing', async () => {
  const reportsDir = await mkdtemp(join(tmpdir(), 'meridian-reports-'));
  const { company, url } = await serve({ reportsDir });
  try {
    const missing = await fetch(url('/api/reports/phase2'));
    assert.equal(missing.status, 200);
    assert.equal((await missing.json()).report, null, 'a report that was never written is absent, not empty or passing');

    await writeFile(join(reportsDir, 'phase2-latest.json'), JSON.stringify({
      runner: 'arc-control-sandbox-phase2', generatedAt: '2026-10-26T00:00:00.000Z',
      scenarios: [{ id: 'concurrent-idempotency', status: 'fail', error: 'round 1 produced 8 refunds for one idempotency key', apiKey: 'leak' }],
      operatorToken: 'leak'
    }));
    const found = await fetch(url('/api/reports/phase2'));
    assert.equal(found.status, 200);
    const body = await found.json();
    assert.equal(body.file, 'reports/phase2-latest.json');
    assert.equal(body.report.scenarios[0].status, 'fail', 'a failing check must be served as failing');
    assert.equal(JSON.stringify(body).includes('leak'), false, 'credential-like keys must be removed');

    assert.equal((await fetch(url('/api/reports/../../etc'))).status, 404);
    assert.equal((await fetch(url('/api/reports/other'))).status, 404);
  } finally {
    await company.close();
  }
});

test('evidence proxy needs the ARC harness, validates the id, and strips credentials', async () => {
  const seen = [];
  const harness = { scenarios: { evidence: async (id) => { seen.push(id); return id === 'ev_missing' ? { httpStatus: 404, body: {} } : { httpStatus: 200, body: { id, decision: { effect: 'DENY' }, authorization: 'Bearer leak', nested: { token: 'leak', ok: 1 } } }; } } };
  const offline = await serve({});
  try {
    assert.equal((await fetch(offline.url('/api/arc/evidence/ev_1'))).status, 503);
  } finally {
    await offline.company.close();
  }
  const { company, url } = await serve({ getHarness: () => harness });
  try {
    const ok = await fetch(url('/api/arc/evidence/ev_1'));
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.record.decision.effect, 'DENY');
    assert.equal(body.record.nested.ok, 1);
    assert.equal(JSON.stringify(body).includes('leak'), false);
    assert.equal((await fetch(url('/api/arc/evidence/ev_missing'))).status, 404);
    assert.equal((await fetch(url('/api/arc/evidence/bad%20id%2F..'))).status, 400);
    assert.equal((await fetch(url('/api/arc/evidence/%E0%A4%A'))).status, 400);
    assert.deepEqual(seen, ['ev_1', 'ev_missing'], 'invalid ids never reach ARC');
  } finally {
    await company.close();
  }
});

test('the built UI is served at / when present, the original page stays at /classic, assets cannot escape ui/dist', async () => {
  const uiDir = await mkdtemp(join(tmpdir(), 'meridian-ui-'));
  const fallback = await serve({ uiDir });
  try {
    const page = await (await fetch(fallback.url('/'))).text();
    assert.match(page, /app\.js/, 'without a build, / falls back to the original page');
  } finally {
    await fallback.company.close();
  }
  await mkdir(join(uiDir, 'assets'));
  await writeFile(join(uiDir, 'index.html'), '<!doctype html><div id="root"></div><script src="/assets/app-1.js"></script>');
  await writeFile(join(uiDir, 'assets', 'app-1.js'), 'console.log(1)');
  const { company, url } = await serve({ uiDir });
  try {
    assert.match(await (await fetch(url('/'))).text(), /id="root"/);
    const asset = await fetch(url('/assets/app-1.js'));
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type'), /javascript/);
    assert.match(await (await fetch(url('/classic'))).text(), /app\.js/);
    assert.equal((await fetch(url('/assets/..%2F..%2Fpackage.json'))).status, 404);
    assert.equal((await fetch(url('/assets/missing.js'))).status, 404);
    for (const [from, to] of [['/lab', '/#/lab'], ['/lab/suites', '/#/lab/suites'], ['/enterprise/finance/', '/#/enterprise/finance'], ['/system/health', '/#/system/health']]) {
      const res = await fetch(url(from), { redirect: 'manual' });
      assert.deepEqual([res.status, res.headers.get('location')], [302, to], from);
    }
    for (const path of ['/lab/../package.json', '/labx', '/api-lab', '/lab/a.b']) {
      assert.notEqual((await fetch(url(path), { redirect: 'manual' })).status, 302, `${path} is not a Lab page`);
    }
  } finally {
    await company.close();
  }
});

test('health reports whether the Phase 2 runner is wired', async () => {
  const { company, url } = await serve({ getHarness: () => ({ scenarios: {}, phase2: {} }) });
  try {
    const health = await (await fetch(url('/api/health'))).json();
    assert.equal(health.gatewayConfigured, true);
    assert.equal(health.phase2Configured, true);
  } finally {
    await company.close();
  }
});

test('the UI copy of the Phase 2 catalogue matches phase2.mjs', async () => {
  const source = await readFile(join(root, 'ui/src/data/phase2Catalog.ts'), 'utf8');
  const catalogue = createPhase2({ company: { state: () => ({ mutationLog: [] }), server: { address: () => ({ port: 0 }) } }, seeded: {}, apiBase: '', operatorToken: '', arcRoot: '' }).list();
  const rows = [...source.matchAll(/\{ id: '([^']+)'.*?kind: '([^']+)'/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(rows, catalogue.map(item => [item.id, item.kind]));
});

test('browser source never talks to ARC directly or carries credentials', async () => {
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full); else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  await walk(join(root, 'ui/src'));
  assert.ok(files.length > 20);
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    assert.doesNotMatch(text, /['"]x-meridian-connector-token['"]\s*:/, `${file} sets the connector token header`);
    assert.doesNotMatch(text, /authorization['"]?\s*:\s*[`'"]Bearer/i, `${file} sends a bearer token`);
    assert.doesNotMatch(text, /fetch\([^)]*(:8787|\/v1\/)/, `${file} calls the ARC API directly`);
    assert.doesNotMatch(text, /ARC_OPERATOR_TOKEN|MERIDIAN_EXECUTION_TOKEN|import\.meta\.env/, `${file} reads server secrets or build-time env`);
  }
});

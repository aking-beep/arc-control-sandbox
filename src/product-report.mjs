#!/usr/bin/env node
// Whole-product run: every suite against the running stack, then the coverage
// map. Writes reports/product-latest.json, plus reports/latest.json and
// reports/phase2-latest.json in their existing formats so the Validation Lab
// shows the same results. Exit code 1 when any implemented check fails, a
// stress run fails, the 17 do not re-pass, or ARC has a route nothing maps.
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { redact } from './redact.mjs';
import { summarize } from './phase2.mjs';
import { buildCoverage } from './coverage.mjs';

const execFileAsync = promisify(execFile);
const base = process.env.MERIDIAN_BASE || 'http://127.0.0.1:8890';
const arcRoot = resolve(process.env.ARC_REPO_PATH || '../arc-control');
const quick = process.argv.includes('--quick'); // one stress seed per preset

const revision = async (cwd) => {
  try { return (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd })).stdout.trim(); } catch { return null; }
};
const call = async (method, path, body) => {
  const response = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${payload.error || 'request failed'}`);
  return redact(payload);
};
const tally = rows => rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
const line = (status, id, error) => console.log(`${String(status).toUpperCase().padEnd(16)} ${id}${error ? ` — ${error}` : ''}`);

try {
  const health = await (await fetch(`${base}/api/health`)).json();
  if (!health.gatewayConfigured) throw new Error('Meridian is running without ARC gateway');
  const startedAt = new Date().toISOString();
  const revisions = { sandbox: await revision(process.cwd()), arcControl: await revision(arcRoot) };

  console.log('== Original 17 integration scenarios');
  const integration = await call('POST', '/api/scenarios/all');
  integration.forEach(r => line(r.pass ? 'pass' : 'fail', r.id, r.error));

  console.log('\n== Phase 2 security, reliability and evidence');
  const phase2 = await call('POST', '/api/phase2/all');
  phase2.scenarios.forEach(r => line(r.status, r.id, r.error));

  console.log('\n== Stress');
  const stress = [];
  for (const preset of ['100', '500', '1000']) {
    const run = await call('POST', '/api/stress', { preset, seeds: quick ? [1] : [1, 2, 3] });
    stress.push(run);
    console.log(`${run.pass ? 'PASS' : 'FAIL'}             preset ${preset}: ${run.runs.map(r => `seed ${r.seed} ${r.requestsPerSecond}/s p95=${r.p95Ms}ms refunds ${r.observedEffects}/${r.expectedEffects}`).join('; ')}`);
  }

  const { suites } = await call('GET', '/api/suites');
  const suiteResults = {};
  for (const suite of suites) {
    console.log(`\n== ${suite.name}${suite.industry ? ` (${suite.industry})` : ''}`);
    suiteResults[suite.id] = await call('POST', `/api/suites/${encodeURIComponent(suite.id)}/all`);
    suiteResults[suite.id].forEach(r => line(r.status, r.id, r.error));
  }

  console.log('\n== Original 17 recheck after every other suite');
  const recheck = await call('POST', '/api/scenarios/all');
  const recheckPassed = recheck.filter(r => r.pass === true).length;
  console.log(`${recheckPassed}/${recheck.length}`);

  const coverage = await buildCoverage(arcRoot, { integration: recheck, phase2: phase2.scenarios, ...suiteResults });
  console.log(`\n== Coverage: ${coverage.arcRoutes} ARC routes ${JSON.stringify(coverage.routeTotals)}; capabilities ${JSON.stringify(coverage.capabilityTotals)}`);
  if (coverage.unmapped.length) console.log(`UNMAPPED ARC ROUTES: ${coverage.unmapped.join(', ')}`);

  const integrationPassed = integration.filter(r => r.pass === true).length;
  const failures = [
    ...integration.filter(r => r.pass !== true).map(r => `integration:${r.id}`),
    ...phase2.scenarios.filter(r => r.status === 'fail').map(r => `phase2:${r.id}`),
    ...stress.filter(r => !r.pass).map(r => `stress:${r.preset}`),
    ...Object.entries(suiteResults).flatMap(([id, rows]) => rows.filter(r => r.status === 'fail').map(r => `${id}:${r.id}`)),
    ...(recheckPassed === recheck.length && recheck.length === 17 ? [] : ['integration:recheck']),
    ...coverage.unmapped.map(route => `coverage:${route}`)
  ];
  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt, startedAt, runner: 'arc-control-sandbox-product',
    disclaimer: 'Local synthetic observations against one ARC process. Not an enterprise certification, penetration test, or proof of production readiness.',
    revisions, node: process.version, health,
    pass: failures.length === 0, failures,
    suites: {
      integration: { total: integration.length, passed: integrationPassed, results: integration },
      phase2: { summary: phase2.summary, results: phase2.scenarios },
      stress,
      ...Object.fromEntries(Object.entries(suiteResults).map(([id, rows]) => [id, { totals: tally(rows), results: rows }])),
      recheck: { total: recheck.length, passed: recheckPassed }
    },
    coverage
  };

  await mkdir('reports', { recursive: true });
  const stamp = generatedAt.replaceAll(':', '-').replaceAll('.', '-');
  const write = (name, body) => writeFile(join('reports', name), JSON.stringify(body, null, 2) + '\n');
  await write(`product-${stamp}.json`, report);
  await write('product-latest.json', report);
  await write('latest.json', {
    generatedAt, runner: 'arc-control-sandbox-product', verification: 'independent test runner over local HTTP (not external security certification)',
    environment: { name: 'Meridian Commerce synthetic enterprise', mode: health.mode, gatewayConfigured: health.gatewayConfigured },
    total: integration.length, passed: integrationPassed, failed: integration.length - integrationPassed,
    passedAll: integration.length === 17 && integrationPassed === 17, results: integration
  });
  await write('phase2-latest.json', {
    generatedAt, runner: 'arc-control-sandbox-phase2', disclaimer: report.disclaimer, revisions, node: process.version,
    phase2: summarize(phase2.scenarios), scenarios: phase2.scenarios, stress,
    preservedIntegration: { total: recheck.length, passed: recheckPassed, failed: recheck.length - recheckPassed, pass: recheck.length === 17 && recheckPassed === 17 }
  });
  console.log(`\nSaved reports/product-${stamp}.json, product-latest.json, latest.json, phase2-latest.json`);
  console.log(failures.length ? `\nFAIL: ${failures.length} failing item(s): ${failures.join(', ')}` : '\nPASS: every implemented check passed; no unmapped ARC routes.');
  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error(`FAILED to complete the product run: ${error.message}`);
  process.exitCode = 1;
}

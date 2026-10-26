#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const base = process.env.MERIDIAN_BASE || 'http://127.0.0.1:8890';
try {
  const health = await fetch(`${base}/api/health`);
  if (!health.ok) throw new Error(`Meridian health HTTP ${health.status}`);
  const h = await health.json();
  if (!h.gatewayConfigured) throw new Error('Meridian is running without ARC gateway');
  const response = await fetch(`${base}/api/scenarios/all`, { method: 'POST' });
  if (!response.ok) throw new Error(`scenario suite HTTP ${response.status}`);
  const results = await response.json();
  if (!Array.isArray(results) || results.length !== 17) throw new Error(`expected exactly 17 scenario records; got ${Array.isArray(results) ? results.length : 'invalid response'}`);
  const report = {
    generatedAt: new Date().toISOString(),
    runner: 'arc-control-sandbox-starter',
    verification: 'independent test runner over local HTTP (not external security certification)',
    environment: { name: 'Meridian Commerce synthetic enterprise', mode: h.mode, gatewayConfigured: h.gatewayConfigured },
    total: results.length,
    passed: results.filter(c => c.pass === true).length,
    failed: results.filter(c => c.pass !== true).length,
    passedAll: results.length === 17 && results.every(c => c.pass === true),
    results
  };
  await mkdir('reports', { recursive: true });
  const stamp = report.generatedAt.replaceAll(':', '-').replaceAll('.', '-');
  const named = join('reports', `integration-${stamp}.json`);
  await writeFile(named, JSON.stringify(report, null, 2) + '\n');
  await writeFile(join('reports', 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  for (const result of results) console.log(`${result.pass === true ? 'PASS' : 'FAIL'} ${result.id}: ${result.pass ? (result.observed?.outcome || result.observed?.decision || result.expected) : result.error}`);
  console.log(`\n${report.passed}/${report.total} scenarios passed; saved ${named} and reports/latest.json`);
  if (!report.passedAll) process.exitCode = 1;
} catch (error) {
  console.error(`FAILED to validate integrated sandbox: ${error.message}`);
  process.exitCode = 1;
}

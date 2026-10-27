#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { redact } from './redact.mjs';

const execFileAsync = promisify(execFile);
const base = process.env.MERIDIAN_BASE || 'http://127.0.0.1:8890';
const arcRoot = process.env.ARC_REPO_PATH || '../arc-control';

const revision = async (cwd, fallback) => {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd });
    return stdout.trim();
  } catch {
    return process.env[fallback] || null;
  }
};

const post = async (path, body) => {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${payload.error || 'request failed'}`);
  return payload;
};

try {
  const health = await fetch(`${base}/api/health`);
  if (!health.ok) throw new Error(`Meridian health HTTP ${health.status}`);
  const gateway = await health.json();
  if (!gateway.gatewayConfigured) throw new Error('Meridian is running without ARC gateway');

  const phase2 = redact(await post('/api/phase2/all', {}));
  const stress = [];
  for (const preset of ['100', '500', '1000']) {
    stress.push(redact(await post('/api/stress', { preset, seeds: [1, 2, 3] })));
  }
  const integration = redact(await post('/api/scenarios/all', {}));
  const integrationPassed = integration.filter(item => item.pass === true).length;

  const report = {
    generatedAt: new Date().toISOString(),
    runner: 'arc-control-sandbox-phase2',
    disclaimer: 'Local synthetic observations. Not an enterprise certification, penetration test, or proof of production readiness.',
    revisions: {
      sandbox: await revision(process.cwd(), 'SANDBOX_REVISION'),
      arcControl: await revision(arcRoot, 'ARC_REVISION')
    },
    node: process.version,
    phase2: phase2.summary,
    scenarios: phase2.scenarios,
    stress,
    preservedIntegration: {
      total: integration.length,
      passed: integrationPassed,
      failed: integration.length - integrationPassed,
      pass: integration.length === 17 && integrationPassed === 17
    }
  };

  await mkdir('reports', { recursive: true });
  const stamp = report.generatedAt.replaceAll(':', '-').replaceAll('.', '-');
  const named = join('reports', `phase2-${stamp}.json`);
  const body = JSON.stringify(report, null, 2) + '\n';
  await writeFile(named, body);
  await writeFile(join('reports', 'phase2-latest.json'), body);

  console.log(`Phase 2: ${report.phase2.pass} pass, ${report.phase2.fail} fail, ${report.phase2.unsupported} unsupported, ${report.phase2.notImplemented} not implemented`);
  for (const scenario of report.scenarios) {
    const mark = scenario.status === 'pass' ? 'PASS' : scenario.status === 'fail' ? 'FAIL' : scenario.status.toUpperCase();
    console.log(`${mark.padEnd(16)} ${scenario.id}${scenario.error ? ` — ${scenario.error}` : ''}`);
  }
  for (const run of stress) {
    const rates = run.runs.map(item => `${item.seed}:${item.pass ? 'pass' : 'fail'} ${item.requestsPerSecond}/s p95=${item.p95Ms}ms mutations=${item.observedEffects}/${item.expectedEffects}`).join('; ');
    console.log(`STRESS ${String(run.preset).padEnd(4)} ${run.pass ? 'PASS' : 'FAIL'} ${rates}`);
  }
  console.log(`Integration scenarios preserved: ${integrationPassed}/${integration.length}`);
  console.log(`Saved ${named} and reports/phase2-latest.json`);
  if (report.phase2.fail > 0 || stress.some(item => !item.pass) || !report.preservedIntegration.pass) process.exitCode = 1;
} catch (error) {
  console.error(`FAILED to complete phase 2 report: ${error.message}`);
  process.exitCode = 1;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompany } from '../src/company.mjs';
import { createScenarios, stressPlan, STRESS_PRESETS } from '../src/scenarios.mjs';
import { createPhase2, summarize } from '../src/phase2.mjs';

test('fault endpoints stay behind the connector token and do not invent business effects', async () => {
  const company = createCompany({ executionToken: 'secret', getHarness: () => null, port: 0 });
  const address = await company.listen();
  const url = (path) => `http://127.0.0.1:${address.port}${path}`;
  try {
    const denied = await fetch(url('/internal/fault/http-500'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(denied.status, 403);
    const failed = await fetch(url('/internal/fault/http-500'), { method: 'POST', headers: { 'content-type': 'application/json', 'x-meridian-connector-token': 'secret' }, body: '{}' });
    assert.equal(failed.status, 500);
    assert.equal(company.faultEffects(), 0);
    assert.equal(company.state().mutationLog.length, 0);
    const redirect = await fetch(url('/internal/fault/redirect'), { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json', 'x-meridian-connector-token': 'secret' }, body: '{}' });
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get('location'), 'http://example.com/not-allowlisted');
    const slow = await fetch(url('/internal/fault/slow'), { method: 'POST', headers: { 'content-type': 'application/json', 'x-meridian-connector-token': 'secret' }, body: JSON.stringify({ delayMs: 20 }) });
    assert.equal(slow.status, 200);
    assert.equal(company.faultLog(), 3);
  } finally {
    await company.close();
  }
});

test('stress plans stay inside the preset and are stable for a seed', () => {
  assert.deepEqual(Object.keys(STRESS_PRESETS), ['100', '500', '1000']);
  assert.equal(STRESS_PRESETS['100'].concurrency, 5);
  assert.equal(STRESS_PRESETS['500'].concurrency, 10);
  assert.equal(STRESS_PRESETS['1000'].concurrency, 20);
  for (const preset of Object.values(STRESS_PRESETS)) {
    const plan = stressPlan(preset.count, 1);
    assert.equal(plan.executed + plan.pending + plan.denied, preset.count);
    assert.equal(plan.expectedEffects, plan.executed);
    assert.deepEqual(plan, stressPlan(preset.count, 1));
  }
  const original = stressPlan(4, null);
  assert.deepEqual(original, { count: 4, seed: null, executed: 2, pending: 1, denied: 1, expectedEffects: 2 });
});

test('the original integration catalogue stays at 17 and phase 2 is separate', () => {
  const integration = createScenarios({ company: { state: () => ({ mutationLog: [], faultEffects: [] }) }, seeded: {}, apiBase: 'http://127.0.0.1:9', operatorToken: 'token' });
  assert.equal(integration.list().length, 17);
  const phase2 = createPhase2({ company: { state: () => ({ mutationLog: [], faultLog: [], faultEffects: [] }), server: { address: () => ({ port: 0 }) } }, seeded: {}, apiBase: 'http://127.0.0.1:9', operatorToken: 'token', arcRoot: '../arc-control' });
  const catalogue = phase2.list();
  assert.equal(catalogue.filter(item => item.kind === 'implemented').length > 17, true);
  assert.ok(catalogue.some(item => item.kind === 'unsupported'));
  assert.ok(catalogue.some(item => item.kind === 'not_implemented'));
  const summary = summarize(catalogue.map(item => ({ ...item, status: item.kind === 'implemented' ? 'pass' : item.kind, disposition: item.kind === 'implemented' ? 'control_held' : item.kind })));
  assert.equal(summary.enterpriseReady, false);
  assert.equal(summary.fail, 0);
});

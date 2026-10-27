import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCompany } from '../src/company.mjs';
import { northwind, NORTHWIND_SCENARIOS } from '../src/packs/northwind.mjs';
import { PRODUCT_CATALOGUE } from '../src/product.mjs';
import { arcRoutes, buildCoverage, CAPABILITIES } from '../src/coverage.mjs';

const serve = async (options) => {
  const company = createCompany({ executionToken: 'secret', getHarness: () => null, port: 0, ...options });
  const { port } = await company.listen();
  return { company, url: (path) => `http://127.0.0.1:${port}${path}` };
};
const internal = (url, path, body) => fetch(url(path), { method: 'POST', headers: { 'content-type': 'application/json', 'x-meridian-connector-token': 'secret' }, body: JSON.stringify(body) });

test('pack effects go through the connector token, land in the shared mutation log, and reset', async () => {
  const { company, url } = await serve({ packs: [northwind] });
  try {
    const refused = await fetch(url('/internal/bank/payment'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ beneficiaryId: 'ben-301', amount: 100, currency: 'USD' }) });
    assert.equal(refused.status, 403);
    assert.equal(company.state().packs.northwind.payments.length, 0);
    const paid = await internal(url, '/internal/bank/payment', { beneficiaryId: 'ben-301', amount: 100, currency: 'USD' });
    assert.equal(paid.status, 200);
    assert.equal(company.state().packs.northwind.payments.length, 1);
    assert.equal(company.state().mutationLog.at(-1).tool, 'bank.payment');
    const unknown = await internal(url, '/internal/bank/payment', { beneficiaryId: 'nobody', amount: 100, currency: 'USD' });
    assert.equal(unknown.status, 400, 'a payment to an unknown beneficiary is not an effect');
    assert.equal(company.state().packs.northwind.payments.length, 1);
    await fetch(url('/api/reset'), { method: 'POST' });
    assert.equal(company.state().packs.northwind.payments.length, 0);
    assert.equal(company.state().mutationLog.length, 0);
  } finally {
    await company.close();
  }
});

test('suite routes need the harness, run through it, and keep the runs', async () => {
  const offline = await serve({});
  try {
    assert.equal((await fetch(offline.url('/api/suites/northwind'))).status, 503);
  } finally { await offline.company.close(); }
  const suite = { id: 'demo', name: 'Demo', kind: 'pack', list: () => [{ id: 'a', label: 'A', kind: 'implemented' }], run: async id => ({ id, status: 'pass', pass: true }), all: async () => [{ id: 'a', status: 'pass', pass: true }] };
  const { company, url } = await serve({ getHarness: () => ({ suites: { demo: suite } }) });
  try {
    const list = await (await fetch(url('/api/suites'))).json();
    assert.deepEqual(list.suites.map(s => [s.id, s.count]), [['demo', 1]]);
    assert.equal((await fetch(url('/api/suites/missing'))).status, 404);
    await fetch(url('/api/suites/demo/a'), { method: 'POST' });
    const detail = await (await fetch(url('/api/suites/demo'))).json();
    assert.equal(detail.runs.length, 1);
    assert.equal(detail.runs[0].status, 'pass');
  } finally { await company.close(); }
});

test('the webhook sink keeps the raw body and signature for verification', async () => {
  const { company, url } = await serve({});
  try {
    const res = await fetch(url('/hooks/arc'), { method: 'POST', headers: { 'content-type': 'application/json', 'x-arc-signature': 'sha256=abc' }, body: '{"event":"approval.requested"}' });
    assert.equal(res.status, 202);
    assert.deepEqual(company.hooks().map(h => [h.signature, h.raw]), [['sha256=abc', '{"event":"approval.requested"}']]);
  } finally { await company.close(); }
});

test('catalogues never count unsupported work as implemented', () => {
  for (const item of [...PRODUCT_CATALOGUE, ...NORTHWIND_SCENARIOS]) {
    assert.ok(['implemented', 'unsupported', 'not_implemented'].includes(item.kind), item.id);
    if (item.kind !== 'implemented') assert.ok(item.reason, `${item.id} needs a reason`);
  }
  for (const cap of CAPABILITIES) assert.ok(cap.status ? cap.reason : cap.checks.length, cap.id);
  assert.ok(PRODUCT_CATALOGUE.filter(item => item.kind === 'implemented').every(item => item.covers.length > 0), 'every product check declares the routes it covers');
});

const arcRoot = resolve(process.env.ARC_REPO_PATH || '../arc-control');
test('every ARC route is covered by a check or has a stated gap', { skip: !existsSync(`${arcRoot}/apps/control-api/src`) && 'ARC Control checkout not found' }, async () => {
  const routes = await arcRoutes(arcRoot);
  assert.ok(routes.length > 30, `only ${routes.length} routes parsed`);
  const coverage = await buildCoverage(arcRoot);
  assert.deepEqual(coverage.unmapped, [], `unmapped ARC routes: ${coverage.unmapped.join(', ')}`);
});

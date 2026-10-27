import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompany } from '../src/company.mjs';
import { rng, CUSTOMERS, EMPLOYEES, APPROVERS } from '../src/live/world.mjs';

const serve = async (options) => {
  const company = createCompany({ executionToken: 'secret', getHarness: () => null, port: 0, ...options });
  const { port } = await company.listen();
  return { company, url: (path) => `http://127.0.0.1:${port}${path}` };
};

test('the same seed gives the same day, a different seed a different one', () => {
  const draw = seed => { const r = rng(seed); return Array.from({ length: 20 }, () => r.next()); };
  assert.deepEqual(draw(7), draw(7));
  assert.notDeepEqual(draw(7), draw(8));
});

test('live fixtures keep the original records first, so the checks that address them by id are unaffected', async () => {
  const { company } = await serve({});
  try {
    company.extendBusiness({ customers: CUSTOMERS, employees: EMPLOYEES });
    company.extendBusiness({ customers: CUSTOMERS, employees: EMPLOYEES });
    const s = company.state();
    assert.deepEqual(s.customers.slice(0, 2).map(c => c.id), ['cus-101', 'cus-102']);
    assert.equal(s.customers.length, 2 + CUSTOMERS.length, 'extending twice adds nothing');
    assert.equal(s.employees[0].id, 'emp-201');
    assert.equal(s.tickets[0].id, 'T-1001');
    assert.equal(s.mutationLog.length, 0, 'fixtures are not business effects');
    company.addTicket({ id: 'T-2001', customerId: 'cus-103', status: 'open', subject: 'x' });
    assert.equal(company.state().mutationLog.length, 0, 'an inbound ticket is not an agent effect');
  } finally { await company.close(); }
});

test('no synthetic approver owns an agent, so separation of duties allows them', () => {
  for (const people of Object.values(APPROVERS)) for (const who of people) assert.doesNotMatch(who, /-agent@/);
});

test('every test run pauses live traffic first and resumes it after', async () => {
  const calls = [];
  const live = { quiesce: async () => { calls.push('quiesce'); }, release: () => { calls.push('release'); }, snapshot: () => ({}) };
  const harness = {
    live,
    scenarios: { run: async id => { calls.push(`run:${id}`); return { id, status: 'pass' }; }, all: async () => [], list: () => [] },
    phase2: { run: async id => { calls.push(`p2:${id}`); return { id }; }, all: async () => [], list: () => [] },
    suites: { demo: { id: 'demo', name: 'Demo', kind: 'pack', list: () => [], run: async id => { calls.push(`suite:${id}`); return { id }; }, all: async () => [] } }
  };
  const { company, url } = await serve({ getHarness: () => harness });
  try {
    await fetch(url('/api/scenarios/refund-allow'), { method: 'POST' });
    await fetch(url('/api/phase2/x'), { method: 'POST', body: '{}' });
    await fetch(url('/api/suites/demo/y'), { method: 'POST', body: '{}' });
    await fetch(url('/api/reset'), { method: 'POST' });
    assert.deepEqual(calls, [
      'quiesce', 'run:refund-allow', 'release',
      'quiesce', 'p2:x', 'release',
      'quiesce', 'suite:y', 'release',
      'quiesce', 'release'
    ]);
  } finally { await company.close(); }
});

test('a failing test run still resumes live traffic', async () => {
  let held = 0;
  const harness = {
    live: { quiesce: async () => { held += 1; }, release: () => { held -= 1; }, snapshot: () => ({}) },
    scenarios: { run: async () => { throw new Error('boom'); }, all: async () => [], list: () => [] }
  };
  const { company, url } = await serve({ getHarness: () => harness });
  try {
    assert.equal((await fetch(url('/api/scenarios/x'), { method: 'POST' })).status, 500);
    assert.equal(held, 0);
  } finally { await company.close(); }
});

test('/api/state sends the most recent rows of a long day with totals; ?full=1 sends everything', async () => {
  const { company, url } = await serve({});
  try {
    for (let i = 0; i < 320; i += 1) company.apply('finance.refund', { customer: 'cus-101', amount: 10 });
    const capped = await (await fetch(url('/api/state'))).json();
    assert.equal(capped.refunds.length, 300);
    assert.equal(capped.refunds.at(-1).id, 'ref-320');
    assert.equal(capped.totals.refunds, 320);
    assert.equal(capped.totals.mutationLog, 320);
    const full = await (await fetch(url('/api/state?full=1'))).json();
    assert.equal(full.refunds.length, 320);
  } finally { await company.close(); }
});

test('the live stream sends a snapshot, then each event, and closes with the server', async () => {
  const listeners = new Set();
  const live = { snapshot: () => ({ running: true, day: 1 }), subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); }, quiesce: async () => {}, release: () => {} };
  const { company, url } = await serve({ getHarness: () => ({ live }) });
  const res = await fetch(url('/api/live/stream'));
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const reader = res.body.getReader();
  let text = '';
  const read = async until => { while (!text.includes(until)) text += new TextDecoder().decode((await reader.read()).value); };
  await read('"day":1');
  for (const fn of listeners) fn({ seq: 1, kind: 'action', summary: 'Refund $10' });
  await read('Refund $10');
  assert.match(text, /^event: snapshot/);
  await company.close();
  assert.equal(listeners.size, 0, 'closing the server ends the stream and unsubscribes it');
});

test('live routes need the harness', async () => {
  const { company, url } = await serve({});
  try { assert.equal((await fetch(url('/api/live'))).status, 503); } finally { await company.close(); }
});

// A stand-in for ARC: every action is held for approval, every vote and release succeeds.
// Enough to drive the engine's scheduling without the real gateway.
const engineHarness = async () => {
  const { createLiveOps } = await import('../src/live/engine.mjs');
  const state = { customers: [], employees: [], tickets: [], mutationLog: [], packs: { northwind: { beneficiaries: [{ id: 'ben-301', name: 'A', country: 'DE' }] } } };
  const company = {
    view: () => state, mutationsSince: mark => state.mutationLog.slice(mark), port: () => 1,
    extendBusiness: ({ customers = [], employees = [] }) => { for (const c of customers) if (!state.customers.some(x => x.id === c.id)) state.customers.push(c); for (const e of employees) if (!state.employees.some(x => x.id === e.id)) state.employees.push(e); },
    addTicket: t => state.tickets.push(t), resetBusiness: () => { state.mutationLog.length = 0; }
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const body = String(url).includes('/vote') ? {} : String(url).includes('/execute') ? { outcome: 'executed', evidenceId: 'ev' } : { outcome: 'pending_approval', approvalId: `ap-${Math.random()}`, evidenceId: 'ev', decision: { effect: 'REQUIRE_APPROVAL' } };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const seeded = new Proxy({}, { get: () => ({ apiKey: 'k' }) });
  const live = createLiveOps({ company, seeded, apiBase: 'http://arc.invalid', operatorToken: 't', northwindPack: { id: 'northwind' } });
  return { live, restore: () => { globalThis.fetch = realFetch; } };
};

test('every story beat in a cycle runs, even when an approval falls due on its step', async () => {
  const { live, restore } = await engineHarness();
  try {
    live.start({ seed: 3 }); live.pause();
    for (let i = 0; i < 120; i += 1) await live.step();
    const beats = live.snapshot().events.filter(e => e.kind === 'story').map(e => e.summary);
    assert.deepEqual(beats.sort(), ['Compromised sales agent', 'Duplicate refund request', 'Hotfix straight to production', 'Malformed and out-of-role requests', 'Refund surge at month end', 'Request around ARC'].sort());
  } finally { live.stop(); restore(); }
});

test('a new day starts with an empty feed', async () => {
  const { live, restore } = await engineHarness();
  try {
    live.start({ seed: 3 }); live.pause();
    for (let i = 0; i < 10; i += 1) await live.step();
    assert.ok(live.snapshot().events.some(e => e.day === 1 && e.kind !== 'status'), 'day 1 has activity');
    const snap = await live.newDay({ seed: 4 });
    assert.equal(snap.day, 2);
    assert.deepEqual(snap.events.filter(e => e.day !== 2), [], 'no event from the previous day');
    assert.equal(snap.counts.actions, 0);
  } finally { live.stop(); restore(); }
});

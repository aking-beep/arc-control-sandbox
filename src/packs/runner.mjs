import { randomUUID } from 'node:crypto';
import { WIRE_WINDOW_UTC, VELOCITY } from './northwind.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Runs an industry pack's scenarios against the real ARC API.
 *
 * Same contract as scenarios.mjs and phase2.mjs: every pass is backed by ARC's
 * response AND the pack's own backend effect count; a failure keeps the first
 * failed assertion as its error. Unsupported entries never run and never pass.
 */
export function createPackRunner({ pack, catalogue, company, seeded, apiBase, operatorToken }) {
  const request = async (url, { method = 'GET', headers = {}, body } = {}) => {
    const started = performance.now();
    const res = await fetch(url, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const raw = await res.text();
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { text: raw }; }
    return { httpStatus: res.status, body: payload, latencyMs: Math.round(performance.now() - started) };
  };
  const op = (path, body, { identity = 'northwind-controller@northwind.example', roles = 'treasury-manager,compliance-officer' } = {}) => request(`${apiBase}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${operatorToken}`, 'x-arc-operator': identity, 'x-arc-operator-roles': roles, 'content-type': 'application/json' },
    body
  });
  const act = (agent, tool, parameters, extras = {}) => {
    const correlationId = `${pack.id}-${randomUUID()}`;
    return request(`${apiBase}/v1/actions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${seeded[agent].apiKey}`, 'content-type': 'application/json' },
      body: { tool, parameters, correlationId, ...extras }
    }).then(r => ({ ...r, correlationId }));
  };
  const count = tool => company.state().mutationLog.filter(entry => entry.tool === tool).length;
  const must = (condition, why) => { if (!condition) throw new Error(why); };
  const code = r => r.body?.error?.code || null;
  const observe = async r => {
    let evidencePresent = null;
    if (r.body?.evidenceId) evidencePresent = (await op(`/v1/evidence/${r.body.evidenceId}`)).httpStatus === 200;
    return {
      httpStatus: r.httpStatus, outcome: r.body?.outcome || null, decision: r.body?.decision?.effect || null,
      policyId: r.body?.decision?.policyId || null, ruleId: r.body?.decision?.ruleId || null,
      evidenceId: r.body?.evidenceId || null, evidencePresent, approvalId: r.body?.approvalId || null,
      correlationId: r.correlationId || null, latencyMs: r.latencyMs, error: code(r)
    };
  };
  const expectOutcome = async (r, outcome, effect, tool, before, delta) => {
    const seen = await observe(r);
    must(r.body?.outcome === outcome, `expected outcome ${outcome}, got ${r.body?.outcome || `HTTP ${r.httpStatus} ${code(r) || ''}`.trim()}`);
    must(seen.decision === effect, `expected ${effect}, got ${seen.decision}`);
    must(seen.evidencePresent === true, 'missing readable evidence record');
    must(count(tool) === before + delta, `expected ${delta} ${tool} effects; observed ${count(tool) - before}`);
    return seen;
  };
  const PAY = 'bank.payment';
  const pay = (agent, amount) => act(agent, PAY, { beneficiaryId: 'ben-301', amount, currency: 'USD' });
  const treasury = n => ({ identity: `treasury-${n}@northwind.example`, roles: 'treasury-manager' });
  const hold = async amount => {
    const before = count(PAY);
    const r = await pay('payments-agent', amount);
    await expectOutcome(r, 'pending_approval', 'REQUIRE_APPROVAL', PAY, before, 0);
    must(r.body?.approvalId, 'no approvalId returned');
    return { before, r, approvalId: r.body.approvalId };
  };

  let velocityLast = 0;
  const velocityWindowClear = async () => {
    const wait = velocityLast + VELOCITY.windowSeconds * 1000 + 750 - Date.now();
    if (wait > 0) await sleep(wait);
  };

  const cases = {
    async 'nwb-payment-allow'() {
      const before = count(PAY);
      return expectOutcome(await pay('payments-agent', 2500), 'executed', 'ALLOW', PAY, before, 1);
    },
    async 'nwb-payment-dual-hold'() {
      const { r } = await hold(40000);
      return observe(r);
    },
    async 'nwb-dual-one-vote-insufficient'() {
      const { before, approvalId } = await hold(40000);
      const vote = await op(`/v1/approvals/${approvalId}/vote`, { vote: 'approve' }, treasury(1));
      must(vote.httpStatus === 200, `first vote HTTP ${vote.httpStatus} ${code(vote) || ''}`);
      must(vote.body?.status === 'pending', `after one of two approvals status was ${vote.body?.status}`);
      const release = await op(`/v1/approvals/${approvalId}/execute`, {});
      must(release.httpStatus >= 400, `release with one approval returned HTTP ${release.httpStatus} ${release.body?.outcome || ''}`);
      must(count(PAY) === before, 'a payment executed with one approval of two');
      return { approvalId, statusAfterOneVote: vote.body.status, releaseStatus: release.httpStatus, releaseError: code(release) };
    },
    async 'nwb-dual-same-approver-twice'() {
      const { before, approvalId } = await hold(40000);
      const first = await op(`/v1/approvals/${approvalId}/vote`, { vote: 'approve' }, treasury(1));
      must(first.httpStatus === 200, `first vote HTTP ${first.httpStatus}`);
      const again = await op(`/v1/approvals/${approvalId}/vote`, { vote: 'approve' }, treasury(1));
      must(again.httpStatus === 409, `repeat vote by the same approver returned HTTP ${again.httpStatus}`);
      const state = await op(`/v1/approvals/${approvalId}`);
      must(state.body?.status === 'pending', `request status after a repeat vote was ${state.body?.status}`);
      must(count(PAY) === before, 'a repeat vote caused a payment');
      return { approvalId, repeatVoteStatus: again.httpStatus, repeatVoteError: code(again), status: state.body.status };
    },
    async 'nwb-dual-release-once'() {
      const { before, approvalId } = await hold(40000);
      for (const n of [1, 2]) {
        const vote = await op(`/v1/approvals/${approvalId}/vote`, { vote: 'approve' }, treasury(n));
        must(vote.httpStatus === 200, `vote ${n} HTTP ${vote.httpStatus} ${code(vote) || ''}`);
      }
      const release = await op(`/v1/approvals/${approvalId}/execute`, {});
      must(release.body?.outcome === 'executed', `release outcome ${release.body?.outcome || `HTTP ${release.httpStatus} ${code(release) || ''}`}`);
      const replay = await op(`/v1/approvals/${approvalId}/execute`, {});
      must(replay.httpStatus >= 400, `second release returned HTTP ${replay.httpStatus}`);
      must(count(PAY) === before + 1, `two approvals produced ${count(PAY) - before} payments, expected 1`);
      return { ...(await observe(release)), approvalId, replayStatus: replay.httpStatus, backendEffects: count(PAY) - before };
    },
    async 'nwb-owner-cannot-approve'() {
      const { before, approvalId } = await hold(40000);
      const vote = await op(`/v1/approvals/${approvalId}/vote`, { vote: 'approve' }, { identity: pack.owner('payments-agent'), roles: 'treasury-manager' });
      must(vote.httpStatus === 403, `owner vote returned HTTP ${vote.httpStatus} ${code(vote) || ''}`);
      must(count(PAY) === before, 'owner vote caused a payment');
      return { approvalId, ownerVoteStatus: vote.httpStatus, ownerVoteError: code(vote) };
    },
    async 'nwb-payment-over-ceiling'() {
      const before = count(PAY);
      return expectOutcome(await pay('payments-agent', 400000), 'denied', 'DENY', PAY, before, 0);
    },
    async 'nwb-wire-sanctioned'() {
      const tool = 'bank.wire_international', before = count(tool);
      const r = await act('payments-agent', tool, { beneficiaryId: 'ben-302', amount: 5000, country: 'KP' });
      const seen = await expectOutcome(r, 'denied', 'DENY', tool, before, 0);
      must(seen.ruleId === null || seen.ruleId === 'sanctioned-country', `denied by rule ${seen.ruleId}, expected sanctioned-country`);
      return seen;
    },
    async 'nwb-wire-cutoff'() {
      const tool = 'bank.wire_international';
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const hour = new Date().getUTCHours();
        const before = count(tool);
        const r = await act('payments-agent', tool, { beneficiaryId: 'ben-302', amount: 5000, country: 'SG' });
        if (new Date().getUTCHours() !== hour) continue; // crossed an hour boundary mid-request: retry
        const open = WIRE_WINDOW_UTC.includes(hour);
        const seen = await expectOutcome(r, open ? 'executed' : 'denied', open ? 'ALLOW' : 'DENY', tool, before, open ? 1 : 0);
        return { ...seen, hourUtc: hour, windowOpen: open };
      }
      throw new Error('clock crossed an hour boundary twice; rerun');
    },
    async 'nwb-beneficiary-review'() {
      const tool = 'bank.beneficiary_add', before = count(tool);
      const r = await act('onboarding-agent', tool, { name: 'Lisbon Paper Mills', country: 'PT', account: 'PT50-0000-0000' });
      return expectOutcome(r, 'pending_approval', 'REQUIRE_APPROVAL', tool, before, 0);
    },
    async 'nwb-reporting-cannot-pay'() {
      const before = count(PAY);
      const r = await pay('reporting-agent', 100);
      must(r.body?.outcome !== 'executed', 'reporting agent executed a payment');
      must(count(PAY) === before, 'reporting agent caused a payment');
      return observe(r);
    },
    async 'nwb-velocity-sequential'() {
      await velocityWindowClear();
      const before = count(PAY);
      const responses = [];
      for (let i = 0; i <= VELOCITY.maxIrreversibleActions; i += 1) responses.push(await pay('batch-payments-agent', 100));
      velocityLast = Date.now();
      const executed = responses.filter(r => r.body?.outcome === 'executed').length;
      const last = responses.at(-1);
      must(executed === VELOCITY.maxIrreversibleActions, `${executed} of ${responses.length} sequential payments executed; limit is ${VELOCITY.maxIrreversibleActions}`);
      must(code(last) === 'rate_limited', `request ${responses.length} returned HTTP ${last.httpStatus} ${code(last) || last.body?.outcome}`);
      must(count(PAY) === before + executed, `backend recorded ${count(PAY) - before} payments for ${executed} executed responses`);
      return { limit: VELOCITY.maxIrreversibleActions, windowSeconds: VELOCITY.windowSeconds, executed, refusedStatus: last.httpStatus, refusedCode: code(last), backendEffects: count(PAY) - before };
    },
    async 'nwb-velocity-concurrent'() {
      await velocityWindowClear();
      const before = count(PAY);
      const burst = VELOCITY.maxIrreversibleActions * 3;
      const responses = await Promise.all(Array.from({ length: burst }, () => pay('batch-payments-agent', 100)));
      velocityLast = Date.now();
      const executed = responses.filter(r => r.body?.outcome === 'executed').length;
      const effects = count(PAY) - before;
      must(effects <= VELOCITY.maxIrreversibleActions, `a concurrent burst of ${burst} produced ${effects} payments; limit is ${VELOCITY.maxIrreversibleActions}`);
      must(effects === executed, `${executed} executed responses but ${effects} backend payments`);
      return { burst, limit: VELOCITY.maxIrreversibleActions, executed, backendEffects: effects, refused: responses.filter(r => code(r) === 'rate_limited').length };
    }
  };

  const spec = id => catalogue.find(item => item.id === id);
  let lock = Promise.resolve();
  const runOne = id => {
    const exec = async () => {
      const s = spec(id);
      if (!s) return { id, status: 'fail', pass: false, error: 'unknown scenario' };
      if (s.kind !== 'implemented') return { ...s, status: s.kind, pass: null, implemented: false, detail: s.reason };
      const started = performance.now();
      try {
        const observed = await cases[id]();
        return { ...s, status: 'pass', pass: true, implemented: true, observed, elapsedMs: Math.round(performance.now() - started), at: new Date().toISOString() };
      } catch (error) {
        return { ...s, status: 'fail', pass: false, implemented: true, error: String(error.message), elapsedMs: Math.round(performance.now() - started), at: new Date().toISOString() };
      }
    };
    const next = lock.then(exec, exec);
    lock = next.then(() => {}, () => {});
    return next;
  };
  return {
    id: pack.id, name: pack.name, kind: 'pack', industry: pack.industry, description: pack.description,
    list: () => catalogue.map(item => ({ ...item })),
    run: runOne,
    all: async () => { const out = []; for (const s of catalogue) out.push(await runOne(s.id)); return out; }
  };
}

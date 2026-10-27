import { randomUUID } from 'node:crypto';
import {
  rng, CUSTOMERS, EMPLOYEES, SERVICES, FEATURE_BRANCHES, PROTECTED_BRANCHES, TICKET_SUBJECTS, TICKET_STATUSES,
  QUARANTINE_TARGETS, EXPORT_SCOPES, APPROVERS, BENEFICIARY_NAMES, WIRE_COUNTRIES, SANCTIONED_COUNTRIES
} from './world.mjs';
import { WIRE_WINDOW_UTC } from '../packs/northwind.mjs';

/**
 * Live operations: a scripted, seeded working day for Meridian's and
 * Northwind's agents, run through the real ARC API.
 *
 * - One action is in flight at a time, so every action is reconciled exactly:
 *   ARC's outcome against the outcome the policies predict, and Meridian's
 *   mutation log against the effect that outcome implies. A mismatch is an
 *   anomaly, kept with its correlation and evidence ids.
 * - A connector outcome ARC cannot confirm (`failed`, `unknown`) is reported as
 *   unknown, never as a business failure.
 * - It never changes shared ARC configuration (policies, agent status, tools),
 *   and it does not use batch-payments-agent, whose velocity window the
 *   Northwind checks measure.
 * - quiesce() stops it and waits for the action in flight, so test runs never
 *   interleave with live traffic. company.mjs calls it around every test run.
 * - The same seed produces the same sequence of requests and approver
 *   decisions. Only the wire cut-off depends on the real UTC clock, by design.
 */
export const LIVE_DEFAULTS = { seed: 1, rate: 20 };
const MAX_EVENTS = 400;
const STORY_CYCLE = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createLiveOps({ company, seeded, apiBase, operatorToken, northwindPack, now = () => new Date() }) {
  const listeners = new Set();
  const events = [];
  let seq = 0;
  let timer = null;
  let inflight = Promise.resolve();
  let held = 0;
  const status = { running: false, seed: LIVE_DEFAULTS.seed, rate: LIVE_DEFAULTS.rate, day: 0, tick: 0, startedAt: null, dayStartedAt: null, heldForTests: false };
  let counts, pending, anomalies, plan, storyQueue, replayCandidate;

  const newDay = seed => {
    status.seed = Number(seed) || LIVE_DEFAULTS.seed;
    status.day += 1;
    status.tick = 0;
    status.dayStartedAt = now().toISOString();
    counts = { actions: 0, executed: 0, pending_approval: 0, denied: 0, refused: 0, unknown: 0, approved: 0, rejected: 0, left_pending: 0, human: 0, inbound: 0, anomalies: 0 };
    pending = [];
    anomalies = [];
    plan = rng(status.seed);
    storyQueue = [];
    replayCandidate = null;
    events.length = 0;
  };
  newDay(LIVE_DEFAULTS.seed);
  status.day = 0;

  // ── transport ──────────────────────────────────────────────────────────
  const request = async (url, { method = 'GET', headers = {}, body } = {}) => {
    const res = await fetch(url, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const raw = await res.text();
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { text: raw }; }
    return { httpStatus: res.status, body: payload };
  };
  const act = (agent, tool, parameters, extras = {}) => {
    const correlationId = `live-${randomUUID()}`;
    return request(`${apiBase}/v1/actions`, {
      method: 'POST', headers: { authorization: `Bearer ${seeded[agent]?.apiKey}`, 'content-type': 'application/json' },
      body: { tool, parameters, correlationId, ...extras }
    }).then(r => ({ ...r, correlationId }));
  };
  const op = (path, body, identity, roles) => request(`${apiBase}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${operatorToken}`, 'x-arc-operator': identity, 'x-arc-operator-roles': roles, 'content-type': 'application/json' },
    body
  });

  // ── events ─────────────────────────────────────────────────────────────
  const emit = event => {
    const full = { seq: ++seq, at: now().toISOString(), day: status.day, tick: status.tick, ...event, counts: { ...counts } };
    events.push(full);
    if (events.length > MAX_EVENTS) events.shift();
    for (const send of listeners) { try { send(full); } catch { listeners.delete(send); } }
    return full;
  };
  const snapshot = () => ({
    ...status, counts: { ...counts }, pendingApprovals: pending.map(p => ({ approvalId: p.approvalId, tool: p.tool, agent: p.agent, department: p.department, summary: p.summary, decision: p.decision, dueTick: p.dueTick })),
    anomalies: anomalies.slice(-50), events: events.slice(-120)
  });
  const announce = () => emit({ kind: 'status', status: { ...status, counts: { ...counts } } });

  // ── business fixtures ──────────────────────────────────────────────────
  const ensureWorld = () => company.extendBusiness({
    customers: CUSTOMERS, employees: EMPLOYEES,
    packs: northwindPack ? { [northwindPack.id]: { beneficiaries: BENEFICIARY_NAMES.slice(0, 4).map(([name, country]) => ({ name, country })) } } : {}
  });
  // Read-only view of the live state: no copy per action on a long-running day.
  const st = () => company.view();
  const effectsSince = (mark, tool, parameters) => {
    const key = JSON.stringify(parameters);
    return company.mutationsSince(mark).filter(m => m.tool === tool && JSON.stringify(m.parameters) === key).length;
  };
  const markNow = () => st().mutationLog.length;
  const classify = r => {
    if (r.body?.outcome === 'executed' || r.body?.outcome === 'pending_approval' || r.body?.outcome === 'denied') return r.body.outcome;
    if (r.body?.outcome) return 'unknown';
    if (r.httpStatus >= 400 && r.httpStatus < 500) return 'refused';
    return 'unknown';
  };

  // ── the plan: what each agent does next ────────────────────────────────
  const openTickets = () => st().tickets.filter(t => t.status !== 'resolved' && t.id !== 'T-1001');
  const inboundTicket = () => {
    const ticket = { id: `T-${2000 + st().tickets.length}`, customerId: plan.pick(CUSTOMERS).id, status: 'open', subject: plan.pick(TICKET_SUBJECTS) };
    company.addTicket(ticket);
    counts.inbound += 1;
    emit({ kind: 'inbound', department: 'support', summary: `New ticket ${ticket.id} from ${CUSTOMERS.find(c => c.id === ticket.customerId)?.name}: ${ticket.subject}`, ok: true });
    return ticket;
  };
  const beneficiaries = () => st().packs?.northwind?.beneficiaries ?? [];
  const decide = (approveP, leaveP = 0.1) => plan.chance(leaveP) ? 'leave' : plan.chance(approveP) ? 'approve' : 'reject';

  const refund = () => {
    const band = plan.next();
    const amount = band < 0.7 ? plan.money(18, 480) : band < 0.93 ? plan.money(520, 2400) : plan.money(2700, 6200);
    const customer = plan.pick(CUSTOMERS);
    return { department: 'finance', agent: 'finance-agent', tool: 'finance.refund', parameters: { customer: customer.id, amount },
      expect: amount < 500 ? 'executed' : amount <= 2500 ? 'pending_approval' : 'denied',
      approval: { roles: 'finance-manager', votes: 1, decision: decide(0.75) }, summary: `Refund $${amount.toFixed(2)} to ${customer.name}` };
  };
  const routine = () => {
    const roll = plan.next();
    if (roll < 0.24) return refund();
    if (roll < 0.44) {
      if (openTickets().length < 3 || plan.chance(0.35)) inboundTicket();
      const ticket = plan.pick(openTickets());
      const next = plan.pick(TICKET_STATUSES);
      return { department: 'support', agent: 'support-agent', tool: 'support.ticket_update', parameters: { ticketId: ticket.id, status: next },
        expect: 'executed', summary: `Ticket ${ticket.id} → ${next}` };
    }
    if (roll < 0.56) {
      const branch = plan.chance(0.12) ? plan.pick(PROTECTED_BRANCHES) : plan.pick(FEATURE_BRANCHES);
      const service = plan.pick(SERVICES);
      return { department: 'it', agent: 'it-agent', tool: 'it.deploy', parameters: { service, branch },
        expect: PROTECTED_BRANCHES.includes(branch) ? 'denied' : 'executed', summary: `Deploy ${service} from ${branch}` };
    }
    if (roll < 0.61) {
      const scope = plan.pick(EXPORT_SCOPES);
      return { department: 'sales', agent: 'sales-agent', tool: 'sales.export_customers', parameters: { scope },
        expect: 'pending_approval', approval: { roles: 'security-manager', votes: 1, decision: decide(0.5) }, summary: `Export customers (${scope})` };
    }
    if (roll < 0.66) {
      const employee = plan.pick(EMPLOYEES);
      return { department: 'hr', agent: 'hr-agent', tool: 'hr.salary_read', parameters: { employeeId: employee.id },
        expect: 'pending_approval', approval: { roles: 'hr-manager', votes: 1, decision: decide(0.6) }, summary: `Read salary for ${employee.name}` };
    }
    if (roll < 0.71) {
      const [resource, reason] = plan.pick(QUARANTINE_TARGETS);
      return { department: 'security', agent: 'security-agent', tool: 'security.quarantine', parameters: { resource, reason },
        expect: 'pending_approval', approval: { roles: 'security-manager', votes: 1, decision: decide(0.85) }, summary: `Quarantine ${resource}` };
    }
    if (!northwindPack) return routine();
    if (roll < 0.86) {
      const band = plan.next();
      const amount = band < 0.8 ? plan.money(60, 9800) : band < 0.98 ? plan.money(12000, 240000) : plan.money(300000, 900000);
      const ben = plan.pick(beneficiaries());
      return { department: 'northwind', agent: 'payments-agent', tool: 'bank.payment', parameters: { beneficiaryId: ben.id, amount, currency: 'USD' },
        expect: amount <= 10000 ? 'executed' : amount <= 250000 ? 'pending_approval' : 'denied',
        approval: { roles: 'treasury-manager', votes: 2, decision: decide(0.8) }, summary: `Pay $${amount.toLocaleString('en-US')} to ${ben.name}` };
    }
    if (roll < 0.93) {
      const sanctioned = plan.chance(0.06);
      const country = sanctioned ? plan.pick(SANCTIONED_COUNTRIES) : plan.pick(WIRE_COUNTRIES);
      const amount = plan.chance(0.85) ? plan.money(2000, 48000) : plan.money(52000, 180000);
      const ben = plan.pick(beneficiaries());
      return { department: 'northwind', agent: 'payments-agent', tool: 'bank.wire_international', parameters: { beneficiaryId: ben.id, amount, country },
        expect: () => sanctioned || !WIRE_WINDOW_UTC.includes(now().getUTCHours()) ? 'denied' : amount <= 50000 ? 'executed' : 'pending_approval',
        approval: { roles: 'treasury-manager', votes: 1, decision: decide(0.7) }, summary: `Wire $${amount.toLocaleString('en-US')} to ${country}` };
    }
    if (roll < 0.97) {
      const [name, country] = plan.pick(BENEFICIARY_NAMES);
      const sanctioned = plan.chance(0.08);
      const account = `NW${plan.int(10000000, 99999999)}`;
      return { department: 'northwind', agent: 'onboarding-agent', tool: 'bank.beneficiary_add', parameters: { name, country: sanctioned ? plan.pick(SANCTIONED_COUNTRIES) : country, account },
        expect: sanctioned ? 'denied' : 'pending_approval', approval: { roles: 'compliance-officer', votes: 1, decision: decide(0.7) }, summary: `Add beneficiary ${name}` };
    }
    return { department: 'northwind', agent: 'reporting-agent', tool: 'bank.statement_read', parameters: { accountId: 'acc-9001' }, expect: 'executed', summary: 'Read statement acc-9001' };
  };

  // Story beats: short scripted sequences at fixed points in each cycle.
  const STORIES = {
    15: ['Refund surge at month end', () => Array.from({ length: 6 }, refund)],
    35: ['Compromised sales agent', () => [
      { department: 'sales', agent: 'sales-agent', tool: 'finance.refund', parameters: { customer: plan.pick(CUSTOMERS).id, amount: 950 }, expect: 'denied', summary: 'Sales agent tries to issue a refund' },
      { department: 'sales', agent: 'sales-agent', tool: 'crm.delete_all', parameters: { confirm: 'yes' }, expect: 'refused', summary: 'Sales agent calls an unregistered tool' },
      { department: 'sales', agent: 'sales-agent', tool: 'sales.export_customers', parameters: { scope: 'all' }, expect: 'pending_approval', approval: { roles: 'security-manager', votes: 1, decision: 'reject' }, summary: 'Sales agent requests a full export (security rejects)' }
    ]],
    55: ['Duplicate refund request', () => [{ replay: true }]],
    70: ['Hotfix straight to production', () => [
      { department: 'it', agent: 'it-agent', tool: 'it.deploy', parameters: { service: 'payments-gateway', branch: 'main' }, expect: 'denied', summary: 'Deploy payments-gateway from main' }
    ]],
    85: ['Request around ARC', () => [{ bypass: true }]],
    100: ['Malformed and out-of-role requests', () => [
      { department: 'finance', agent: 'finance-agent', tool: 'finance.refund', parameters: { customer: plan.pick(CUSTOMERS).id, amount: '1000' }, expect: 'refused', summary: 'Refund with a text amount' },
      ...(northwindPack ? [{ department: 'northwind', agent: 'reporting-agent', tool: 'bank.payment', parameters: { beneficiaryId: 'ben-301', amount: 400, currency: 'USD' }, expect: 'denied', summary: 'Reporting agent tries to pay' }] : []),
      ...(northwindPack ? [{ department: 'northwind', agent: 'payments-agent', tool: 'bank.wire_international', parameters: { beneficiaryId: 'ben-302', amount: 9000, country: 'IR' }, expect: 'denied', summary: 'Wire to a sanctioned country' }] : [])
    ]]
  };

  // ── running one step ───────────────────────────────────────────────────
  const anomaly = (event, why) => {
    counts.anomalies += 1;
    const row = { ...event, kind: 'anomaly', ok: false, why };
    anomalies.push(row);
    return emit(row);
  };
  const expected = a => typeof a.expect === 'function' ? a.expect() : a.expect;
  const effectFor = outcome => outcome === 'executed' ? 1 : 0;

  const runAction = async a => {
    const expect = expected(a);
    const mark = markNow();
    const r = await act(a.agent, a.tool, a.parameters, a.extras);
    const actual = classify(r);
    const effects = effectsSince(mark, a.tool, a.parameters);
    counts.actions += 1;
    counts[actual] = (counts[actual] || 0) + 1;
    const event = {
      kind: 'action', department: a.department, agent: a.agent, tool: a.tool, summary: a.summary, story: a.story || null,
      parameters: a.parameters, expected: expect, actual, httpStatus: r.httpStatus,
      decision: r.body?.decision?.effect || null, policyId: r.body?.decision?.policyId || null, ruleId: r.body?.decision?.ruleId || null,
      reason: r.body?.decision?.reason || r.body?.error?.message || null, error: r.body?.error?.code || null,
      effects: { expected: actual === 'unknown' ? null : effectFor(expect), observed: effects },
      evidenceId: r.body?.evidenceId || null, approvalId: r.body?.approvalId || null, correlationId: r.correlationId, ok: true
    };
    if (actual === 'unknown') return emit({ ...event, ok: null, why: 'ARC could not confirm the connector outcome; recorded as unknown, not as a business failure.' });
    if (actual !== expect) return anomaly(event, `expected ${expect}, ARC returned ${actual}`);
    if (effects !== effectFor(expect)) return anomaly(event, `${effects} business effect(s) recorded; ${effectFor(expect)} expected`);
    if (['executed', 'pending_approval', 'denied'].includes(actual) && !event.evidenceId) return anomaly(event, 'no evidence id returned');
    if (actual === 'pending_approval' && a.approval) {
      if (a.approval.decision === 'leave') counts.left_pending += 1;
      else pending.push({ ...a, approvalId: event.approvalId, decision: a.approval.decision, dueTick: status.tick + plan.int(3, 12) });
    }
    if (actual === 'executed' && a.tool === 'finance.refund' && !a.extras) replayCandidate = a;
    return emit(event);
  };

  const decideApproval = async p => {
    const people = APPROVERS[p.approval.roles] ?? [];
    const votes = p.decision === 'approve' ? p.approval.votes : 1;
    const base = { kind: 'approval', department: p.department, agent: p.agent, tool: p.tool, summary: p.summary, approvalId: p.approvalId, decision: p.decision };
    for (let i = 0; i < votes; i += 1) {
      const who = people[i % people.length];
      const v = await op(`/v1/approvals/${p.approvalId}/vote`, { vote: p.decision, comment: `Live operations day ${status.day}` }, who, p.approval.roles);
      if (v.httpStatus !== 200) {
        // Most often a person decided it first in the ARC console: not an anomaly.
        counts.human += 1;
        return emit({ ...base, ok: true, approver: who, summary: `${p.summary}: already decided (HTTP ${v.httpStatus} ${v.body?.error?.code || ''})`.trim(), human: true });
      }
    }
    const mark = markNow();
    const done = await op(`/v1/approvals/${p.approvalId}/execute`, {}, people[0], p.approval.roles);
    const effects = effectsSince(mark, p.tool, p.parameters);
    const outcome = classify(done);
    const event = { ...base, approvers: people.slice(0, votes), actual: outcome, effects: { expected: p.decision === 'approve' ? 1 : 0, observed: effects }, evidenceId: done.body?.evidenceId || null, ok: true };
    if (p.decision === 'approve') {
      counts.approved += 1;
      if (outcome === 'unknown') return emit({ ...event, ok: null, why: 'Release outcome not confirmed by the connector; recorded as unknown.' });
      if (outcome !== 'executed') return anomaly(event, `approved release returned ${outcome}`);
      if (effects !== 1) return anomaly(event, `approved release recorded ${effects} effects; 1 expected`);
      return emit(event);
    }
    counts.rejected += 1;
    if (outcome === 'executed' || effects !== 0) return anomaly(event, `rejected request still produced ${effects} effect(s)`);
    return emit({ ...event, summary: `${p.summary}: rejected, release refused` });
  };

  const replay = async () => {
    if (!replayCandidate) return null;
    const a = { ...replayCandidate, story: 'Duplicate refund request', summary: `${replayCandidate.summary} (sent twice, one idempotency key)` };
    const key = `live-${randomUUID()}`;
    const mark = markNow();
    const first = await act(a.agent, a.tool, a.parameters, { idempotencyKey: key });
    const second = await act(a.agent, a.tool, a.parameters, { idempotencyKey: key });
    const effects = effectsSince(mark, a.tool, a.parameters);
    counts.actions += 2;
    counts.executed += 2;
    const event = { kind: 'action', department: a.department, agent: a.agent, tool: a.tool, summary: a.summary, story: a.story, parameters: a.parameters,
      expected: 'executed once', actual: `${classify(first)} + ${classify(second)}`, effects: { expected: 1, observed: effects },
      evidenceId: second.body?.evidenceId || null, correlationId: second.correlationId, ok: true };
    if (classify(first) !== 'executed' || classify(second) !== 'executed') return anomaly(event, 'replayed request did not return executed');
    if (effects !== 1) return anomaly(event, `idempotent pair produced ${effects} refunds`);
    return emit(event);
  };

  const bypass = async () => {
    const parameters = { customer: plan.pick(CUSTOMERS).id, amount: 75 };
    const mark = markNow();
    const r = await request(`http://127.0.0.1:${company.port()}/internal/finance/refund`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: parameters });
    const effects = effectsSince(mark, 'finance.refund', parameters);
    counts.actions += 1;
    counts.refused += 1;
    const event = { kind: 'action', department: 'finance', agent: 'unknown caller', tool: 'finance.refund', story: 'Request around ARC',
      summary: 'Direct call to Meridian, skipping ARC', parameters, expected: 'refused', actual: r.httpStatus === 403 ? 'refused' : `HTTP ${r.httpStatus}`,
      httpStatus: r.httpStatus, effects: { expected: 0, observed: effects }, ok: true };
    if (r.httpStatus !== 403 || effects !== 0) return anomaly(event, 'Meridian accepted a request that did not come through ARC');
    return emit(event);
  };

  const step = async () => {
    // A hosted Lab runs around the clock: each day starts fresh, so the
    // business records (and memory) do not grow without bound.
    if (status.dayStartedAt && now() - new Date(status.dayStartedAt) > DAY_MS) {
      // Inside the engine's own step, so no test can be running: reset directly.
      company.resetBusiness();
      newDay(status.seed + 1);
      emit({ kind: 'story', summary: `Day ${status.day} begins (seed ${status.seed})`, ok: true });
    }
    status.tick += 1;
    ensureWorld();
    // Queue the story beat first: a step spent on a due approval must not skip it.
    const beat = STORIES[status.tick % STORY_CYCLE];
    if (beat) {
      emit({ kind: 'story', summary: beat[0], ok: true });
      storyQueue.push(...beat[1]().map(a => ({ ...a, story: beat[0] })));
    }
    const due = pending.findIndex(p => p.dueTick <= status.tick);
    if (due >= 0) return decideApproval(pending.splice(due, 1)[0]);
    const next = storyQueue.shift() ?? routine();
    if (next.replay) return replay();
    if (next.bypass) return bypass();
    return runAction(next);
  };

  const loop = () => {
    timer = setTimeout(() => {
      if (!status.running || held) return loop();
      inflight = step().catch(e => emit({ kind: 'error', summary: `Live step failed: ${e.message}`, ok: null })).finally(loop);
    }, Math.max(250, Math.round(60000 / status.rate)));
  };

  return {
    snapshot,
    subscribe: send => { listeners.add(send); return () => listeners.delete(send); },
    start({ seed, rate } = {}) {
      if (rate) status.rate = Math.min(240, Math.max(1, Number(rate) || LIVE_DEFAULTS.rate));
      if (status.day === 0 || seed !== undefined) newDay(seed ?? status.seed);
      if (!status.running) {
        status.running = true;
        status.startedAt = status.startedAt || now().toISOString();
        ensureWorld();
        if (!timer) loop();
      }
      announce();
      return snapshot();
    },
    pause() { status.running = false; announce(); return snapshot(); },
    async newDay({ seed } = {}) {
      await inflight;
      newDay(seed ?? status.seed);
      announce();
      return snapshot();
    },
    /** Stop issuing actions and wait for the one in flight. Nested calls are counted. */
    async quiesce() {
      held += 1;
      status.heldForTests = true;
      announce();
      await inflight;
    },
    release() {
      held = Math.max(0, held - 1);
      if (!held) { status.heldForTests = false; announce(); }
    },
    stop() { status.running = false; clearTimeout(timer); timer = null; },
    /** For tests: run steps directly without the timer. */
    step
  };
}

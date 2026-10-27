import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Product-surface checks: the parts of ARC Control that the 17 integration
 * scenarios and Phase 2 do not reach (explain, decisions, simulate, history,
 * connector kill switch, credential inventory, approval queue, evidence
 * bundles, assurance catalogue and attestations, findings and risks, time
 * conditions).
 *
 * `covers` lists the ARC routes each check calls. coverage.mjs reads it to
 * build the product coverage map, so it must stay truthful.
 */
export const PRODUCT_CATALOGUE = [
  { id: 'health-enforcement-separate', label: 'Enforcement health is reported apart from assurance', family: 'operations', kind: 'implemented', covers: ['GET /health', 'GET /health/enforcement', 'GET /health/ready'] },
  { id: 'explain-does-not-execute', label: 'Explain returns the decision without executing', family: 'authorization', kind: 'implemented', covers: ['POST /v1/actions/explain'] },
  { id: 'decision-record-readable', label: 'Evidence keeps the caller’s correlation id and links its decision', family: 'evidence', kind: 'implemented', covers: ['GET /v1/decisions/:id', 'GET /v1/evidence/:id'] },
  { id: 'evidence-list-filters', label: 'Evidence can be listed per agent and outcome', family: 'evidence', kind: 'implemented', covers: ['GET /v1/evidence'] },
  { id: 'audit-read-paged', label: 'Audit log reads are bounded and ordered', family: 'evidence', kind: 'implemented', covers: ['GET /v1/audit'] },
  { id: 'connector-kill-switch', label: 'Disabling a connector stops every tool on it', family: 'kill-switch', kind: 'implemented', covers: ['POST /v1/connectors/:name/disable', 'POST /v1/connectors/:name/enable'] },
  { id: 'credential-inventory-no-secrets', label: 'Credential inventory never returns key material', family: 'identity', kind: 'implemented', covers: ['GET /v1/credentials', 'GET /v1/agents', 'GET /v1/agents/:id'] },
  { id: 'governance-record-update', label: 'Agent governance record can be set and read back', family: 'governance', kind: 'implemented', covers: ['POST /v1/agents/:id/governance'] },
  { id: 'approval-queue-lists-pending', label: 'A held action appears in the approval queue', family: 'approvals', kind: 'implemented', covers: ['GET /v1/approvals', 'GET /v1/approvals/:id'] },
  { id: 'policy-history-versions', label: 'Policy history keeps every published version', family: 'policy', kind: 'implemented', covers: ['GET /v1/policies/:id/history', 'POST /v1/policies/:id/enable', 'GET /v1/policies'] },
  { id: 'policy-simulate-no-effect', label: 'Simulating a candidate policy changes nothing', family: 'policy', kind: 'implemented', covers: ['POST /v1/policies/simulate'] },
  { id: 'time-window-condition', label: 'Time-of-day conditions decide by the UTC clock', family: 'policy', kind: 'implemented', covers: ['POST /v1/actions/explain', 'POST /v1/policies'] },
  { id: 'evidence-bundle-export', label: 'An evidence bundle exports with a content digest', family: 'evidence', kind: 'implemented', covers: ['POST /v1/evidence/bundles'] },
  { id: 'assurance-catalogue-readable', label: 'Assurance controls, coverage and frameworks are readable', family: 'governance', kind: 'implemented', covers: ['GET /v1/assurance/controls', 'GET /v1/assurance/controls/:id', 'GET /v1/assurance/coverage', 'GET /v1/assurance/frameworks', 'GET /v1/assurance/frameworks/:id', 'GET /v1/assurance/runs', 'GET /v1/assurance/runs/:id', 'GET /v1/assurance/assessments/:id'] },
  { id: 'assurance-attestation-distinct', label: 'An attestation is reported as attested, never as pass', family: 'governance', kind: 'implemented', covers: ['POST /v1/assurance/controls/:id/attest', 'POST /v1/assurance/runs'] },
  { id: 'findings-risks-readable', label: 'Assurance findings and risks are readable', family: 'governance', kind: 'implemented', covers: ['GET /v1/findings', 'GET /v1/findings/:id', 'GET /v1/risks', 'GET /v1/risks/:id'] },
  { id: 'retired-agent-resume-refused', label: 'Resume cannot bring back a retired agent', family: 'identity', kind: 'implemented', covers: ['POST /v1/agents/:id/resume', 'POST /v1/agents/:id/retire'] },
  { id: 'whoami-attribution', label: 'Who-am-I reports how the operator was identified', family: 'identity', kind: 'implemented', covers: ['GET /v1/whoami'] },
  { id: 'notification-webhook-signed', label: 'An approval request is delivered as a signed webhook without parameters', family: 'operations', kind: 'implemented', covers: ['POST /v1/notifications/channels', 'GET /v1/notifications', 'POST /v1/notifications/channels/:id/disable', 'POST /v1/notifications/channels/:id/enable'] },
  { id: 'scheduler-run', label: 'A scheduler tick runs on demand', family: 'operations', kind: 'implemented', covers: ['POST /v1/scheduler/run'] },
  { id: 'risk-lifecycle', label: 'A risk can be assessed, linked to controls and accepted', family: 'governance', kind: 'implemented', covers: ['POST /v1/risks', 'POST /v1/risks/:id/residual', 'POST /v1/risks/:id/controls', 'POST /v1/risks/:id/accept', 'GET /v1/risks/:id'] },
  { id: 'disabled-control-not-passed', label: 'A disabled assurance control is never reported as passing', family: 'governance', kind: 'implemented', covers: ['POST /v1/assurance/controls/:id/disable', 'POST /v1/assurance/controls/:id/enable', 'GET /v1/assurance/controls/:id'] },
  { id: 'cumulative-amount-limit', label: 'Cap the total amount an agent moves per day', family: 'policy', kind: 'unsupported', covers: [],
    reason: 'Policy conditions see one request at a time and the rate limiter counts actions, not amounts.' },
  { id: 'approval-delegation', label: 'Delegate approval authority for a bounded period', family: 'approvals', kind: 'unsupported', covers: [],
    reason: 'Approver selectors are *, owner, role: and user:. There is no delegation with a start, end and delegator.' }
];

export function createProduct({ company, seeded, apiBase, operatorToken, webhookSigningSecret, hookUrl }) {
  const request = async (url, { method = 'GET', headers = {}, body } = {}) => {
    const res = await fetch(url, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const raw = await res.text();
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { text: raw }; }
    return { httpStatus: res.status, body: payload };
  };
  const op = (path, body, method) => request(`${apiBase}${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { authorization: `Bearer ${operatorToken}`, 'x-arc-operator': 'meridian-controller@example.com', 'x-arc-operator-roles': 'finance-manager,security-manager,hr-manager', 'content-type': 'application/json' },
    body
  });
  const act = (agent, tool, parameters) => request(`${apiBase}/v1/actions`, {
    method: 'POST', headers: { authorization: `Bearer ${seeded[agent].apiKey}`, 'content-type': 'application/json' },
    body: { tool, parameters, correlationId: `product-${randomUUID()}` }
  });
  const explain = (agent, tool, parameters) => request(`${apiBase}/v1/actions/explain`, {
    method: 'POST', headers: { authorization: `Bearer ${seeded[agent].apiKey}`, 'content-type': 'application/json' },
    body: { tool, parameters }
  });
  const effects = () => company.state().mutationLog.length;
  const count = tool => company.state().mutationLog.filter(entry => entry.tool === tool).length;
  const must = (condition, why) => { if (!condition) throw new Error(why); };
  const ok = (r, what) => must(r.httpStatus === 200 || r.httpStatus === 201, `${what} returned HTTP ${r.httpStatus} ${r.body?.error?.code || ''}`.trim());
  const refund = amount => ({ customer: 'cus-101', amount });
  const SECRET_KEYS = /apiKey|keyHash|hash|salt|secret|token/i;
  const leaks = (value, path = '$') => {
    if (Array.isArray(value)) return value.flatMap((item, i) => leaks(item, `${path}[${i}]`));
    if (!value || typeof value !== 'object') return [];
    return Object.entries(value).flatMap(([key, item]) => [...(SECRET_KEYS.test(key) ? [`${path}.${key}`] : []), ...leaks(item, `${path}.${key}`)]);
  };
  const publish = async policy => {
    const current = await op(`/v1/policies/${policy.id}`);
    const version = current.httpStatus === 200 ? Number(current.body.version) + 1 : 1;
    const stored = await op('/v1/policies', { ...policy, version, enabled: true });
    ok(stored, `publish ${policy.id}`);
    return stored.body;
  };

  const cases = {
    async 'health-enforcement-separate'() {
      const health = await request(`${apiBase}/health`);
      const enforcement = await request(`${apiBase}/health/enforcement`);
      const ready = await request(`${apiBase}/health/ready`);
      ok(health, 'GET /health');
      must(health.body?.enforcement && health.body?.assurance, 'health does not report enforcement and assurance separately');
      must(health.body.assurance.enforcementDependsOnAssurance === false, 'health claims enforcement depends on assurance');
      must(enforcement.body?.failureMode === 'closed', `enforcement failure mode is ${enforcement.body?.failureMode}`);
      must(!('assurance' in enforcement.body), 'enforcement health includes assurance');
      // Contract: 200 only when every connector is healthy, 503 naming the unhealthy ones otherwise.
      const unhealthy = (enforcement.body.connectors || []).filter(c => c.healthy === false).map(c => c.name);
      must(enforcement.httpStatus === (unhealthy.length ? 503 : 200), `enforcement HTTP ${enforcement.httpStatus} with ${unhealthy.length} unhealthy connector(s)`);
      must(unhealthy.includes('meridian-http') === false, 'the Meridian connector is unhealthy');
      must(ready.httpStatus === 200 || ready.httpStatus === 503, `GET /health/ready returned HTTP ${ready.httpStatus}`);
      return { status: health.body.status, enforcementStatus: enforcement.httpStatus, unhealthyConnectors: unhealthy, ready: ready.body?.status ?? ready.httpStatus, rateLimiting: health.body.enforcement.rateLimiting, failureMode: enforcement.body.failureMode };
    },
    async 'explain-does-not-execute'() {
      const before = effects();
      const allow = await explain('finance-agent', 'finance.refund', refund(120));
      const deny = await explain('finance-agent', 'finance.refund', refund(4200));
      ok(allow, 'explain $120'); ok(deny, 'explain $4,200');
      must(allow.body.effect === 'ALLOW' && allow.body.ruleId === 'under-500', `explain $120 → ${allow.body.effect}/${allow.body.ruleId}`);
      must(deny.body.effect === 'DENY' && deny.body.ruleId === 'over-ceiling', `explain $4,200 → ${deny.body.effect}/${deny.body.ruleId}`);
      must(effects() === before, `explain produced ${effects() - before} backend effects`);
      return { allow: { effect: allow.body.effect, policyId: allow.body.policyId, ruleId: allow.body.ruleId }, deny: { effect: deny.body.effect, ruleId: deny.body.ruleId }, backendEffects: 0 };
    },
    async 'decision-record-readable'() {
      const correlationId = `product-${randomUUID()}`;
      const r = await request(`${apiBase}/v1/actions`, {
        method: 'POST', headers: { authorization: `Bearer ${seeded['finance-agent'].apiKey}`, 'content-type': 'application/json' },
        body: { tool: 'finance.refund', parameters: refund(4200), correlationId }
      });
      must(r.body?.evidenceId, 'denied action carried no evidence id');
      const evidence = await op(`/v1/evidence/${r.body.evidenceId}`);
      ok(evidence, 'GET /v1/evidence/:id');
      must(evidence.body?.request?.correlationId === correlationId, `evidence correlation id ${evidence.body?.request?.correlationId} does not match the one sent`);
      const id = evidence.body?.decision?.id;
      must(id, 'evidence record carries no decision id');
      const decision = await op(`/v1/decisions/${encodeURIComponent(id)}`);
      ok(decision, 'GET /v1/decisions/:id');
      must(decision.body.effect === 'DENY' && decision.body.ruleId === 'over-ceiling', `decision record ${decision.body.effect}/${decision.body.ruleId}`);
      const missing = await op('/v1/decisions/arc_dec_does_not_exist');
      must(missing.httpStatus === 404, `unknown decision returned HTTP ${missing.httpStatus}`);
      return { decisionId: id, correlationId, correlationPreserved: true, effect: decision.body.effect, unknownStatus: missing.httpStatus };
    },
    async 'evidence-list-filters'() {
      const r = await act('finance-agent', 'finance.refund', refund(4200));
      must(r.body?.evidenceId, 'denied action carried no evidence id');
      const agentId = seeded['finance-agent'].id;
      const listed = await op(`/v1/evidence?agentId=${encodeURIComponent(agentId)}&outcome=denied&limit=50`);
      ok(listed, 'GET /v1/evidence');
      const rows = listed.body?.evidence || [];
      must(rows.some(row => row.id === r.body.evidenceId), 'the new evidence record is not in the filtered list');
      const stray = rows.filter(row => (row.agent?.id ?? row.agentId) !== agentId || row.outcome !== 'denied');
      must(stray.length === 0, `${stray.length} records in the filtered list do not match agent/outcome`);
      return { listed: rows.length, evidenceId: r.body.evidenceId };
    },
    async 'audit-read-paged'() {
      const page = await op('/v1/audit?limit=5');
      ok(page, 'GET /v1/audit');
      const records = page.body?.records || [];
      must(records.length <= 5, `limit=5 returned ${records.length} records`);
      must(Number(page.body.total) >= records.length, 'audit total is smaller than the page');
      const seq = records.map(record => record.sequence).filter(n => typeof n === 'number');
      must(seq.every((n, i) => i === 0 || n < seq[i - 1]), 'default audit order is not newest first');
      return { returned: records.length, total: page.body.total };
    },
    async 'connector-kill-switch'() {
      const before = count('finance.refund');
      const off = await op('/v1/connectors/meridian-http/disable', { reason: 'product-surface kill switch check' });
      try {
        ok(off, 'connector disable');
        must(Array.isArray(off.body?.disabled) && off.body.disabled.includes('finance.refund'), 'connector disable did not list finance.refund');
        const blocked = await act('finance-agent', 'finance.refund', refund(120));
        must(blocked.body?.outcome !== 'executed', 'a refund executed while its connector was disabled');
        must(count('finance.refund') === before, 'connector kill switch let a refund through');
        const on = await op('/v1/connectors/meridian-http/enable', {});
        ok(on, 'connector enable');
        const resumed = await act('finance-agent', 'finance.refund', refund(120));
        must(resumed.body?.outcome === 'executed', `refund after re-enable was ${resumed.body?.outcome || resumed.httpStatus}`);
        must(count('finance.refund') === before + 1, 'refund after re-enable did not execute exactly once');
        return { disabledTools: off.body.disabled.length, blockedStatus: blocked.httpStatus, blockedCode: blocked.body?.error?.code || blocked.body?.outcome, resumed: resumed.body.outcome };
      } finally {
        await op('/v1/connectors/meridian-http/enable', {});
      }
    },
    async 'credential-inventory-no-secrets'() {
      const inventory = await op('/v1/credentials');
      const agents = await op('/v1/agents');
      const one = await op(`/v1/agents/${seeded['finance-agent'].id}`);
      ok(inventory, 'GET /v1/credentials'); ok(agents, 'GET /v1/agents'); ok(one, 'GET /v1/agents/:id');
      const exposed = [...leaks(inventory.body, 'credentials'), ...leaks(agents.body, 'agents'), ...leaks(one.body, 'agent')];
      must(exposed.length === 0, `key material exposed at ${exposed.slice(0, 5).join(', ')}`);
      const keys = Object.values(seeded).map(item => item?.apiKey).filter(Boolean);
      const text = JSON.stringify([inventory.body, agents.body, one.body]);
      must(!keys.some(key => text.includes(key)), 'a live API key appears in an inventory response');
      return { credentials: (inventory.body.credentials || []).length, agents: (agents.body.agents || []).length };
    },
    async 'governance-record-update'() {
      const created = await op('/v1/agents', { name: `p3-gov-${randomUUID().slice(0, 8)}`, owner: 'owner@meridian.example', roles: ['ops'] });
      must(created.httpStatus === 201, `register agent HTTP ${created.httpStatus}`);
      const bad = await op(`/v1/agents/${created.body.id}/governance`, { purpose: 'x', criticality: 'urgent' });
      must(bad.httpStatus === 400, `invalid criticality returned HTTP ${bad.httpStatus}`);
      const set = await op(`/v1/agents/${created.body.id}/governance`, { purpose: 'Reconcile synthetic ledgers', criticality: 'medium', department: 'finance', dataClassification: ['synthetic'] });
      ok(set, 'set governance');
      const read = await op(`/v1/agents/${created.body.id}`);
      must(read.body?.governance?.purpose === 'Reconcile synthetic ledgers' && read.body.governance.criticality === 'medium', 'governance did not read back');
      return { agentId: created.body.id, invalidStatus: bad.httpStatus, governance: read.body.governance };
    },
    async 'approval-queue-lists-pending'() {
      const before = count('finance.refund');
      const held = await act('finance-agent', 'finance.refund', refund(1600));
      must(held.body?.outcome === 'pending_approval' && held.body.approvalId, `expected a held refund, got ${held.body?.outcome || held.httpStatus}`);
      const queue = await op('/v1/approvals');
      ok(queue, 'GET /v1/approvals');
      must((queue.body?.approvals || []).some(item => item.id === held.body.approvalId), 'held action is missing from the approval queue');
      const one = await op(`/v1/approvals/${held.body.approvalId}`);
      must(one.body?.status === 'pending', `approval status ${one.body?.status}`);
      must(count('finance.refund') === before, 'a held refund executed');
      return { approvalId: held.body.approvalId, queueLength: queue.body.approvals.length, status: one.body.status };
    },
    async 'policy-history-versions'() {
      const id = `MER-P3-HIST-${randomUUID().slice(0, 6)}`;
      const base = { id, name: 'Product check history probe', match: { tools: ['it.deploy'] }, rules: [{ id: 'allow', when: { always: true }, effect: 'ALLOW', reason: 'probe' }], fallback: { effect: 'DENY', reason: 'probe' } };
      await publish(base);
      await publish({ ...base, name: 'Product check history probe v2' });
      try {
        const history = await op(`/v1/policies/${id}/history`);
        ok(history, 'GET /v1/policies/:id/history');
        const versions = (history.body?.versions || []).map(item => item.version);
        must(versions.includes(1) && versions.includes(2), `history versions were ${versions.join(',')}`);
        const off = await op(`/v1/policies/${id}/disable`, {});
        const on = await op(`/v1/policies/${id}/enable`, {});
        ok(off, 'disable'); ok(on, 'enable');
        const listed = await op('/v1/policies');
        must((listed.body?.policies || []).some(item => item.id === id && item.enabled === true), 'policy list does not show the re-enabled policy');
        return { policyId: id, versions };
      } finally {
        await op(`/v1/policies/${id}/disable`, {});
      }
    },
    async 'policy-simulate-no-effect'() {
      const before = effects();
      const policiesBefore = (await op('/v1/policies')).body?.policies?.length;
      const candidate = { id: 'MER-P3-SIM', version: 1, name: 'Simulated refund freeze', enabled: true, match: { tools: ['finance.refund'] }, rules: [{ id: 'freeze', when: { always: true }, effect: 'DENY', reason: 'simulated freeze' }], fallback: { effect: 'DENY', reason: 'simulated' } };
      const sim = await op('/v1/policies/simulate', { candidate, subject: { agentName: 'finance-agent', tool: 'finance.refund', parameters: refund(120) } });
      ok(sim, 'POST /v1/policies/simulate');
      const text = JSON.stringify(sim.body);
      must(/DENY/.test(text), 'simulation of an always-deny candidate did not report DENY');
      const stored = await op('/v1/policies/MER-P3-SIM');
      must(stored.httpStatus === 404, `simulate stored the candidate (HTTP ${stored.httpStatus})`);
      must((await op('/v1/policies')).body?.policies?.length === policiesBefore, 'policy count changed after a simulation');
      must(effects() === before, 'simulation produced backend effects');
      const live = await explain('finance-agent', 'finance.refund', refund(120));
      must(live.body?.effect === 'ALLOW', `live decision after simulation is ${live.body?.effect}`);
      return { simulated: sim.body, liveEffect: live.body.effect };
    },
    async 'time-window-condition'() {
      const id = 'MER-P3-HOUR';
      const tryOnce = async () => {
        const hour = new Date().getUTCHours();
        const others = Array.from({ length: 24 }, (_, h) => h).filter(h => h !== hour);
        const rule = hours => ({ id, name: 'Product check hour-of-day freeze', match: { tools: ['finance.refund'] }, rules: [{ id: 'frozen-hour', when: { in: ['$.context.hourUtc', hours] }, effect: 'DENY', reason: 'refunds frozen this hour' }], fallback: { effect: 'ALLOW', reason: 'outside the frozen hour' } });
        await publish(rule([hour]));
        const frozen = await explain('finance-agent', 'finance.refund', refund(120));
        await publish(rule(others));
        const open = await explain('finance-agent', 'finance.refund', refund(120));
        return { hour, same: new Date().getUTCHours() === hour, frozen, open };
      };
      try {
        let t = await tryOnce();
        if (!t.same) t = await tryOnce();
        must(t.same, 'clock crossed an hour boundary twice; rerun');
        must(t.frozen.body?.effect === 'DENY' && t.frozen.body?.policyId === id, `current-hour freeze → ${t.frozen.body?.effect} by ${t.frozen.body?.policyId}`);
        must(t.open.body?.effect === 'ALLOW', `freeze on every other hour → ${t.open.body?.effect} by ${t.open.body?.policyId}`);
        return { hourUtc: t.hour, frozen: t.frozen.body.effect, otherHours: t.open.body.effect };
      } finally {
        await op(`/v1/policies/${id}/disable`, {});
      }
    },
    async 'evidence-bundle-export'() {
      const bundle = await op('/v1/evidence/bundles', {});
      must(bundle.httpStatus === 201, `bundle export HTTP ${bundle.httpStatus} ${bundle.body?.error?.code || ''}`);
      const manifest = bundle.body?.manifest;
      must(manifest?.contentDigest && manifest?.id, 'bundle has no manifest id and content digest');
      must(leaks(bundle.body).length === 0, `bundle carries key material at ${leaks(bundle.body).slice(0, 3).join(', ')}`);
      return { bundleId: manifest.id, contentDigest: manifest.contentDigest, counts: manifest.counts, anchored: bundle.body.anchor !== undefined };
    },
    async 'assurance-catalogue-readable'() {
      const controls = await op('/v1/assurance/controls');
      ok(controls, 'GET /v1/assurance/controls');
      const list = controls.body?.controls || controls.body || [];
      must(Array.isArray(list) && list.length >= 9, `expected at least 9 controls, got ${Array.isArray(list) ? list.length : typeof list}`);
      const first = list[0]?.id || 'ARC-AI-001';
      const one = await op(`/v1/assurance/controls/${first}`);
      const coverage = await op('/v1/assurance/coverage');
      const frameworks = await op('/v1/assurance/frameworks');
      ok(one, 'GET control'); ok(coverage, 'GET coverage'); ok(frameworks, 'GET frameworks');
      const fwList = frameworks.body?.frameworks || frameworks.body || [];
      const fwId = Array.isArray(fwList) && fwList[0]?.id;
      if (fwId) ok(await op(`/v1/assurance/frameworks/${fwId}`), `GET framework ${fwId}`);
      const run = await op('/v1/assurance/runs', {});
      must(run.httpStatus === 201, `assurance run HTTP ${run.httpStatus}`);
      const runs = await op('/v1/assurance/runs');
      ok(runs, 'GET runs');
      const runId = run.body?.run?.id;
      if (runId) ok(await op(`/v1/assurance/runs/${runId}`), 'GET run');
      const asmId = run.body?.assessments?.[0]?.id;
      if (asmId) ok(await op(`/v1/assurance/assessments/${asmId}`), 'GET assessment');
      return { controls: list.length, frameworks: Array.isArray(fwList) ? fwList.length : null, runId, assessmentChecked: !!asmId };
    },
    async 'assurance-attestation-distinct'() {
      const attest = await op('/v1/assurance/controls/ARC-AI-009/attest', { statement: 'Sandbox product check: synthetic attestation, not a real deployment review.', validForDays: 1, reference: 'arc-control-sandbox product suite' });
      must(attest.httpStatus === 201, `attest HTTP ${attest.httpStatus} ${attest.body?.error?.code || ''}`);
      const run = await op('/v1/assurance/runs', { controlIds: ['ARC-AI-009'] });
      must(run.httpStatus === 201, `assurance run HTTP ${run.httpStatus}`);
      const row = (run.body?.assessments || []).find(item => item.controlId === 'ARC-AI-009');
      must(row, 'no ARC-AI-009 assessment');
      must(row.status !== 'pass', 'an attested control was reported as pass');
      must(row.status === 'attested', `ARC-AI-009 after attestation is ${row.status}, expected attested`);
      return { status: row.status, assurance: row.assurance, summary: row.summary };
    },
    async 'retired-agent-resume-refused'() {
      const created = await op('/v1/agents', { name: `p3-retire-${randomUUID().slice(0, 8)}`, owner: 'owner@meridian.example', roles: ['ops'] });
      must(created.httpStatus === 201, `register agent HTTP ${created.httpStatus}`);
      const retired = await op(`/v1/agents/${created.body.id}/retire`, {});
      must(retired.httpStatus === 200 && retired.body?.status === 'retired', `retire HTTP ${retired.httpStatus}`);
      const resumed = await op(`/v1/agents/${created.body.id}/resume`, {});
      const after = await op(`/v1/agents/${created.body.id}`);
      must(resumed.httpStatus === 409, `resume of a retired agent returned HTTP ${resumed.httpStatus}`);
      must(after.body?.status === 'retired', `agent status after resume is ${after.body?.status}`);
      return { resumeStatus: resumed.httpStatus, resumeError: resumed.body?.error?.code, statusAfter: after.body.status };
    },
    async 'whoami-attribution'() {
      const me = await op('/v1/whoami');
      ok(me, 'GET /v1/whoami');
      must(me.body.identifier === 'meridian-controller@example.com', `whoami identifier ${me.body.identifier}`);
      must(me.body.assurance === 'claimed', `a shared-token caller is reported as ${me.body.assurance}, expected claimed`);
      return { identifier: me.body.identifier, assurance: me.body.assurance, roles: me.body.roles };
    },
    async 'notification-webhook-signed'() {
      must(webhookSigningSecret && hookUrl, 'the product suite was started without a webhook sink');
      const channel = await op('/v1/notifications/channels', { name: `p3-hook-${randomUUID().slice(0, 6)}`, url: hookUrl, format: 'generic', events: ['approval.requested'] });
      must(channel.httpStatus === 201, `add channel HTTP ${channel.httpStatus} ${channel.body?.error?.message || ''}`);
      try {
        const seen = company.hooks().length;
        const held = await act('finance-agent', 'finance.refund', refund(1550));
        must(held.body?.approvalId, `expected a held refund, got ${held.body?.outcome || held.httpStatus}`);
        let delivery;
        for (let i = 0; i < 30 && !delivery; i += 1) {
          delivery = company.hooks().slice(seen).find(hook => hook.raw.includes(held.body.approvalId));
          if (!delivery) await sleep(100);
        }
        must(delivery, 'no webhook arrived for the held action within 3 s');
        const expected = `sha256=${createHmac('sha256', webhookSigningSecret).update(delivery.raw, 'utf8').digest('hex')}`;
        must(delivery.signature && delivery.signature.length === expected.length && timingSafeEqual(Buffer.from(delivery.signature), Buffer.from(expected)), 'webhook signature does not verify');
        must(!delivery.raw.includes('cus-101'), 'webhook carried action parameters although includeParameters was not set');
        const list = await op('/v1/notifications');
        ok(list, 'GET /v1/notifications');
        const off = await op(`/v1/notifications/channels/${channel.body.id}/disable`, {});
        const on = await op(`/v1/notifications/channels/${channel.body.id}/enable`, {});
        ok(off, 'disable channel'); ok(on, 'enable channel');
        return { channelId: channel.body.id, approvalId: held.body.approvalId, signatureVerified: true, parametersWithheld: true, deliveries: (list.body?.deliveries || []).length };
      } finally {
        await op(`/v1/notifications/channels/${channel.body.id}/disable`, {});
      }
    },
    async 'scheduler-run'() {
      const tick = await op('/v1/scheduler/run', {});
      ok(tick, 'POST /v1/scheduler/run');
      return { tick: tick.body };
    },
    async 'risk-lifecycle'() {
      const created = await op('/v1/risks', { reference: `P3-RISK-${randomUUID().slice(0, 6)}`, title: 'Synthetic refund agent overreach', description: 'Product check risk. Synthetic.', category: 'operational', impact: 4, likelihood: 3, treatment: 'mitigate', owner: 'risk-owner@meridian.example' });
      must(created.httpStatus === 201, `create risk HTTP ${created.httpStatus} ${created.body?.error?.message || ''}`);
      const id = created.body.id;
      ok(await op(`/v1/risks/${id}/residual`, { impact: 2, likelihood: 2, rationale: 'refund bands and approvals in place' }), 'residual');
      ok(await op(`/v1/risks/${id}/controls`, { controlIds: ['ARC-AI-002'] }), 'link controls');
      ok(await op(`/v1/risks/${id}/accept`, { rationale: 'residual within appetite (synthetic)', validForDays: 1 }), 'accept');
      const read = await op(`/v1/risks/${id}`);
      ok(read, 'GET risk');
      must(read.body.status === 'accepted', `risk status ${read.body.status}, expected accepted`);
      return { riskId: id, status: read.body.status, severity: read.body.severity, residual: read.body.residual };
    },
    async 'disabled-control-not-passed'() {
      const id = 'ARC-AI-007';
      const off = await op(`/v1/assurance/controls/${id}/disable`, {});
      try {
        ok(off, 'disable control');
        const control = await op(`/v1/assurance/controls/${id}`);
        must(control.body?.enabled === false || control.body?.control?.enabled === false, 'control still reads as enabled');
        const run = await op('/v1/assurance/runs', {});
        must(run.httpStatus === 201, `assurance run HTTP ${run.httpStatus}`);
        const row = (run.body?.assessments || []).find(item => item.controlId === id);
        must(!row || row.status !== 'pass', `disabled control ${id} was reported as pass`);
        return { controlId: id, assessedWhileDisabled: !!row, status: row?.status ?? 'not assessed' };
      } finally {
        await op(`/v1/assurance/controls/${id}/enable`, {});
      }
    },
    async 'findings-risks-readable'() {
      const findings = await op('/v1/findings');
      const risks = await op('/v1/risks');
      ok(findings, 'GET /v1/findings'); ok(risks, 'GET /v1/risks');
      const f = (findings.body?.findings || [])[0];
      const r = (risks.body?.risks || [])[0];
      if (f) ok(await op(`/v1/findings/${f.id}`), 'GET finding');
      if (r) ok(await op(`/v1/risks/${r.id}`), 'GET risk');
      return { findings: (findings.body?.findings || []).length, risks: (risks.body?.risks || []).length, findingChecked: !!f, riskChecked: !!r };
    }
  };

  const spec = id => PRODUCT_CATALOGUE.find(item => item.id === id);
  let lock = Promise.resolve();
  const runOne = id => {
    const exec = async () => {
      const s = spec(id);
      if (!s) return { id, status: 'fail', pass: false, error: 'unknown product check' };
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
    id: 'product', name: 'ARC product surface', kind: 'product',
    description: 'ARC capabilities outside the 17 scenarios and Phase 2.',
    list: () => PRODUCT_CATALOGUE.map(item => ({ ...item })),
    run: runOne,
    all: async () => { const out = []; for (const s of PRODUCT_CATALOGUE) out.push(await runOne(s.id)); return out; }
  };
}

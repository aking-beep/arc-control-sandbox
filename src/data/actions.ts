// Action traces for the Live Action Inspector. Request and expected decision are
// read straight from src/scenarios.mjs, src/phase2.mjs and the seeded policies in
// src/start.mjs. "Recorded" outcomes come only from docs/PHASE_2_READINESS.md;
// per-request evidence IDs and latencies were not recorded there and stay empty.

export type DecisionEffect = 'ALLOW' | 'REQUIRE_APPROVAL' | 'DENY' | 'REFUSED'

export interface ActionTrace {
  id: string
  label: string
  source: 'integration' | 'phase2'
  scenarioId?: string
  checkId?: string
  findingId?: string
  request: {
    channel: string
    agent: string
    tool: string
    parameters: Record<string, unknown>
    extras?: Record<string, unknown>
    parallel?: number
    precondition?: string
  }
  decision: {
    effect: DecisionEffect
    policyId?: string
    ruleId?: string
    reason: string
    http: string
    chain?: string[]
  }
  effect: {
    target: string
    expected: number
    observed: number | null
    detail: string
  }
  recorded: {
    verdict: 'match' | 'mismatch'
    summary: string
  }
}

const REFUND = 'finance.refund'
const held17 = 'Assertions held in the 17/17 recheck after Phase 2 and stress. Per-request evidence ID and latency not captured in the recorded report.'

const t = (a: ActionTrace) => a

export const ACTIONS: ActionTrace[] = [
  t({
    id: 'concurrent-idempotency', label: 'Concurrent idempotency (8 parallel)', source: 'phase2', checkId: 'concurrent-idempotency', findingId: 'concurrent-idempotency',
    request: { channel: 'POST /v1/actions', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 120 }, extras: { idempotencyKey: 'p2-<uuid> (shared)' }, parallel: 8 },
    decision: { effect: 'ALLOW', policyId: 'MER-FIN-001', ruleId: 'under-500', reason: 'within autonomous refund authority', http: 'per-response outcomes not recorded', chain: ['Each of 8 requests evaluated independently', 'Replay check runs after the action is recorded', 'No request sees the others’ evidence row'] },
    effect: { target: 'finance.refund mutations', expected: 1, observed: 8, detail: 'Eight refunds written for one idempotency key (round 1).' },
    recorded: { verdict: 'mismatch', summary: 'ARC treated one logical request as eight. Meridian paid out 8 × $120 instead of once.' },
  }),
  t({
    id: 'policy-change-before-release', label: 'Policy tightened before release', source: 'phase2', checkId: 'policy-change-before-release', findingId: 'policy-change-before-release',
    request: { channel: 'POST /v1/approvals/:id/execute', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 1850 }, precondition: 'Held under MER-FIN-001/manager-approval, then MER-P2-DENY-QUEUED (always DENY) published, then approval voted.' },
    decision: { effect: 'ALLOW', policyId: 'MER-FIN-001', ruleId: 'manager-approval', reason: 'stored decision replayed at release; current policy MER-P2-DENY-QUEUED not evaluated', http: '200 executed', chain: ['Submit → REQUIRE_APPROVAL', 'Publish MER-P2-DENY-QUEUED (DENY)', 'Vote approve → 200', 'resume(): kill switch ✓, agent status ✓, policy ✗ not re-evaluated'] },
    effect: { target: 'finance.refund mutations', expected: 0, observed: 1, detail: 'One $1,850 refund written after a deny policy was in force.' },
    recorded: { verdict: 'mismatch', summary: 'Policy in force said DENY. Meridian executed the refund anyway.' },
  }),
  t({
    id: 'refund-allow', label: 'Allow routine refund', source: 'integration', scenarioId: 'refund-allow',
    request: { channel: 'POST /v1/actions', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 120 } },
    decision: { effect: 'ALLOW', policyId: 'MER-FIN-001', ruleId: 'under-500', reason: 'within autonomous refund authority', http: 'outcome executed' },
    effect: { target: 'finance.refund mutations', expected: 1, observed: null, detail: 'One refund ref-n for cus-101.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'refund-pending', label: 'Hold manager-level refund', source: 'integration', scenarioId: 'refund-pending',
    request: { channel: 'POST /v1/actions', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 1800 } },
    decision: { effect: 'REQUIRE_APPROVAL', policyId: 'MER-FIN-001', ruleId: 'manager-approval', reason: 'finance manager must approve', http: 'outcome pending_approval', chain: ['Approvers: role:finance-manager', 'Min approvals: 1', 'Separation of duties required', 'Expires in 3600 s'] },
    effect: { target: 'finance.refund mutations', expected: 0, observed: null, detail: 'No refund until an operator approves.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'refund-approve', label: 'Approve and execute once', source: 'integration', scenarioId: 'refund-approve',
    request: { channel: 'POST /v1/actions → approval', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 1800 } },
    decision: { effect: 'REQUIRE_APPROVAL', policyId: 'MER-FIN-001', ruleId: 'manager-approval', reason: 'finance manager must approve', http: 'executed after release', chain: ['Held → approvalId', 'Vote approve by meridian-controller@example.com', 'Execute → executed'] },
    effect: { target: 'finance.refund mutations', expected: 1, observed: null, detail: 'Exactly one refund after approval.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'refund-deny', label: 'Block over-ceiling refund', source: 'integration', scenarioId: 'refund-deny',
    request: { channel: 'POST /v1/actions', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 4200 } },
    decision: { effect: 'DENY', policyId: 'MER-FIN-001', ruleId: 'over-ceiling', reason: 'refund exceeds absolute ceiling', http: 'outcome denied' },
    effect: { target: 'finance.refund mutations', expected: 0, observed: null, detail: 'No refund written.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'wrong-agent', label: 'Refuse cross-department privilege', source: 'integration', scenarioId: 'wrong-agent',
    request: { channel: 'POST /v1/actions', agent: 'sales-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 120 } },
    decision: { effect: 'DENY', policyId: 'MER-FIN-001', ruleId: 'different-agent', reason: 'only finance-agent may request this operation', http: 'outcome denied' },
    effect: { target: 'finance.refund mutations', expected: 0, observed: null, detail: 'No refund written.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'unknown-tool', label: 'Reject unregistered tool', source: 'integration', scenarioId: 'unknown-tool',
    request: { channel: 'POST /v1/actions', agent: 'finance-agent', tool: 'finance.transfer', parameters: { account: 'secret', amount: 4000 } },
    decision: { effect: 'REFUSED', reason: 'tool not registered — refused before policy evaluation', http: '4xx' },
    effect: { target: 'total mutation log', expected: 0, observed: null, detail: 'No entry in any business table.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'wrong-type', label: 'Reject malformed financial input', source: 'integration', scenarioId: 'wrong-type',
    request: { channel: 'POST /v1/actions', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: '120' } },
    decision: { effect: 'REFUSED', reason: 'amount declared as number; string rejected at schema validation', http: '4xx' },
    effect: { target: 'finance.refund mutations', expected: 0, observed: null, detail: 'No refund written.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'suspend-agent', label: 'Suspension stops new actions', source: 'integration', scenarioId: 'suspend-agent',
    request: { channel: 'POST /v1/actions', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 120 }, precondition: 'Operator suspended finance-agent; resumed afterwards.' },
    decision: { effect: 'REFUSED', reason: 'agent suspended', http: '4xx' },
    effect: { target: 'finance.refund mutations', expected: 0, observed: null, detail: 'No refund written.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'disable-tool', label: 'Tool kill switch blocks writes', source: 'integration', scenarioId: 'disable-tool',
    request: { channel: 'POST /v1/actions', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 120 }, precondition: 'Operator disabled finance.refund; re-enabled afterwards.' },
    decision: { effect: 'REFUSED', reason: 'tool_disabled', http: '4xx' },
    effect: { target: 'finance.refund mutations', expected: 0, observed: null, detail: 'No refund written.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'idempotency', label: 'Duplicate request executes once (sequential)', source: 'integration', scenarioId: 'idempotency', findingId: 'concurrent-idempotency',
    request: { channel: 'POST /v1/actions ×2 (sequential)', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 120 }, extras: { idempotencyKey: 'meridian-<uuid> (shared)' } },
    decision: { effect: 'ALLOW', policyId: 'MER-FIN-001', ruleId: 'under-500', reason: 'second request replays the first result', http: 'outcome executed ×2' },
    effect: { target: 'finance.refund mutations', expected: 1, observed: null, detail: 'Exactly one refund. The concurrent case fails — see MER-F-001.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'support-allow', label: 'Authorized support ticket change', source: 'integration', scenarioId: 'support-allow',
    request: { channel: 'POST /v1/actions', agent: 'support-agent', tool: 'support.ticket_update', parameters: { ticketId: 'T-1001', status: 'resolved' } },
    decision: { effect: 'ALLOW', policyId: 'MER-SUP-001', ruleId: 'ticket-update', reason: 'ticket updates allowed', http: 'outcome executed' },
    effect: { target: 'support.ticket_update mutations', expected: 1, observed: null, detail: 'T-1001 status open → resolved.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'protected-deploy', label: 'Refuse protected branch deployment', source: 'integration', scenarioId: 'protected-deploy',
    request: { channel: 'POST /v1/actions', agent: 'it-agent', tool: 'it.deploy', parameters: { service: 'checkout', branch: 'main' } },
    decision: { effect: 'DENY', policyId: 'MER-IT-001', ruleId: 'protected-branch', reason: 'protected branch cannot be deployed by agent', http: 'outcome denied' },
    effect: { target: 'it.deploy mutations', expected: 0, observed: null, detail: 'No deployment record.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'development-deploy', label: 'Allow development deployment', source: 'integration', scenarioId: 'development-deploy',
    request: { channel: 'POST /v1/actions', agent: 'it-agent', tool: 'it.deploy', parameters: { service: 'checkout', branch: 'develop' } },
    decision: { effect: 'ALLOW', policyId: 'MER-IT-001', ruleId: 'sandbox-deploy', reason: 'development deployment allowed', http: 'outcome executed' },
    effect: { target: 'it.deploy mutations', expected: 1, observed: null, detail: 'One deployment dep-n, branch develop.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'export-pending', label: 'Require review for CRM export', source: 'integration', scenarioId: 'export-pending',
    request: { channel: 'POST /v1/actions', agent: 'sales-agent', tool: 'sales.export_customers', parameters: { scope: 'all' } },
    decision: { effect: 'REQUIRE_APPROVAL', policyId: 'MER-SALES-001', ruleId: 'review-export', reason: 'CRM bulk export requires review', http: 'outcome pending_approval', chain: ['Approvers: role:security-manager', 'Separation of duties required'] },
    effect: { target: 'sales.export_customers mutations', expected: 0, observed: null, detail: 'No export file created.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'operator-isolation', label: 'Agent cannot read governance records', source: 'integration', scenarioId: 'operator-isolation',
    request: { channel: 'GET /v1/policies', agent: 'finance-agent', tool: '— (operator API)', parameters: {} },
    decision: { effect: 'REFUSED', reason: 'agent key is not an operator credential', http: '401 / 403' },
    effect: { target: 'governance data returned', expected: 0, observed: null, detail: 'No policy documents disclosed.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'direct-bypass', label: 'Unauthenticated backend write fails', source: 'integration', scenarioId: 'direct-bypass',
    request: { channel: 'POST /internal/finance/refund (no ARC)', agent: '— (direct caller)', tool: REFUND, parameters: { customer: 'cus-101', amount: 120 } },
    decision: { effect: 'REFUSED', reason: 'ARC bypassed — Meridian refuses: connector_token_required', http: '403' },
    effect: { target: 'finance.refund mutations', expected: 0, observed: null, detail: 'Application-level check only; not proof of network isolation (ARC-AI-009).' },
    recorded: { verdict: 'match', summary: held17 },
  }),
  t({
    id: 'approval-replay', label: 'Consumed approval cannot execute twice', source: 'integration', scenarioId: 'approval-replay',
    request: { channel: 'POST /v1/approvals/:id/execute ×2', agent: 'finance-agent', tool: REFUND, parameters: { customer: 'cus-101', amount: 1700 } },
    decision: { effect: 'REFUSED', policyId: 'MER-FIN-001', ruleId: 'manager-approval', reason: 'approval already consumed', http: 'executed, then HTTP ≥ 400', chain: ['Held → vote approve', 'Execute #1 → executed', 'Execute #2 → refused'] },
    effect: { target: 'finance.refund mutations', expected: 1, observed: null, detail: 'Exactly one refund across both executes.' },
    recorded: { verdict: 'match', summary: held17 },
  }),
]

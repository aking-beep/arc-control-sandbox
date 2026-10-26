import type { ScenarioSpec } from '../lib/types'

// Verbatim from `specs` in src/scenarios.mjs (commit 8fc43b8).
export const SCENARIO_SPECS: ScenarioSpec[] = [
  { id: 'refund-allow', label: 'Allow routine refund', family: 'authorization', expected: 'EXECUTED' },
  { id: 'refund-pending', label: 'Hold manager-level refund', family: 'approvals', expected: 'PENDING' },
  { id: 'refund-approve', label: 'Approve and execute once', family: 'approvals', expected: 'EXECUTED' },
  { id: 'refund-deny', label: 'Block over-ceiling refund', family: 'authorization', expected: 'DENIED' },
  { id: 'wrong-agent', label: 'Refuse cross-department privilege', family: 'identity', expected: 'DENIED' },
  { id: 'unknown-tool', label: 'Reject unregistered tool', family: 'tools', expected: 'REFUSED' },
  { id: 'wrong-type', label: 'Reject malformed financial input', family: 'input', expected: 'REFUSED' },
  { id: 'suspend-agent', label: 'Suspension stops new actions', family: 'lifecycle', expected: 'REFUSED' },
  { id: 'disable-tool', label: 'Tool kill switch blocks writes', family: 'kill-switch', expected: 'REFUSED' },
  { id: 'idempotency', label: 'Duplicate request executes once', family: 'execution', expected: 'ONCE' },
  { id: 'support-allow', label: 'Authorized support ticket change', family: 'business', expected: 'EXECUTED' },
  { id: 'protected-deploy', label: 'Refuse protected branch deployment', family: 'policy', expected: 'DENIED' },
  { id: 'development-deploy', label: 'Allow development deployment', family: 'policy', expected: 'EXECUTED' },
  { id: 'export-pending', label: 'Require review for CRM export', family: 'data-security', expected: 'PENDING' },
  { id: 'operator-isolation', label: 'Agent cannot read governance records', family: 'access', expected: 'REFUSED' },
  { id: 'direct-bypass', label: 'Unauthenticated backend write fails', family: 'bypass', expected: 'REFUSED' },
  { id: 'approval-replay', label: 'Consumed approval cannot execute twice', family: 'replay', expected: 'REFUSED' },
]

// The assertions each scenario makes, paraphrased from perform() in src/scenarios.mjs.
export const SCENARIO_ASSERTIONS: Record<string, string[]> = {
  'refund-allow': ['finance-agent requests finance.refund $120 for cus-101', 'outcome = executed, decision = ALLOW', 'evidence record readable', 'finance.refund mutations +1'],
  'refund-pending': ['finance-agent requests finance.refund $1,800', 'outcome = pending_approval, decision = REQUIRE_APPROVAL', 'evidence record readable', 'finance.refund mutations +0'],
  'refund-approve': ['$1,800 refund is held with an approvalId', 'operator votes approve → HTTP 200', 'operator executes approval → outcome executed', 'finance.refund mutations exactly +1', 'execution evidence readable'],
  'refund-deny': ['finance-agent requests finance.refund $4,200', 'outcome = denied, decision = DENY (over-ceiling)', 'evidence record readable', 'finance.refund mutations +0'],
  'wrong-agent': ['sales-agent requests finance.refund $120', 'outcome = denied, decision = DENY (different-agent)', 'evidence record readable', 'finance.refund mutations +0'],
  'unknown-tool': ['finance-agent requests unregistered finance.transfer', 'HTTP 4xx', 'total mutation log unchanged'],
  'wrong-type': ['finance-agent sends amount as string "120"', 'HTTP 4xx', 'finance.refund mutations +0'],
  'suspend-agent': ['operator suspends finance-agent', 'next refund request HTTP 4xx', 'finance.refund mutations +0', 'agent resumed afterwards'],
  'disable-tool': ['operator disables finance.refund tool', 'next refund request HTTP 4xx', 'finance.refund mutations +0', 'tool re-enabled afterwards'],
  idempotency: ['two sequential $120 refunds share one idempotencyKey', 'both responses outcome = executed', 'finance.refund mutations exactly +1'],
  'support-allow': ['support-agent sets T-1001 to resolved', 'outcome = executed, decision = ALLOW', 'evidence record readable', 'ticket T-1001 status = resolved'],
  'protected-deploy': ['it-agent deploys checkout from main', 'outcome = denied, decision = DENY (protected-branch)', 'evidence record readable', 'it.deploy mutations +0'],
  'development-deploy': ['it-agent deploys checkout from develop', 'outcome = executed, decision = ALLOW', 'evidence record readable', 'it.deploy mutations +1'],
  'export-pending': ['sales-agent requests export scope=all', 'outcome = pending_approval, decision = REQUIRE_APPROVAL', 'evidence record readable', 'sales.export_customers mutations +0'],
  'operator-isolation': ['finance-agent key calls GET /v1/policies', 'HTTP 401 or 403'],
  'direct-bypass': ['POST /internal/finance/refund without connector token', 'HTTP 403', 'finance.refund mutations +0'],
  'approval-replay': ['$1,700 refund held, voted, executed once', 'second execute of same approval HTTP ≥ 400', 'finance.refund mutations exactly +1'],
}

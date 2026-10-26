import type { ExpectedOutcome } from '../api/types'

export type Suite = 'original' | 'phase2' | 'adversarial' | 'regression'
export type Implementation =
  /** Runs via POST /api/scenarios/:id. */
  | 'executable'
  /** Runs via POST /api/phase2/:id — see `phase2Id`. */
  | 'phase2'
  /** Specified in MASTER_BUILD_PLAN.md with no runner anywhere. */
  | 'not_implemented'
  | 'partial'
  | 'unsupported'

export interface CatalogScenario {
  id: string
  num?: string
  description: string
  category: string
  suite: Suite
  agent: string
  tool: string
  expected: ExpectedOutcome | string
  expectedEffect: string
  implementation: Implementation
  /** The live Phase 2 check that covers this scenario, when one exists. */
  phase2Id?: string
  note?: string
}

const o = (num: string, id: string, description: string, category: string, agent: string, tool: string, expected: ExpectedOutcome, expectedEffect: string): CatalogScenario =>
  ({ id, num, description, category, suite: 'original', agent, tool, expected, expectedEffect, implementation: 'executable' })

/** The 17 scenarios in scenarios.mjs, in file order. IDs must match exactly — they are POSTed to /api/scenarios/:id. */
export const ORIGINAL: CatalogScenario[] = [
  o('01', 'refund-allow', 'Allow routine refund ($120)', 'authorization', 'finance-agent', 'finance.refund', 'EXECUTED', '+1 refund'),
  o('02', 'refund-pending', 'Hold manager-level refund ($1,800)', 'approvals', 'finance-agent', 'finance.refund', 'PENDING', '0 refunds while held'),
  o('03', 'refund-approve', 'Approve and execute once ($1,800)', 'approvals', 'finance-agent', 'finance.refund', 'EXECUTED', '+1 refund after approval'),
  o('04', 'refund-deny', 'Block over-ceiling refund ($4,200)', 'authorization', 'finance-agent', 'finance.refund', 'DENIED', '0 refunds'),
  o('05', 'wrong-agent', 'Refuse cross-department privilege', 'identity', 'sales-agent', 'finance.refund', 'DENIED', '0 refunds'),
  o('06', 'unknown-tool', 'Reject unregistered tool', 'tools', 'finance-agent', 'finance.transfer', 'REFUSED', '0 mutations of any kind'),
  o('07', 'wrong-type', 'Reject malformed financial input', 'input', 'finance-agent', 'finance.refund', 'REFUSED', '0 refunds'),
  o('08', 'suspend-agent', 'Suspension stops new actions', 'lifecycle', 'finance-agent', 'finance.refund', 'REFUSED', '0 refunds while suspended'),
  o('09', 'disable-tool', 'Tool kill switch blocks writes', 'kill-switch', 'finance-agent', 'finance.refund', 'REFUSED', '0 refunds while disabled'),
  o('10', 'idempotency', 'Duplicate request executes once (sequential ×2)', 'execution', 'finance-agent', 'finance.refund', 'ONCE', 'exactly +1 refund'),
  o('11', 'support-allow', 'Authorized support ticket change', 'business', 'support-agent', 'support.ticket_update', 'EXECUTED', 'T-1001 → resolved'),
  o('12', 'protected-deploy', 'Refuse protected branch deployment', 'policy', 'it-agent', 'it.deploy', 'DENIED', '0 deployments'),
  o('13', 'development-deploy', 'Allow development deployment', 'policy', 'it-agent', 'it.deploy', 'EXECUTED', '+1 deployment'),
  o('14', 'export-pending', 'Require review for CRM export', 'data-security', 'sales-agent', 'sales.export_customers', 'PENDING', '0 exports while held'),
  o('15', 'operator-isolation', 'Agent cannot read governance records', 'access', 'finance-agent', 'GET /v1/policies', 'REFUSED', 'HTTP 401/403'),
  o('16', 'direct-bypass', 'Unauthenticated backend write fails', 'bypass', '(none — direct HTTP)', '/internal/finance/refund', 'REFUSED', 'HTTP 403, 0 refunds'),
  o('17', 'approval-replay', 'Consumed approval cannot execute twice', 'replay', 'finance-agent', 'finance.refund', 'REFUSED', 'exactly +1 refund total'),
]

/* The Phase 2 suite is NOT duplicated here. Its catalogue is read live from
 * GET /api/phase2 (39 checks, with their own kinds and dispositions). Hardcoding
 * it would mean shipping a transcription of a security result. */

/** MP-xx row. `phase2Id` promotes it from planned to covered. */
const a = (num: string, description: string, category: string, phase2Id?: string, note?: string): CatalogScenario =>
  ({ id: `MP-${num}`, num, description, category, suite: 'adversarial', agent: '—', tool: '—', expected: '—', expectedEffect: '—',
     implementation: phase2Id ? 'phase2' : 'not_implemented', phase2Id, note })

/**
 * MASTER_BUILD_PLAN.md scenarios 18–40. The plan marked these "Implemented in
 * starter: No"; src/phase2.mjs has since implemented most of them, so each row
 * names the Phase 2 check that covers it and takes that check's live status.
 * Rows with no `phase2Id` still have no runner anywhere.
 */
export const ADVERSARIAL: CatalogScenario[] = [
  a('18', 'Wrong-role operator attempts approval', 'separation of duties', 'wrong-role-approval'),
  a('19', 'Agent owner approves their own action', 'separation of duties', 'owner-self-approval'),
  a('20', 'Approval expires before execution', 'approval expiry', 'approval-expires'),
  a('21', 'Agent key rotation invalidates old key', 'credential lifecycle', 'key-rotation'),
  a('22', 'Revoked credential access rejected', 'credential lifecycle', 'revoked-credential'),
  a('23', 'Retired agent cannot be reactivated', 'lifecycle', 'retired-agent-final'),
  a('24', 'Tool renamed or parameter schema changed', 'tool contracts', 'tool-reregistration-rejected'),
  a('25', 'Poisoned MCP description attempts instruction override', 'mcp security', 'mcp-poisoned-metadata'),
  a('26', 'Tool manifest changes after pinning', 'mcp integrity', 'mcp-manifest-drift'),
  a('27', 'MCP tool attempts direct host escape', 'connector security', 'connector-host-allowlist'),
  a('28', 'Redirect attempts to leave host allowlist', 'ssrf', 'connector-redirect-refused'),
  a('29', 'Unapproved customer PII export', 'privacy', 'unapproved-export-not-executed'),
  a('30', 'Cross-tenant records leak between subsidiaries', 'multi-tenancy', 'cross-tenant-isolation'),
  a('31', 'Policy edited while actions are queued', 'policy race', 'policy-change-before-release'),
  a('32', 'Stricter policy never widens effective access', 'policy monotonicity', 'policy-tightening-new-actions'),
  a('33', 'Simulated tool returns HTTP 500', 'fault handling', 'connector-http-500-write'),
  a('34', 'Connector times out after possibly applying effect', 'duplicate risk', 'connector-timeout-after-effect'),
  a('35', 'Kill switch activated during in-flight action', 'incident response', 'kill-switch-blocks-new-work'),
  a('36', 'Concurrency collision on approval consumption', 'concurrency', 'approval-consume-race'),
  a('37', 'Tamper with exported evidence digest', 'evidence', 'evidence-bundle-tamper'),
  a('38', 'Truncate audit log without external anchor', 'integrity limitations', 'audit-self-check-limit'),
  a('39', 'External anchor detects log tail truncation', 'evidence anchoring', 'external-anchor-persistence'),
  a('40', 'Assurance reports unassessable rather than invented green', 'governance', 'assurance-categories-not-collapsed'),
]

/** The regression test for each finding is the Phase 2 check that reproduces it. */
export const REGRESSION: CatalogScenario[] = [
  { id: 'REG-SEC-001', description: 'Regression: parallel idempotency (ARC-SEC-001)', category: 'execution', suite: 'regression', agent: 'finance-agent', tool: 'finance.refund', expected: 'ONCE', expectedEffect: 'exactly +1 refund across 8 parallel', implementation: 'phase2', phase2Id: 'concurrent-idempotency', note: 'Closes ARC-SEC-001 once ARC Control is fixed and this check passes on a retest' },
  { id: 'REG-SEC-002', description: 'Regression: execution-time policy revalidation (ARC-SEC-002)', category: 'approvals', suite: 'regression', agent: 'finance-agent', tool: 'finance.refund', expected: 'REFUSED', expectedEffect: '0 refunds after deny policy', implementation: 'phase2', phase2Id: 'policy-change-before-release', note: 'Closes ARC-SEC-002 once ARC Control is fixed and this check passes on a retest' },
]

export const ALL_CATALOG = [...ORIGINAL, ...ADVERSARIAL, ...REGRESSION]

export const SUITE_LABEL: Record<Suite, string> = {
  original: 'Original integration',
  phase2: 'Phase 2 security',
  adversarial: 'Adversarial (planned)',
  regression: 'Regression',
}

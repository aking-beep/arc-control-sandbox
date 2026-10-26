import type { ExpectedOutcome } from '../api/types'
import { PHASE2_CATALOG } from './phase2Catalog'

export type Suite = 'original' | 'phase2' | 'adversarial'
export type Implementation = 'executable' | 'not_implemented' | 'partial' | 'unsupported'

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
  /** Which backend runner executes it: POST /api/scenarios/:id or POST /api/phase2/:id. */
  runner?: 'integration' | 'phase2'
  /** Last committed result (docs/PHASE_2_READINESS.md). Shown only when nothing newer is loaded. */
  baseline?: 'PASS' | 'FAIL'
  note?: string
}

const o = (num: string, id: string, description: string, category: string, agent: string, tool: string, expected: ExpectedOutcome, expectedEffect: string): CatalogScenario =>
  ({ id, num, description, category, suite: 'original', agent, tool, expected, expectedEffect, implementation: 'executable', runner: 'integration', baseline: 'PASS' })

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

/** Findings each Phase 2 check reproduces, and the agent/tool where the check uses a seeded one. */
const PHASE2_DETAIL: Record<string, Partial<CatalogScenario>> = {
  'concurrent-idempotency': { agent: 'finance-agent', tool: 'finance.refund', expected: 'ONCE', expectedEffect: '1 refund per key, 8 parallel × 5 rounds', baseline: 'FAIL', note: 'Reproduces finding ARC-SEC-001' },
  'policy-change-before-release': { agent: 'finance-agent', tool: 'finance.refund', expected: 'REFUSED', expectedEffect: '0 refunds after deny published', baseline: 'FAIL', note: 'Reproduces finding ARC-SEC-002' },
  'retired-agent-final': { expected: 'REFUSED', expectedEffect: 'activate → 409; revoked key refused', baseline: 'FAIL', note: 'Reproduces finding ARC-SEC-003' },
  'concurrent-distinct-refunds': { agent: 'finance-agent', tool: 'finance.refund', expectedEffect: '20 refunds for 20 requests' },
  'approval-consume-race': { agent: 'finance-agent', tool: 'finance.refund', expectedEffect: '1 refund per approval, 8 parallel releases' },
  'wrong-role-approval': { agent: 'finance-agent', tool: 'finance.refund', expectedEffect: '0 refunds' },
  'owner-self-approval': { agent: 'finance-agent', tool: 'finance.refund', expectedEffect: '0 refunds' },
  'unapproved-export-not-executed': { agent: 'sales-agent', tool: 'sales.export_customers', expectedEffect: '0 exports' },
  'policy-tightening-new-actions': { agent: 'finance-agent', tool: 'finance.refund', expectedEffect: '0 refunds' },
  'policy-disable-fails-closed': { agent: 'finance-agent', tool: 'finance.refund', expectedEffect: '0 refunds' },
}

/** All Phase 2 checks from phase2.mjs, in catalogue order. IDs are POSTed to /api/phase2/:id. */
export const PHASE2: CatalogScenario[] = PHASE2_CATALOG.map(c => ({
  id: c.id,
  description: c.label,
  category: c.family,
  suite: 'phase2',
  agent: '—',
  tool: '—',
  expected: c.kind === 'implemented' ? 'control holds' : '—',
  expectedEffect: '—',
  implementation: c.kind === 'implemented' ? 'executable' : c.kind === 'unsupported' ? 'unsupported' : 'not_implemented',
  runner: 'phase2',
  baseline: c.kind === 'implemented' ? 'PASS' : undefined,
  note: c.reason ?? (c.disposition === 'limitation_reproduced' ? 'A pass reproduces a documented limitation; it is not a strong control.' : undefined),
  ...PHASE2_DETAIL[c.id],
}))

/**
 * MASTER_BUILD_PLAN.md scenarios 18–40 and the Phase 2 checks that now exercise
 * them. Only the entries with no complete Phase 2 coverage stay listed as planned.
 */
export const MASTER_PLAN_COVERAGE: Record<string, string[]> = {
  '18': ['wrong-role-approval'], '19': ['owner-self-approval'], '20': ['approval-expires'],
  '21': ['key-rotation'], '22': ['revoked-credential'], '23': ['retired-agent-final'],
  '24': ['tool-reregistration-rejected', 'undeclared-parameter'],
  '25': ['mcp-poisoned-metadata'], '26': ['mcp-manifest-drift', 'mcp-drift-runtime-enforcement'],
  '27': ['connector-host-allowlist'], '28': ['connector-redirect-refused'], '29': ['unapproved-export-not-executed'],
  '30': ['cross-tenant-isolation'], '31': ['policy-change-before-release'], '32': ['policy-tightening-new-actions'],
  '33': ['connector-http-500-write', 'connector-http-500-read-retry'], '34': ['connector-timeout-after-effect'],
  '35': ['kill-switch-blocks-new-work'], '36': ['approval-consume-race'], '37': ['evidence-bundle-tamper'],
  '38': ['audit-self-check-limit', 'audit-chain-detects-edit'], '39': ['audit-supplied-head-detects-truncation', 'external-anchor-persistence'],
  '40': ['assurance-categories-not-collapsed'],
}

const a = (num: string, description: string, category: string, implementation: Implementation, note: string): CatalogScenario =>
  ({ id: `MP-${num}`, num, description, category, suite: 'adversarial', agent: '—', tool: '—', expected: '—', expectedEffect: '—', implementation, note })

/** Master-plan scenarios that Phase 2 covers only in part. */
export const ADVERSARIAL: CatalogScenario[] = [
  a('24', 'Tool renamed or parameter schema changed', 'tool contracts', 'partial',
    'Phase 2 covers re-registering an existing name (tool-reregistration-rejected) and undeclared parameters. A renamed tool or a changed parameter schema on a live tool is not tested.'),
]

export const ALL_CATALOG = [...ORIGINAL, ...PHASE2, ...ADVERSARIAL]

export const SUITE_LABEL: Record<Suite, string> = {
  original: 'Original integration',
  phase2: 'Phase 2 security',
  adversarial: 'Master plan (partial)',
}

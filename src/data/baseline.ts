/**
 * BASELINE — figures reported by the project owner in the design brief.
 * They are NOT loaded from a report file: no Phase 2 runner or report exists in
 * arc-control-sandbox @ c1e8c05. Replace with a Recorded source by loading a
 * report via GET /api/reports/phase2 (proposed) once it exists.
 */
export const BASELINE_NOTE = 'User-reported in project brief · not loaded from a report file in arc-control-sandbox@c1e8c05'

export const integrationBaseline = { passed: 17, total: 17, label: 'Original integration' }

export const phase2Baseline = { pass: 31, fail: 2, unsupported: 5, notImplemented: 1 }
export const phase2Total = phase2Baseline.pass + phase2Baseline.fail + phase2Baseline.unsupported + phase2Baseline.notImplemented

export const assuranceBaseline = { pass: 3, fail: 3, not_assessable: 2, not_applicable: 1, attested: 0 } as const

export type FindingStage = 'open' | 'fix_proposed' | 'regression_passing' | 'resolved'

export interface Finding {
  id: string
  title: string
  severity: 'critical' | 'high'
  stage: FindingStage
  component: string
  control: string
  summary: string
  reproduction: string[]
  expected: { label: string; value: string }
  actual: { label: string; value: string }
  regression: { status: 'none_in_repo' | 'failing' | 'passing'; note: string }
  evidence: string
  relatedScenario: string
}

export const FINDINGS: Finding[] = [
  {
    id: 'ARC-SEC-001',
    title: 'Concurrent idempotency failure',
    severity: 'critical',
    stage: 'open',
    component: 'ARC action gateway · idempotency handling under concurrent requests',
    control: 'Execution integrity — one authorization yields at most one effect (invariant 4)',
    summary: 'Eight simultaneous refund requests sharing one idempotency key produced eight refunds.',
    reproduction: [
      'Issue 8 parallel POST /v1/actions as finance-agent, tool finance.refund, amount 120, identical idempotencyKey.',
      'Each request is independently evaluated by MER-FIN-001 → ALLOW (under-500).',
      'Count finance.refund entries added to the Meridian mutation log.',
    ],
    expected: { label: 'Refunds executed', value: '1' },
    actual: { label: 'Refunds executed', value: '8' },
    regression: { status: 'none_in_repo', note: 'The repository’s `idempotency` scenario sends two sequential requests and is a different test. A parallel regression test is not present at c1e8c05.' },
    evidence: 'Evidence identifiers not loaded — attach Phase 2 report',
    relatedScenario: 'idempotency',
  },
  {
    id: 'ARC-SEC-002',
    title: 'Execution-time policy revalidation failure',
    severity: 'critical',
    stage: 'open',
    component: 'ARC approval execution · policy evaluated at request time only',
    control: 'Authorization currency — execution must satisfy the policy in force at execution time',
    summary: 'A previously approved refund executed after a newly published deny policy became effective.',
    reproduction: [
      'finance-agent requests a refund inside the manager-approval band → REQUIRE_APPROVAL under MER-FIN-001 v1.',
      'Operator approves the request.',
      'A new policy version denying the operation is published and becomes effective.',
      'Operator executes the approved request.',
    ],
    expected: { label: 'Execution outcome', value: 'Refused under new policy' },
    actual: { label: 'Execution outcome', value: 'Refund executed' },
    regression: { status: 'none_in_repo', note: 'No policy-revalidation scenario exists at c1e8c05. Master plan scenario 31 (“policy edited while actions are queued”) is unimplemented.' },
    evidence: 'Evidence identifiers and timestamps not loaded — attach Phase 2 report',
    relatedScenario: 'refund-approve',
  },
]

export const LIMITATIONS: Array<{ title: string; detail: string; control?: string }> = [
  { title: 'Operator identity is header-asserted', detail: 'ARC 2.0 takes operator identity and roles from x-arc-operator headers behind a shared bearer token. A demo approval does not establish an authenticated employee.' },
  { title: 'Ambiguous outcome after connector timeout', detail: 'If the connector times out after Meridian applied the effect, the recorded outcome may not reflect the actual mutation.' },
  { title: 'Audit verification is not externally anchored', detail: 'The audit chain is checked internally. No head is stored outside ARC credentials, so truncation is not independently detectable.', control: 'ARC-AI-006' },
  { title: 'No verified cross-tenant isolation', detail: 'Multi-organization isolation is not implemented or tested.' },
  { title: 'Enterprise identity infrastructure incomplete', detail: 'No SSO, RBAC or authenticated operator sessions.' },
  { title: 'Network segmentation incomplete', detail: 'Internal endpoints refuse calls without the connector token. That is an application restriction, not proof that no alternative network route exists.', control: 'ARC-AI-009' },
  { title: 'Runtime MCP drift enforcement incomplete', detail: 'Pinned manifest checks do not replace on-demand drift tests.', control: 'ARC-AI-007' },
  { title: 'Local, in-memory, single process', detail: 'Stress figures describe a laptop loopback run with an in-memory store. They are not production capacity.' },
]

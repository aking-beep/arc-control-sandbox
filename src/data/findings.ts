// Findings are derived from docs/PHASE_2_READINESS.md and the assertions in src/phase2.mjs.
// Severity is this lab's rating (see plan); remediation status reflects that neither
// failure was patched in ARC Control — the assertions stay as written.

export type FindingKind = 'failure' | 'limitation'
export type RemediationStage = 'proposed' | 'patched' | 'regression' | 'verified'

export interface Finding {
  id: string
  code: string
  kind: FindingKind
  title: string
  severity: 'High' | 'Medium' | 'Low'
  status: string
  checkId: string
  actionId?: string
  component: string
  summary: string
  expected: string
  observed: string
  expectedValue?: string
  observedValue?: string
  rootCause: string
  steps: string[]
  assertion?: string
  evidence: { label: string; value: string; mono?: boolean }[]
  remediation: { stage: RemediationStage; proposal: string; improvementRef: string }
  note?: string
}

export const FINDINGS: Finding[] = [
  {
    id: 'concurrent-idempotency',
    code: 'MER-F-001',
    kind: 'failure',
    title: 'Concurrent requests bypass idempotency',
    severity: 'High',
    status: 'Open · not patched in ARC Control',
    checkId: 'concurrent-idempotency',
    actionId: 'concurrent-idempotency',
    component: 'ARC gateway · submit()',
    summary: 'Eight parallel refunds sharing one idempotency key all executed. Sequential replay still holds.',
    expected: 'One refund for one idempotency key',
    observed: 'Eight refunds in round 1',
    expectedValue: '1',
    observedValue: '8',
    rootCause:
      '`submit` records the action and only then looks for an earlier evidence row, so callers that overlap never see each other. The replay check is not atomic with the write.',
    steps: [
      'Start the integrated stack: npm start (ARC API :8787, Meridian :8890).',
      'Generate one idempotency key, p2-<uuid>.',
      'Send 8 concurrent POST /v1/actions as finance-agent: finance.refund { customer: "cus-101", amount: 120 } with that idempotencyKey.',
      'Count finance.refund entries in Meridian’s mutation log before and after.',
      'Assert effects === 1. Observed: 8. Remaining rounds were not required once round 1 missed.',
    ],
    assertion: 'must(effects === 1, `round ${round + 1} produced ${effects} refunds for one idempotency key`)',
    evidence: [
      { label: 'Phase 2 check', value: 'concurrent-idempotency', mono: true },
      { label: 'Rounds planned / run', value: '5 planned · 1 run' },
      { label: 'Parallel requests', value: '8 × finance.refund $120' },
      { label: 'Backend effects', value: '8 refunds (expected 1)' },
      { label: 'Measured', value: '26 Oct 2026, 11:21 AM PT' },
      { label: 'Revisions', value: 'sandbox 6ae2514 · ARC aa2f37c', mono: true },
      { label: 'Source', value: 'src/phase2.mjs:463 · docs/PHASE_2_READINESS.md', mono: true },
    ],
    remediation: {
      stage: 'proposed',
      proposal:
        'Make idempotency atomic. Two callers with the same agent, tool and key must not both pass the replay check. Lock the duplicate refunds with a regression test.',
      improvementRef: 'Product improvement #1',
    },
  },
  {
    id: 'policy-change-before-release',
    code: 'MER-F-002',
    kind: 'failure',
    title: 'Stricter policy ignored at approval release',
    severity: 'High',
    status: 'Open · not patched in ARC Control',
    checkId: 'policy-change-before-release',
    actionId: 'policy-change-before-release',
    component: 'ARC gateway · resume()',
    summary: 'A refund held for approval executed after an always-deny policy was published. New requests under that policy were denied.',
    expected: 'Release refused; zero refunds',
    observed: 'HTTP 200 executed; one refund',
    expectedValue: 'DENY',
    observedValue: 'EXECUTED',
    rootCause:
      '`resume` re-checks the kill switch and the agent status. It does not evaluate the policies in force at release time; it executes the decision stored when the action was submitted.',
    steps: [
      'Start the integrated stack: npm start.',
      'As finance-agent, request finance.refund { customer: "cus-101", amount: 1850 } → pending_approval under MER-FIN-001/manager-approval.',
      'Publish MER-P2-DENY-QUEUED: matches finance.refund, rule deny-queued, effect DENY.',
      'Vote approve on the held approval as finance-manager → HTTP 200.',
      'POST /v1/approvals/:id/execute. Observed: HTTP 200, outcome executed, one refund.',
      'Control check: a new $1,850 request under the same policy is denied (strictest-wins works for new work).',
    ],
    assertion:
      "must(released.body?.outcome !== 'executed' && effects === 0, `queued refund was released after a stricter policy …`)",
    evidence: [
      { label: 'Phase 2 check', value: 'policy-change-before-release', mono: true },
      { label: 'Held amount', value: '$1,850 · finance.refund' },
      { label: 'Policy published while open', value: 'MER-P2-DENY-QUEUED (always DENY)', mono: true },
      { label: 'Release response', value: 'HTTP 200 · outcome executed' },
      { label: 'Backend effects', value: '1 refund (expected 0)' },
      { label: 'Measured', value: '26 Oct 2026, 11:21 AM PT' },
      { label: 'Source', value: 'src/phase2.mjs:501 · docs/PHASE_2_READINESS.md', mono: true },
    ],
    remediation: {
      stage: 'proposed',
      proposal:
        'Re-evaluate current policy inside resume before the connector runs. A deny published while the approval is open should win, as it already does for a new request. Keep the existing kill-switch and agent-status checks.',
      improvementRef: 'Product improvement #2',
    },
  },
  {
    id: 'operator-role-header-asserted',
    code: 'MER-L-001',
    kind: 'limitation',
    title: 'Operator role is a request header',
    severity: 'Medium',
    status: 'Limitation reproduced · check passes',
    checkId: 'operator-role-header-asserted',
    component: 'ARC operator auth',
    summary: 'The shared operator token accepted an arbitrary identity and role supplied in headers.',
    expected: 'Identity from a directory',
    observed: 'unrelated-person@example.com + security-manager accepted',
    rootCause: 'One shared bearer token; identity and roles are taken from x-arc-operator headers. No directory is consulted.',
    steps: ['Vote on a held CRM export using the shared token with x-arc-operator: unrelated-person@example.com and role security-manager.', 'Observe HTTP 200 and status rejected.'],
    evidence: [{ label: 'Phase 2 check', value: 'operator-role-header-asserted', mono: true }],
    remediation: { stage: 'proposed', proposal: 'Replace the shared operator token and role headers with individual credentials before any shared deployment.', improvementRef: 'Product improvement #4' },
    note: 'This check passes because it asserts the limitation exists. It is not a control holding.',
  },
  {
    id: 'connector-timeout-after-effect',
    code: 'MER-L-002',
    kind: 'limitation',
    title: 'Timeout is not exactly-once',
    severity: 'Medium',
    status: 'Limitation reproduced · check passes',
    checkId: 'connector-timeout-after-effect',
    component: 'GenericHttpConnector',
    summary: 'The probe applied its effect then hung. ARC recorded timeout/failed; Meridian kept one effect and nothing compensated it.',
    expected: 'Reconciliation item raised',
    observed: 'failed outcome · 1 orphaned effect',
    rootCause: 'A timeout after a possible effect is reported honestly as failed, but there is no compensation or reconciliation queue. Writes are correctly not retried.',
    steps: ['Register a probe tool pointing at /internal/fault/effect-then-hang.', 'Call it; the backend records an effect then hangs past the 5 s connector timeout.', 'Observe ARC outcome failed and one Meridian fault effect.'],
    evidence: [{ label: 'Phase 2 check', value: 'connector-timeout-after-effect', mono: true }],
    remediation: { stage: 'proposed', proposal: 'Treat a timeout after a possible effect as an operator reconciliation item.', improvementRef: 'Product improvement #3' },
    note: 'This check passes because it asserts the limitation exists. It is not a control holding.',
  },
  {
    id: 'audit-self-check-limit',
    code: 'MER-L-003',
    kind: 'limitation',
    title: 'Audit self-check cannot see a missing tail',
    severity: 'Low',
    status: 'Limitation reproduced · check passes',
    checkId: 'audit-self-check-limit',
    component: 'ARC audit · MemoryStore',
    summary: 'GET /v1/audit/verify is valid and discloses truncation. MemoryStore has no recorded head, so a truncated tail is invisible without a caller-supplied head.',
    expected: 'Externally anchored head',
    observed: 'Valid, with truncation notice',
    rootCause: 'No audit head is stored outside the API process. A caller-supplied head detects a short copy, but that head lived only in the test.',
    steps: ['Call GET /v1/audit/verify without a head.', 'Observe valid: true with a truncation notice.'],
    evidence: [{ label: 'Phase 2 check', value: 'audit-self-check-limit', mono: true }],
    remediation: { stage: 'proposed', proposal: 'Keep an audit head outside the process that serves the API.', improvementRef: 'Product improvement #6' },
    note: 'This check passes because it asserts the limitation exists. It is not a control holding.',
  },
]

export const STAGES: { id: RemediationStage; label: string }[] = [
  { id: 'proposed', label: 'Fix proposed' },
  { id: 'patched', label: 'Patched in ARC' },
  { id: 'regression', label: 'Regression passing' },
  { id: 'verified', label: 'Verified here' },
]

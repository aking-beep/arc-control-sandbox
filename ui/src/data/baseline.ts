/**
 * BASELINE — the latest committed measurement, recorded in docs/VALIDATION_LAB.md
 * (26 Oct 2026, ARC Control 162d00d). The earlier run against ARC aa2f37c is in
 * docs/PHASE_2_READINESS.md. Shown only when neither a run on the current server
 * nor a saved reports/*.json is available, and always labelled as such.
 */
export const BASELINE_NOTE = 'Measured 26 Oct 2026 against ARC 162d00d (docs/VALIDATION_LAB.md) · not re-run in this session'

export const integrationBaseline = { passed: 17, total: 17, label: 'Original integration' }

export const phase2Baseline = { pass: 30, fail: 3, unsupported: 5, notImplemented: 1 }
export const phase2Total = phase2Baseline.pass + phase2Baseline.fail + phase2Baseline.unsupported + phase2Baseline.notImplemented

/** After Phase 2 and stress on the same process; probe agents and disabled probe tools count against 001/002/005/008. */
export const assuranceBaseline = { pass: 2, fail: 4, not_assessable: 2, not_applicable: 1, attested: 0 } as const

/**
 * `regression_passing` means the Phase 2 check passed on some run. It is not
 * `resolved`: that needs the ARC fix to be independently retested, which this
 * UI cannot observe, so nothing here ever sets it.
 */
export type FindingStage = 'open' | 'fix_proposed' | 'regression_passing' | 'resolved'

export interface Finding {
  id: string
  title: string
  /** Short label for pickers. */
  short: string
  severity: 'critical' | 'high'
  component: string
  control: string
  summary: string
  /** The Phase 2 check (phase2.mjs) whose result drives this finding. */
  check: string
  reproduction: string[]
  expected: { label: string; value: string }
  /** Last committed observation. Replaced by live or saved results when present. */
  baselineActual: { label: string; value: string; effects: number | null }
  expectedEffects: number
  /** Reads the observed value out of the check's failure message. */
  describe: (error?: string) => { effects: number | null; label: string } | null
  evidence: string
  relatedScenario: string
}

export const FINDINGS: Finding[] = [
  {
    id: 'ARC-SEC-001',
    title: 'Concurrent idempotency failure',
    short: 'Parallel duplicates',
    severity: 'critical',
    component: 'ARC action gateway · idempotency handling under concurrent requests',
    control: 'Execution integrity — one authorization yields at most one effect (invariant 4)',
    summary: 'Eight simultaneous refund requests sharing one idempotency key produced eight refunds.',
    check: 'concurrent-idempotency',
    reproduction: [
      'Send 8 parallel POST /v1/actions as finance-agent: tool finance.refund, customer cus-101, amount 120, one shared idempotencyKey.',
      'Each request is evaluated by MER-FIN-001 → ALLOW (under-500).',
      'Count finance.refund entries added to the Meridian mutation log. The check repeats this for 5 rounds and stops at the first round that is not exactly 1.',
    ],
    expected: { label: 'Refunds executed', value: '1' },
    baselineActual: { label: 'Refunds executed', value: '8', effects: 8 },
    expectedEffects: 1,
    describe: e => { const m = e?.match(/produced (\d+) refunds/); return m ? { effects: Number(m[1]), label: m[1] } : null },
    evidence: 'phase2.mjs returns only the failing round and its refund count; per-request evidence ids are not collected by the check.',
    relatedScenario: 'idempotency',
  },
  {
    id: 'ARC-SEC-002',
    title: 'Execution-time policy revalidation failure',
    short: 'Stale approval',
    severity: 'critical',
    component: 'ARC approval release · resume() executes the decision stored at submit time',
    control: 'Authorization currency — release must satisfy the policy in force at release time',
    summary: 'A held $1,850 refund was released and executed after a deny policy for finance.refund had been published.',
    check: 'policy-change-before-release',
    reproduction: [
      'finance-agent requests a $1,850 refund → REQUIRE_APPROVAL under MER-FIN-001 / manager-approval.',
      'Publish MER-P2-DENY-QUEUED: always DENY for finance.refund.',
      'Operator votes approve on the held request.',
      'Operator releases it with POST /v1/approvals/:id/execute and the refund log is counted. The temporary policy is then disabled.',
    ],
    expected: { label: 'Release outcome', value: 'Refused · 0 refunds' },
    baselineActual: { label: 'Release outcome', value: 'Executed · 1 refund', effects: 1 },
    expectedEffects: 0,
    describe: e => { const m = e?.match(/outcome (\w+), effects (\d+)\)/); return m ? { effects: Number(m[2]), label: `${m[1][0].toUpperCase()}${m[1].slice(1)} · ${m[2]} refund${m[2] === '1' ? '' : 's'}` } : null },
    evidence: 'phase2.mjs reports the release HTTP status, outcome and effect count in its error string; it does not collect evidence ids.',
    relatedScenario: 'refund-approve',
  },
  {
    id: 'ARC-SEC-003',
    title: 'Retired agent can be reactivated',
    short: 'Retired agent revived',
    severity: 'high',
    component: 'ARC control API · POST /v1/agents/:id/activate → admin.setAgentStatus → registry.resume()',
    control: 'Identity lifecycle — retirement is final; a withdrawn agent can only return by being registered again',
    summary: 'After retiring an agent, POST /v1/agents/:id/activate returned HTTP 200 instead of 409. First observed against ARC 162d00d; the same check passed against aa2f37c.',
    check: 'retired-agent-final',
    reproduction: [
      'Register a throwaway agent and issue it a key.',
      'POST /v1/agents/:id/retire → 200, status retired, credentials revoked.',
      'POST /v1/agents/:id/activate. Expected 409 conflict.',
      'In 162d00d the route calls admin.setAgentStatus(…, \'active\'), which calls registry.resume() → #setStatus. That path skips the retired guard that registry.activate() has (read from source, not executed separately).',
    ],
    expected: { label: 'Activate response', value: 'HTTP 409' },
    baselineActual: { label: 'Activate response', value: 'HTTP 200', effects: 1 },
    expectedEffects: 0,
    describe: e => { const m = e?.match(/activate retired agent HTTP (\d+)/); return m ? { effects: m[1] === '409' ? 0 : 1, label: `HTTP ${m[1]}` } : null },
    evidence: 'phase2.mjs stops at the first failed assertion, so the follow-up check that the revoked key is still refused was not reached.',
    relatedScenario: 'suspend-agent',
  },
]

export const LIMITATIONS: Array<{ title: string; detail: string; control?: string }> = [
  { title: 'Operator identity is header-asserted', detail: 'ARC 2.0 takes operator identity and roles from x-arc-operator headers behind a shared bearer token. A demo approval does not establish an authenticated employee.' },
  { title: 'Ambiguous outcome after connector timeout', detail: 'Phase 2 reproduced this: the backend applied the effect, ARC recorded timeout/failed, nothing compensated it. Treat such outcomes as unknown, not as “no effect”.' },
  { title: 'Audit verification is not externally anchored', detail: 'The audit chain is checked internally. No head is stored outside ARC credentials, so truncation is not independently detectable.', control: 'ARC-AI-006' },
  { title: 'No verified cross-tenant isolation', detail: 'Multi-organization isolation is not implemented or tested.' },
  { title: 'Enterprise identity infrastructure incomplete', detail: 'No SSO, RBAC or authenticated operator sessions.' },
  { title: 'Network segmentation incomplete', detail: 'Internal endpoints refuse calls without the connector token. That is an application restriction, not proof that no alternative network route exists.', control: 'ARC-AI-009' },
  { title: 'Runtime MCP drift enforcement incomplete', detail: 'Pinned manifest checks do not replace on-demand drift tests.', control: 'ARC-AI-007' },
  { title: 'Local, in-memory, single process', detail: 'Stress figures describe a laptop loopback run with an in-memory store. They are not production capacity.' },
]

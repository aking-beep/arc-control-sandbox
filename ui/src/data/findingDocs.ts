/**
 * Narrative documentation for the two open ARC Control defects.
 *
 * WHAT THIS FILE IS: the prose — reproduction steps, the affected control, the
 * product fix — transcribed from docs/PHASE_2_READINESS.md. It is repository
 * documentation and is tagged `repository` on screen.
 *
 * WHAT THIS FILE IS NOT: a result. There are deliberately no pass/fail counts
 * and no observed values here. Every verdict is derived from a live
 * Phase 2 record keyed by `phase2Id`, via deriveFindings() below. A finding
 * with no live record reads "not retested", never "passing".
 */
import type { Phase2Result, ResultStatus } from '../api/types'

export const DOC_NOTE = 'Narrative from docs/PHASE_2_READINESS.md · verdicts are read live from POST /api/phase2'

export type FindingStage = 'unverified' | 'open' | 'fix_proposed' | 'regression_passing' | 'resolved'

export interface FindingDoc {
  id: string
  /** The phase2.mjs catalogue id whose live result decides this finding's state. */
  phase2Id: string
  title: string
  severity: 'critical' | 'high'
  component: string
  control: string
  summary: string
  reproduction: string[]
  /** What ARC Control should do. */
  expected: { label: string; value: string }
  /** What docs/PHASE_2_READINESS.md recorded it doing. Shown as the documented
   *  observation, and replaced on screen by the live assertion message. */
  documentedActual: { label: string; value: string }
  /** The ARC Control change that would close this finding. */
  remediation: string
  /** An original-17 scenario that is adjacent but does NOT close this finding. */
  relatedScenario: string
}

export const FINDING_DOCS: FindingDoc[] = [
  {
    id: 'ARC-SEC-001',
    phase2Id: 'concurrent-idempotency',
    title: 'Concurrent idempotency failure',
    severity: 'critical',
    component: 'ARC action gateway · idempotency handling under concurrent requests',
    control: 'Execution integrity — one authorization yields at most one effect',
    summary: 'Eight simultaneous refund requests sharing one idempotency key each produced a refund.',
    reproduction: [
      'Issue 8 parallel POST /v1/actions as finance-agent, tool finance.refund, amount 120, identical idempotencyKey.',
      'Each request is independently evaluated by MER-FIN-001 → ALLOW (under-500).',
      'Count finance.refund entries added to the Meridian mutation log.',
    ],
    expected: { label: 'Refunds executed', value: '1' },
    documentedActual: { label: 'Refunds executed', value: '8' },
    remediation: 'Make idempotency atomic: submit() records the action and only then looks for an earlier evidence row, so overlapping callers never see each other. Two callers with the same agent, tool and key must not both pass the replay check.',
    relatedScenario: 'idempotency',
  },
  {
    id: 'ARC-SEC-002',
    phase2Id: 'policy-change-before-release',
    title: 'Execution-time policy revalidation failure',
    severity: 'critical',
    component: 'ARC approval execution · policy evaluated at request time only',
    control: 'Authorization currency — execution must satisfy the policy in force at execution time',
    summary: 'A refund approved under one policy executed after a newly published deny policy became effective.',
    reproduction: [
      'finance-agent requests a $1,850 refund inside the manager-approval band → REQUIRE_APPROVAL under MER-FIN-001.',
      'Publish a new always-deny policy for finance.refund.',
      'Vote the pending approval, then release it.',
    ],
    expected: { label: 'Execution outcome', value: 'Refused under new policy' },
    documentedActual: { label: 'Execution outcome', value: 'Refund executed' },
    remediation: 'Re-evaluate current policy inside resume() before the connector runs. A deny published while the approval is open should win, as it already does for a new request. Keep the kill-switch and agent-status checks that already run there.',
    relatedScenario: 'refund-approve',
  },
  {
    id: 'ARC-SEC-003',
    phase2Id: 'retired-agent-final',
    title: 'Retirement is reversible through the activate route',
    severity: 'high',
    component: 'ARC Control API · POST /v1/agents/:id/activate',
    control: 'Credential lifecycle — retirement is final, so a retired identity cannot be brought back',
    summary: 'Activating a retired agent returned HTTP 200 instead of 409. The route reaches resume(), which has no retirement guard.',
    reproduction: [
      'POST /v1/agents to register an agent, then POST /v1/agents/:id/keys to issue a credential.',
      'POST /v1/agents/:id/retire — returns 200 with status retired and revokes the credential.',
      'POST /v1/agents/:id/activate — expected HTTP 409 conflict.',
    ],
    expected: { label: 'Activate a retired agent', value: 'HTTP 409 conflict' },
    documentedActual: { label: 'Activate a retired agent', value: 'HTTP 200, agent active again' },
    remediation: 'Route POST /v1/agents/:id/activate through AgentRegistry.activate(), which already refuses a retired agent, instead of GatewayAdmin.setAgentStatus(id, \'active\') → resume(). resume() is the suspend/unsuspend path and has no retirement guard, so the only HTTP route to activation bypasses the invariant the registry documents. Retire() does revoke the agent\'s credentials, so the old key stays dead — but the identity becomes active and an operator can issue a fresh key, which makes retirement reversible and unaudited as a re-registration.',
    relatedScenario: 'suspend-agent',
  },
]

/** A finding joined to its live Phase 2 result. */
export interface Finding extends FindingDoc {
  /** Live status of `phase2Id`. NOT_RUN means not retested in this window. */
  status: ResultStatus
  stage: FindingStage
  /** The runner's own assertion message — the live observation, not a transcription. */
  observed: string | null
  at: string | null
  elapsedMs: number | null
  /** Plain-language note about what the live record does and does not establish. */
  verdict: string
}

/**
 * Join documentation to live Phase 2 records.
 *
 * A finding is only ever downgraded by evidence:
 *   no record  → 'unverified'           (the check has not run in this window)
 *   fail       → 'open'                 (the defect reproduced)
 *   pass       → 'regression_passing'   (the assertion held on this process)
 *
 * It never reaches 'resolved' from this screen. Closing a finding needs the
 * ARC Control fix plus an independent retest, which this sandbox cannot assert
 * on its own.
 */
export function deriveFindings(latestById: Map<string, Phase2Result>): Finding[] {
  return FINDING_DOCS.map(doc => {
    const run = latestById.get(doc.phase2Id)
    if (!run) {
      return {
        ...doc, status: 'NOT_RUN' as ResultStatus, stage: 'unverified' as FindingStage,
        observed: null, at: null, elapsedMs: null,
        verdict: `Not retested in this window. Run the ${doc.phase2Id} check to observe the current behaviour.`,
      }
    }
    if (run.status === 'fail') {
      return {
        ...doc, status: 'FAIL' as ResultStatus, stage: 'open' as FindingStage,
        observed: run.error ?? null, at: run.at ?? null, elapsedMs: run.elapsedMs ?? null,
        verdict: 'The defect reproduced on this run. The finding stays open.',
      }
    }
    return {
      ...doc, status: 'PASS' as ResultStatus, stage: 'regression_passing' as FindingStage,
      observed: null, at: run.at ?? null, elapsedMs: run.elapsedMs ?? null,
      verdict: 'The assertion held on this run. That is one observation on this local process, not a closed finding — it stays listed until the ARC Control fix is confirmed and independently retested.',
    }
  })
}

export const LIMITATIONS: Array<{ title: string; detail: string; control?: string }> = [
  { title: 'Operator identity is header-asserted', detail: 'ARC 2.0 takes operator identity and roles from x-arc-operator headers behind a shared bearer token. A demo approval does not establish an authenticated employee.' },
  { title: 'Ambiguous outcome after connector timeout', detail: 'If the connector times out after Meridian applied the effect, ARC records timeout and failed. Meridian keeps the effect and nothing compensates it.' },
  { title: 'Audit verification is not externally anchored', detail: 'The audit chain is checked internally. MemoryStore records no head outside ARC, so truncation is not independently detectable.', control: 'ARC-AI-006' },
  { title: 'No verified cross-tenant isolation', detail: 'Multi-organization isolation is not implemented or tested.' },
  { title: 'Enterprise identity infrastructure incomplete', detail: 'No SSO, RBAC or authenticated operator sessions.' },
  { title: 'Network segmentation incomplete', detail: 'Internal endpoints refuse calls without the connector token. That is an application restriction, not proof that no alternative network route exists.', control: 'ARC-AI-009' },
  { title: 'Runtime MCP drift enforcement incomplete', detail: 'detectDrift reports a changed manifest. The gateway does not pin a manifest onto a tool or refuse calls when that pin breaks.', control: 'ARC-AI-007' },
  { title: 'Local, in-memory, single process', detail: 'Stress figures describe a laptop loopback run with an in-memory store. They are not production capacity.' },
]

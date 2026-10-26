import type { Trace } from '../lib/trace'
import type { FindingState } from '../lib/findings'
import { policyForTool } from './registry'

/**
 * Traces for the two findings, built from the reproducing Phase 2 check.
 *
 * Request shape and sequence are copied from phase2.mjs. The observed effect
 * count comes from the latest result (live run, saved report, or the committed
 * baseline, in that order). Anything the check does not return (per-request
 * evidence ids, correlation ids, timestamps per step) stays null and renders as
 * "not returned by check".
 */
const finRules = policyForTool('finance.refund')!.rules

type Static = Omit<Trace, 'source' | 'actualEffect' | 'actualEffectBasis' | 'pass' | 'error' | 'at' | 'elapsedMs'>

const BASE: Record<string, Static> = {
  'ARC-SEC-001': {
    key: 'finding-ARC-SEC-001',
    findingId: 'ARC-SEC-001',
    scenarioId: 'concurrent-idempotency',
    label: 'Concurrent idempotency — 8 parallel requests, one key',
    agent: 'finance-agent',
    tool: 'finance.refund',
    params: { customer: 'cus-101', amount: 120, idempotencyKey: 'p2-<uuid>, shared by all 8', requests: '8 in parallel, up to 5 rounds' },
    requested: '8 identical refunds sent at once, sharing one idempotency key',
    correlationId: null,
    authentication: 'Agent key accepted (×8)',
    policyId: 'MER-FIN-001',
    rules: finRules,
    inferredRule: 'under-500',
    decision: 'ALLOW',
    outcome: 'executed',
    httpStatus: null,
    approvalState: 'No approval required',
    executionAuthorized: true,
    evidenceId: null,
    evidenceReadable: null,
    targetSystem: '/internal/finance/refund',
    connector: 'meridian-http (GenericHttpConnector)',
    expectedEffect: 1,
    latencyMs: null,
    parallel: 8,
    headline: { request: '8 × $120 refunds requested', decision: 'ALLOW × 8', decisionSub: 'MER-FIN-001 / under-500, evaluated separately for each request' },
    expectedBehaviour: 'Evaluate the action once. Return the first result to the 7 duplicates with no further effect.',
    observedBehaviour: 'submit records the action before it looks for an earlier evidence row with the same key, so overlapping callers never see each other. Each request executed.',
  },
  'ARC-SEC-002': {
    key: 'finding-ARC-SEC-002',
    findingId: 'ARC-SEC-002',
    scenarioId: 'policy-change-before-release',
    label: 'Stricter policy published while an approval is open',
    agent: 'finance-agent',
    tool: 'finance.refund',
    params: { customer: 'cus-101', amount: 1850 },
    requested: 'Refund $1,850 to cus-101 (manager-approval band)',
    correlationId: null,
    authentication: 'Agent key accepted',
    policyId: 'MER-FIN-001',
    rules: finRules,
    inferredRule: 'manager-approval',
    decision: 'REQUIRE_APPROVAL',
    outcome: null,
    httpStatus: null,
    approvalState: 'Held → MER-P2-DENY-QUEUED published → approved → released',
    executionAuthorized: true,
    evidenceId: null,
    evidenceReadable: null,
    targetSystem: '/internal/finance/refund',
    connector: 'meridian-http (GenericHttpConnector)',
    expectedEffect: 0,
    latencyMs: null,
    headline: { request: '$1,850 refund requested', decision: 'HELD → RELEASED', decisionSub: 'Held under MER-FIN-001 / manager-approval; MER-P2-DENY-QUEUED not applied at release' },
    expectedBehaviour: 'At release, evaluate the policies then in force. MER-P2-DENY-QUEUED denies finance.refund, so release is refused with zero effect.',
    observedBehaviour: 'resume re-checks the kill switch and agent status only, then executes the decision stored at submit time. The refund executed.',
  },
  'ARC-SEC-003': {
    key: 'finding-ARC-SEC-003',
    findingId: 'ARC-SEC-003',
    scenarioId: 'retired-agent-final',
    label: 'Retired agent reactivated through the activate route',
    agent: 'operator (shared token, header-asserted identity)',
    tool: 'POST /v1/agents/:id/activate',
    params: { agent: 'p2-retire-<id>, retired with credentials revoked', method: 'POST', path: '/v1/agents/:id/activate' },
    requested: 'Reactivate an agent that was retired',
    correlationId: null,
    authentication: 'Operator token accepted',
    policyId: null,
    rules: [],
    inferredRule: null,
    decision: null,
    outcome: null,
    httpStatus: null,
    approvalState: 'Not applicable (operator lifecycle call)',
    executionAuthorized: true,
    evidenceId: null,
    evidenceReadable: null,
    targetSystem: 'ARC agent registry',
    connector: 'none — no Meridian call involved',
    expectedEffect: 0,
    effectUnit: 'status change',
    latencyMs: null,
    headline: { request: 'Activate a retired agent', decision: 'ACCEPTED · HTTP 200', decisionSub: 'setAgentStatus → registry.resume() skips the retired guard in registry.activate()' },
    expectedBehaviour: 'Refuse with 409 conflict. A retired agent comes back only by being registered again, so the return is visible.',
    observedBehaviour: 'The activate route returned 200. Its status setter does not check for retirement, so the agent can be set active again.',
  },
}

export const FINDING_TRACE_IDS = Object.keys(BASE)

export function findingTraceFor(s: FindingState): Trace {
  const base = BASE[s.finding.id]
  const passed = s.checkStatus === 'PASS'
  const sec3 = s.finding.id === 'ARC-SEC-003'
  return {
    ...base,
    source: s.source,
    at: s.at,
    outcome: passed ? (s.finding.id === 'ARC-SEC-002' ? 'refused at release' : sec3 ? 'refused (409)' : 'executed once') : sec3 ? (s.observedLabel ?? null) : base.outcome ?? (s.observedEffects ? 'executed' : null),
    actualEffect: s.observedEffects,
    actualEffectBasis: s.source === 'baseline' ? 'Committed Phase 2 measurement (docs/PHASE_2_READINESS.md)'
      : passed ? `Check passed (${s.source === 'live' ? 'this server' : s.sourceNote})`
        : s.observedEffects === null ? 'Not reported by the check' : `Parsed from check error (${s.source === 'live' ? 'this server' : s.sourceNote})`,
    pass: s.checkStatus === 'PASS' ? true : s.checkStatus === 'FAIL' ? false : null,
    error: s.error ?? null,
    elapsedMs: s.check?.run?.elapsedMs ?? null,
    ...(passed ? { headline: { ...base.headline, decision: s.finding.id === 'ARC-SEC-002' ? 'HELD → REFUSED' : sec3 ? 'REFUSED · HTTP 409' : 'ALLOW · deduplicated' } } : {}),
  }
}

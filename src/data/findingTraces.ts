import type { Trace } from '../lib/trace'
import { policyForTool } from './registry'

/**
 * BASELINE traces for the two open findings.
 *
 * Reconstructed only from the user-reported Phase 2 results and the reproduction
 * steps in data/baseline.ts. Anything those sources do not state — timestamps,
 * evidence ids, customer, exact amount for ARC-SEC-002 — stays null and renders
 * as "awaiting report". Replace with RECORDED traces once GET /api/reports/phase2
 * (proposed) returns per-request records.
 */
const finRules = policyForTool('finance.refund')!.rules

export const FINDING_TRACES: Trace[] = [
  {
    key: 'finding-ARC-SEC-001',
    source: 'baseline',
    findingId: 'ARC-SEC-001',
    scenarioId: 'P2-IDEM-CONCURRENT',
    label: 'Concurrent idempotency — 8 parallel requests, one key',
    agent: 'finance-agent',
    tool: 'finance.refund',
    params: { amount: 120, idempotencyKey: '<one shared key>', requests: '8, sent in parallel' },
    requested: '8 identical refunds sent at once, sharing one idempotency key',
    correlationId: null,
    authentication: 'Agent key accepted (×8)',
    policyId: 'MER-FIN-001',
    rules: finRules,
    inferredRule: 'under-500',
    decision: 'ALLOW',
    outcome: 'executed ×8',
    httpStatus: null,
    approvalState: 'No approval required',
    executionAuthorized: true,
    evidenceId: null,
    evidenceReadable: null,
    targetSystem: '/internal/finance/refund',
    connector: 'meridian-http (GenericHttpConnector)',
    expectedEffect: 1,
    actualEffect: 8,
    actualEffectBasis: 'User-reported Phase 2 baseline',
    pass: false,
    error: 'Idempotency key not enforced across concurrent requests',
    latencyMs: null,
    elapsedMs: null,
    parallel: 8,
    headline: { request: '8 × $120 refunds requested', decision: 'ALLOW × 8', decisionSub: 'MER-FIN-001 / under-500, evaluated 8 separate times' },
    expectedBehaviour: 'Evaluate the action once. Collapse the 7 duplicates onto the first and return its result with no further effect.',
    observedBehaviour: 'Each of the 8 requests was authorized and executed on its own. The shared idempotency key did not stop any of them.',
  },
  {
    key: 'finding-ARC-SEC-002',
    source: 'baseline',
    findingId: 'ARC-SEC-002',
    scenarioId: 'P2-POLICY-REVALIDATE',
    label: 'Policy change before execution of an approved action',
    agent: 'finance-agent',
    tool: 'finance.refund',
    params: { amount: 'in manager-approval band (500–2,500) · exact value awaiting report' },
    requested: 'Refund inside the manager-approval band',
    correlationId: null,
    authentication: 'Agent key accepted',
    policyId: 'MER-FIN-001',
    rules: finRules,
    inferredRule: 'manager-approval',
    decision: 'REQUIRE_APPROVAL',
    outcome: 'executed',
    httpStatus: null,
    approvalState: 'Approved under v1 — not rechecked after the deny policy took effect',
    executionAuthorized: true,
    evidenceId: null,
    evidenceReadable: null,
    targetSystem: '/internal/finance/refund',
    connector: 'meridian-http (GenericHttpConnector)',
    expectedEffect: 0,
    actualEffect: 1,
    actualEffectBasis: 'User-reported Phase 2 baseline',
    pass: false,
    error: 'Policy not re-evaluated at execution time',
    latencyMs: null,
    elapsedMs: null,
    headline: { request: 'Manager-band refund requested', decision: 'APPROVED → EXECUTED', decisionSub: 'Held under MER-FIN-001 v1 / manager-approval; v2 deny never applied' },
    expectedBehaviour: 'At execution, re-evaluate against the policy then in force and refuse under the new deny rule. Zero effect.',
    observedBehaviour: 'Executed on the strength of the earlier approval. The deny policy that was already in effect was not consulted.',
  },
]

export const findingTrace = (id: string) => FINDING_TRACES.find(t => t.findingId === id)

import type { ArcDecisionEffect, ScenarioRun, DataSource } from '../api/types'
import { ORIGINAL } from '../data/catalog'
import { policyForTool, toolDef } from '../data/registry'
import type { PolicyRule } from '../data/registry'
import { decisionOf } from './status'

/** Request parameters per scenario, copied from scenarios.mjs perform(). */
const PARAMS: Record<string, Record<string, unknown>> = {
  'refund-allow': { customer: 'cus-101', amount: 120 },
  'refund-pending': { customer: 'cus-101', amount: 1800 },
  'refund-approve': { customer: 'cus-101', amount: 1800 },
  'refund-deny': { customer: 'cus-101', amount: 4200 },
  'wrong-agent': { customer: 'cus-101', amount: 120 },
  'unknown-tool': { account: 'secret', amount: 4000 },
  'wrong-type': { customer: 'cus-101', amount: '120' },
  'suspend-agent': { customer: 'cus-101', amount: 120 },
  'disable-tool': { customer: 'cus-101', amount: 120 },
  'idempotency': { customer: 'cus-101', amount: 120, idempotencyKey: 'meridian-<uuid> (×2)' },
  'support-allow': { ticketId: 'T-1001', status: 'resolved' },
  'protected-deploy': { service: 'checkout', branch: 'main' },
  'development-deploy': { service: 'checkout', branch: 'develop' },
  'export-pending': { scope: 'all' },
  'operator-isolation': { method: 'GET', path: '/v1/policies' },
  'direct-bypass': { customer: 'cus-101', amount: 120, header: 'x-meridian-connector-token: (absent)' },
  'approval-replay': { customer: 'cus-101', amount: 1700 },
}

/** Expected Meridian mutation count per scenario, from scenarios.mjs assertions. */
const EXPECTED_EFFECTS: Record<string, number> = {
  'refund-allow': 1, 'refund-pending': 0, 'refund-approve': 1, 'refund-deny': 0, 'wrong-agent': 0,
  'unknown-tool': 0, 'wrong-type': 0, 'suspend-agent': 0, 'disable-tool': 0, 'idempotency': 1,
  'support-allow': 1, 'protected-deploy': 0, 'development-deploy': 1, 'export-pending': 0,
  'operator-isolation': 0, 'direct-bypass': 0, 'approval-replay': 1,
}

export interface Trace {
  key: string
  source: DataSource
  scenarioId: string
  label: string
  at?: string
  agent: string
  tool: string
  params: Record<string, unknown>
  requested: string
  correlationId: string | null
  authentication: string
  policyId: string | null
  rules: PolicyRule[]
  inferredRule: string | null
  decision: ArcDecisionEffect | null
  outcome: string | null
  httpStatus: number | null
  approvalState: string
  executionAuthorized: boolean
  evidenceId: string | null
  evidenceReadable: boolean | null
  targetSystem: string
  connector: string
  expectedEffect: number
  actualEffect: number | null
  actualEffectBasis: string
  pass: boolean | null
  error: string | null
  latencyMs: number | null
  elapsedMs: number | null
  /** Set on traces reconstructed from a security finding (BASELINE source). */
  findingId?: string
  /** Number of identical requests sent in parallel (ARC-SEC-001). */
  parallel?: number
  /** Verdict overrides where the generic wording would mislead. */
  headline?: { request?: string; decision?: string; decisionSub?: string }
  /** What ARC was contracted to do vs what it did, in plain sentences. */
  expectedBehaviour?: string
  observedBehaviour?: string
}

function inferRule(rules: PolicyRule[], decision: ArcDecisionEffect | null, params: Record<string, unknown>, agent: string, policyAgent: string): string | null {
  if (!decision) return null
  if (decision === 'DENY' && agent !== policyAgent) return 'different-agent'
  const amount = typeof params.amount === 'number' ? params.amount : null
  if (amount !== null && rules.some(r => r.id === 'under-500')) {
    if (amount < 500) return 'under-500'
    if (amount <= 2500) return 'manager-approval'
    return 'over-ceiling'
  }
  if (params.branch !== undefined) return ['main', 'master', 'release'].includes(String(params.branch)) ? 'protected-branch' : 'sandbox-deploy'
  return rules.find(r => r.effect === decision && r.id !== 'different-agent')?.id ?? null
}

export function traceFromRun(run: ScenarioRun): Trace {
  const spec = ORIGINAL.find(s => s.id === run.id)
  const d = decisionOf(run)
  const tool = spec?.tool ?? '—'
  const policy = toolDef(tool as never) ? policyForTool(tool as never) : undefined
  const params = PARAMS[run.id] ?? {}
  const agent = spec?.agent ?? '—'
  const expected = EXPECTED_EFFECTS[run.id] ?? 0
  const observedMatch = run.error?.match(/observed (\d+)|produced (\d+) effects/)
  const actual = run.pass ? expected : observedMatch ? Number(observedMatch[1] ?? observedMatch[2]) : null
  const policyAgent = policy?.rules[0]?.when.split('≠ ')[1] ?? ''
  return {
    key: `${run.id}-${run.at}`,
    source: 'live',
    scenarioId: run.id,
    label: run.label,
    at: run.at,
    agent, tool, params,
    requested: spec?.description ?? run.label,
    correlationId: null,
    authentication: d?.decision ? 'Agent key accepted' : d?.httpStatus === 401 || d?.httpStatus === 403 ? `Refused (HTTP ${d.httpStatus})` : d ? `Refused before decision (HTTP ${d.httpStatus})` : 'Not reported',
    policyId: d?.policyId ?? null,
    rules: policy?.rules ?? [],
    inferredRule: inferRule(policy?.rules ?? [], d?.decision ?? null, params, agent, policyAgent),
    decision: d?.decision ?? null,
    outcome: d?.outcome ?? null,
    httpStatus: d?.httpStatus ?? null,
    approvalState: d?.approvalId ? (d.outcome === 'executed' ? 'Approved and consumed' : 'Pending approval') : 'No approval required',
    executionAuthorized: d?.outcome === 'executed',
    evidenceId: d?.evidenceId ?? null,
    evidenceReadable: d?.evidencePresent ?? null,
    targetSystem: toolDef(tool as never)?.internalPath ?? tool,
    connector: 'meridian-http (GenericHttpConnector)',
    expectedEffect: expected,
    actualEffect: actual,
    actualEffectBasis: run.pass ? 'Asserted by runner against mutation log' : observedMatch ? 'Parsed from runner error' : 'Not reported by runner',
    pass: run.pass,
    error: run.error ?? null,
    latencyMs: d?.latencyMs ?? null,
    elapsedMs: run.elapsedMs,
  }
}

/** Illustrative example from the brief. Shown only until a real run is selected. */
export const ILLUSTRATIVE_TRACE: Trace = {
  key: 'illustrative-refund-deny',
  source: 'illustrative',
  scenarioId: 'refund-deny',
  label: 'Block over-ceiling refund ($4,200)',
  agent: 'finance-agent',
  tool: 'finance.refund',
  params: PARAMS['refund-deny'],
  requested: 'Refund $4,200 to Aster Logistics (cus-101)',
  correlationId: 'meridian-00000000-illustrative',
  authentication: 'Agent key accepted',
  policyId: 'MER-FIN-001',
  rules: policyForTool('finance.refund')!.rules,
  inferredRule: 'over-ceiling',
  decision: 'DENY',
  outcome: 'denied',
  httpStatus: null,
  approvalState: 'No approval required',
  executionAuthorized: false,
  evidenceId: 'ev_illustrative',
  evidenceReadable: null,
  targetSystem: '/internal/finance/refund',
  connector: 'meridian-http (GenericHttpConnector)',
  expectedEffect: 0,
  actualEffect: 0,
  actualEffectBasis: 'Illustrative',
  pass: true,
  error: null,
  latencyMs: null,
  elapsedMs: null,
}

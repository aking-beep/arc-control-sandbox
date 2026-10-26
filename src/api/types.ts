/**
 * Typed contracts for the Meridian sandbox HTTP API.
 *
 * Every shape below was read from aking-beep/arc-control-sandbox @ c1e8c05:
 *   company.mjs   — /api/health, /api/state, /api/scenarios, /api/reset, /api/load, /api/assurance
 *   scenarios.mjs — scenario specs, `show()` observation shape, load() result, assurance() result
 *   report.mjs    — reports/latest.json format
 *
 * Shapes marked UNVERIFIED come from ARC Control and were not available in the
 * sandbox checkout; confirm them against aking-beep/arc-control before relying on them.
 */

export type ToolName =
  | 'finance.refund'
  | 'support.ticket_update'
  | 'it.deploy'
  | 'sales.export_customers'
  | 'hr.salary_read'
  | 'security.quarantine'

export type ScenarioFamily =
  | 'authorization' | 'approvals' | 'identity' | 'tools' | 'input' | 'lifecycle'
  | 'kill-switch' | 'execution' | 'business' | 'policy' | 'data-security'
  | 'access' | 'bypass' | 'replay'

export type ExpectedOutcome = 'EXECUTED' | 'PENDING' | 'DENIED' | 'REFUSED' | 'ONCE'

export type ArcDecisionEffect = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL'

/** scenarios.mjs `specs[]` */
export interface ScenarioSpec {
  id: string
  label: string
  family: ScenarioFamily
  expected: ExpectedOutcome
}

/** scenarios.mjs `show()` */
export interface ObservedDecision {
  httpStatus: number
  outcome: string | null
  decision: ArcDecisionEffect | null
  policyId: string | null
  evidenceId: string | null
  /** true = evidence record fetched with HTTP 200. This is readability, NOT integrity verification. */
  evidencePresent: boolean | null
  approvalId: string | null
  latencyMs: number
  error: string | null
  backendEffects?: number
  approvedBy?: string
}

/** scenarios.mjs `approval-replay` return shape */
export interface ApprovalReplayObserved {
  first: ObservedDecision
  replayHttpStatus: number
  backendEffects: number
}

/** scenarios.mjs `guarded()` result */
export interface ScenarioRun extends ScenarioSpec {
  pass: boolean
  observed?: ObservedDecision | ApprovalReplayObserved
  error?: string
  elapsedMs: number
  at: string
}

export interface ScenariosResponse {
  scenarios: ScenarioSpec[]
  runs: ScenarioRun[]
}

export interface HealthResponse {
  status: 'ok'
  mode: 'synthetic'
  gatewayConfigured: boolean
}

export interface Customer { id: string; name: string; tier: string }
export interface Ticket { id: string; customerId: string; status: string; subject: string }
export interface Employee { id: string; name: string; department: string; salary: number }
export interface Order { id: string; customerId: string; total: number; status: string }
export interface Refund { id: string; customer: string; amount: number; status: 'refunded' }
export interface Deployment { id: string; branch: string; service: string; status: 'deployed' }
export interface ExportRecord { id: string; scope: string; recordCount: number; status: 'created' }
export interface Quarantine { id: string; resource: string; reason: string }

/** company.mjs mutationLog entry. NOTE: no correlationId, no before/after snapshot. */
export interface MutationRecord {
  tool: ToolName
  parameters: Record<string, unknown>
  at: string
}

/** GET /api/state */
export interface MeridianState {
  customers: Customer[]
  tickets: Ticket[]
  employees: Employee[]
  orders: Order[]
  refunds: Refund[]
  deployments: Deployment[]
  exports: ExportRecord[]
  quarantines: Quarantine[]
  mutationLog: MutationRecord[]
  runs: ScenarioRun[]
}

/** POST /api/load body. Runner clamps count to 1..1000 and concurrency to 1..25. */
export interface LoadRequest {
  count: number
  concurrency: number
}

export interface LoadSample {
  expected: 'executed' | 'pending_approval' | 'denied'
  actual: string
  timeMs: number
  evidence: boolean
  expectedEffect: 0 | 1
}

/** POST /api/load response */
export interface LoadResult {
  pass: boolean
  requested: number
  concurrency: number
  elapsedMs: number
  requestsPerSecond: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  expectedEffects: number
  observedEffects: number
  unexpectedOutcomes: number
  outcomeDistribution: { executed: number; pending_approval: number; denied: number }
  samples: LoadSample[]
}

export type AssuranceStatus = 'pass' | 'fail' | 'not_assessable' | 'not_applicable' | 'attested'

/** UNVERIFIED — ARC Control assurance summary. Only `totals` is referenced by the existing app.js. */
export interface AssuranceSummary {
  totals?: Partial<Record<AssuranceStatus, number>>
  controls?: Array<{ id: string; title?: string; status: AssuranceStatus; [k: string]: unknown }>
  [k: string]: unknown
}

/** POST /api/assurance response */
export interface AssuranceResult {
  pass: boolean
  run?: unknown
  summary?: AssuranceSummary
  error?: string
  response?: unknown
  disclaimer?: string
}

/** report.mjs output — reports/latest.json */
export interface IntegrationReport {
  generatedAt: string
  runner: string
  verification: string
  environment: { name: string; mode: string; gatewayConfigured: boolean }
  total: number
  passed: number
  failed: number
  passedAll: boolean
  results: ScenarioRun[]
}

/**
 * PROPOSED — Phase 2 security report format. No Phase 2 runner exists in
 * arc-control-sandbox@c1e8c05; this is the shape the UI accepts so a future
 * runner (or a hand-exported result) shows as RECORDED instead of BASELINE.
 */
export interface Phase2Report {
  suite: 'phase2'
  generatedAt: string
  runner: string
  verification?: string
  arcCommit?: string
  results: Array<{
    id: string
    label?: string
    category?: string
    status: 'PASS' | 'FAIL' | 'UNSUPPORTED' | 'NOT_IMPLEMENTED' | 'ERROR' | 'NOT_RUN'
    expected?: string
    observed?: string
    findingId?: string
    evidenceIds?: string[]
    at?: string
  }>
}

/* ── UI-side vocabulary ─────────────────────────────────────────────── */

export type ResultStatus = 'PASS' | 'FAIL' | 'NOT_RUN' | 'UNSUPPORTED' | 'NOT_IMPLEMENTED' | 'ERROR' | 'RUNNING'

export type VerificationState = 'internally_verified' | 'externally_anchored' | 'failed' | 'not_assessable'

/** Where a value on screen came from. Every number in the UI is tagged with one of these. */
export type DataSource = 'live' | 'recorded' | 'baseline' | 'repository' | 'illustrative' | 'proposed'

export type ResourceStatus = 'loading' | 'live' | 'unreachable' | 'not_implemented' | 'error'

export interface Resource<T> {
  status: ResourceStatus
  data?: T
  fetchedAt?: string
  error?: string
}

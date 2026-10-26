/**
 * Typed contracts for the Meridian sandbox HTTP API.
 *
 * Every shape below was read from the sandbox source on this branch:
 *   company.mjs        — /api/health, /api/state, /api/scenarios, /api/reset, /api/load,
 *                        /api/assurance, /api/stress, /api/phase2, /api/reports/:kind,
 *                        /api/arc/evidence/:id
 *   scenarios.mjs      — scenario specs, `show()` observation shape, load()/stress() results
 *   phase2.mjs         — Phase 2 catalogue, runOne() result, summarize()
 *   report.mjs         — reports/latest.json format
 *   phase2-report.mjs  — reports/phase2-latest.json format
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
  /** Correlation id the runner sent to ARC with the action. Absent on runs recorded before it was returned. */
  correlationId?: string | null
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
  phase2Configured?: boolean
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
  seed?: number | null
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
  samples: Array<Pick<LoadSample, 'expected' | 'actual' | 'evidence'> & Partial<LoadSample>>
  /** Present since the Phase 2 harness: non-refund mutations and fault effects must stay at zero. */
  seed?: number | null
  minMs?: number
  maxMs?: number
  otherMutations?: number
  faultDelta?: number
  unexpectedMutations?: boolean
  transportErrors?: number
  plan?: { executed: number; pending: number; denied: number }
}

export type StressPreset = '100' | '500' | '1000'

/** POST /api/stress response (scenarios.mjs stress()). One load() result per seed. */
export interface StressResult {
  preset: StressPreset | null
  count: number
  concurrency: number
  pass: boolean
  runs: LoadResult[]
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

/* ── Phase 2 (phase2.mjs) ───────────────────────────────────────────── */

export type Phase2Kind = 'implemented' | 'unsupported' | 'not_implemented'
export type Phase2Status = 'pass' | 'fail' | 'unsupported' | 'not_implemented'
export type Phase2Disposition = 'control_held' | 'limitation_reproduced' | 'control_failed' | 'unsupported' | 'not_implemented'

/** phase2.mjs CATALOGUE entry */
export interface Phase2Spec {
  id: string
  label: string
  family: string
  track: 'security' | 'reliability' | 'evidence'
  kind: Phase2Kind
  /** Set when a passing run reproduces a known limitation rather than a strong control. */
  disposition?: 'limitation_reproduced'
  /** Why an unsupported / not-implemented check cannot run. */
  reason?: string
}

/** phase2.mjs runOne() result */
export interface Phase2Run extends Omit<Phase2Spec, 'disposition'> {
  status: Phase2Status
  disposition: Phase2Disposition
  pass: boolean
  implemented?: boolean
  observed?: unknown
  error?: string
  elapsedMs?: number
  at?: string
}

/** GET /api/phase2 */
export interface Phase2Response {
  scenarios: Phase2Spec[]
  /** Last 80 runs on this server process; cleared by /api/reset. */
  runs: Phase2Run[]
}

/** phase2.mjs summarize() */
export interface Phase2Summary {
  total: number
  pass: number
  fail: number
  unsupported: number
  notImplemented: number
  controlHeld: number
  limitationReproduced: number
  enterpriseReady: false
  note: string
}

/** phase2-report.mjs output — reports/phase2-latest.json */
export interface Phase2Report {
  generatedAt: string
  runner: 'arc-control-sandbox-phase2'
  disclaimer: string
  revisions: { sandbox: string | null; arcControl: string | null }
  node: string
  phase2: Phase2Summary
  scenarios: Phase2Run[]
  stress: StressResult[]
  preservedIntegration: { total: number; passed: number; failed: number; pass: boolean }
}

/** GET /api/reports/:kind — a saved report file, redacted server-side. */
export interface SavedReport<T> {
  kind: 'integration' | 'phase2'
  file: string
  /** null when the runner has not written the file yet */
  modifiedAt: string | null
  report: T | null
}

/** GET /api/arc/evidence/:id — ARC evidence record fetched server-side, redacted. */
export interface EvidenceResponse {
  evidenceId: string
  arcHttpStatus: number
  record?: unknown
  error?: string
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

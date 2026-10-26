/**
 * Typed contracts for the Meridian sandbox HTTP API.
 *
 * Every shape below was read from the sandbox sources on this branch:
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
  /** Deterministic workload order. null keeps the original index pattern. */
  seed?: number | null
}

export interface LoadSample {
  expected: 'executed' | 'pending_approval' | 'denied'
  actual: string
  timeMs: number
  evidence: boolean
  expectedEffect: 0 | 1
}

/** POST /api/load response — scenarios.mjs load() */
export interface LoadResult {
  pass: boolean
  requested: number
  concurrency: number
  seed: number | null
  elapsedMs: number
  requestsPerSecond: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  minMs: number
  maxMs: number
  expectedEffects: number
  observedEffects: number
  /** Mutations of any tool other than finance.refund. Must be 0. */
  otherMutations: number
  /** Fault-injection side effects observed during the run. Must be 0. */
  faultDelta: number
  unexpectedMutations: boolean
  unexpectedOutcomes: number
  transportErrors: number
  plan: { executed: number; pending: number; denied: number }
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

/* ── Phase 2 security / reliability / evidence harness ──────────────────
 * Read from src/phase2.mjs and src/phase2-report.mjs on this branch.
 * The runner reports FOUR statuses and keeps `disposition` separate from
 * `status`: 31 checks pass, but three of those only reproduce a known
 * limitation rather than demonstrating a strong control. Never collapse
 * `unsupported` / `not_implemented` into a pass, and never collapse
 * `limitation_reproduced` into `control_held`. */

export type Phase2Kind = 'implemented' | 'unsupported' | 'not_implemented'
export type Phase2Status = 'pass' | 'fail' | 'unsupported' | 'not_implemented'
export type Phase2Track = 'security' | 'reliability' | 'evidence'
export type Phase2Disposition =
  | 'control_held'
  | 'limitation_reproduced'
  | 'control_failed'
  | 'unsupported'
  | 'not_implemented'

/** phase2.mjs CATALOGUE entry — GET /api/phase2 → scenarios[] */
export interface Phase2Spec {
  id: string
  label: string
  family: string
  track: Phase2Track
  kind: Phase2Kind
  /** Present on checks that pass by reproducing a limitation, not by holding a control. */
  disposition?: 'limitation_reproduced'
  /** Why an unsupported / not_implemented check cannot be run here. */
  reason?: string
}

/** phase2.mjs runOne() result — POST /api/phase2/:id, and GET /api/phase2 → runs[] */
export interface Phase2Result extends Omit<Phase2Spec, 'disposition'> {
  status: Phase2Status
  disposition: Phase2Disposition
  /** null for unsupported / not_implemented: there is nothing to pass or fail. */
  pass: boolean | null
  implemented: boolean
  observed?: unknown
  error?: string
  detail?: string
  elapsedMs?: number
  at?: string
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
  enterpriseReady: boolean
  note: string
}

/** GET /api/phase2 */
export interface Phase2Response {
  scenarios: Phase2Spec[]
  runs: Phase2Result[]
}

/** POST /api/phase2/all */
export interface Phase2RunAll {
  summary: Phase2Summary
  scenarios: Phase2Result[]
}

/** POST /api/stress body. scenarios.mjs clamps count 1..1000 and concurrency 1..25. */
export interface StressRequest {
  preset?: '100' | '500' | '1000'
  count?: number
  concurrency?: number
  /** Default [1, 2, 3]. `seed` overrides it with a single run. */
  seeds?: number[]
  seed?: number
}

/** POST /api/stress response */
export interface StressResult {
  preset: string | null
  count?: number
  concurrency?: number
  pass: boolean
  runs: LoadResult[]
}

/** reports/phase2-latest.json, written by `npm run phase2`. */
export interface Phase2FileReport {
  generatedAt: string
  runner: string
  disclaimer: string
  revisions: { sandbox: string | null; arcControl: string | null }
  node: string
  phase2: Phase2Summary
  scenarios: Phase2Result[]
  stress: StressResult[]
  preservedIntegration: { total: number; passed: number; failed: number; pass: boolean }
}

/** GET /api/reports */
export interface ReportIndex {
  integration: string | null
  phase2: string | null
  files: string[]
}

/* ── UI-side vocabulary ─────────────────────────────────────────────── */

export type ResultStatus = 'PASS' | 'FAIL' | 'NOT_RUN' | 'UNSUPPORTED' | 'NOT_IMPLEMENTED' | 'ERROR' | 'RUNNING'

export type VerificationState = 'internally_verified' | 'externally_anchored' | 'failed' | 'not_assessable'

/** Where a value on screen came from. Every number in the UI is tagged with one of these. */
export type DataSource = 'live' | 'recorded' | 'baseline' | 'repository' | 'illustrative' | 'proposed'

export type ResourceStatus = 'loading' | 'live' | 'empty' | 'unreachable' | 'not_implemented' | 'error'

export interface Resource<T> {
  status: ResourceStatus
  data?: T
  fetchedAt?: string
  error?: string
}

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

export interface Customer { id: string; name: string; tier: string; region?: string }
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
  /** Set when a long live day sent only the most recent rows of a list: its full length. */
  totals?: Partial<Record<string, number>>
}

/* ── Live operations (src/live/engine.mjs) ─────────────────────────── */

export type LiveOutcome = 'executed' | 'pending_approval' | 'denied' | 'refused' | 'unknown'
export type LiveDepartment = 'finance' | 'support' | 'it' | 'sales' | 'hr' | 'security' | 'northwind'

export interface LiveEvent {
  seq: number
  at: string
  day: number
  tick: number
  kind: 'action' | 'approval' | 'inbound' | 'story' | 'anomaly' | 'status' | 'error' | 'inbox' | 'agent'
  department?: LiveDepartment
  agent?: string
  tool?: string
  summary?: string
  story?: string | null
  parameters?: Record<string, unknown>
  expected?: string
  actual?: string
  httpStatus?: number
  decision?: string | null
  policyId?: string | null
  ruleId?: string | null
  reason?: string | null
  error?: string | null
  effects?: { expected: number | null; observed: number }
  evidenceId?: string | null
  approvalId?: string | null
  correlationId?: string
  approvers?: string[]
  human?: boolean
  counts?: LiveCounts
  /** true: matched expectation · false: anomaly · null: outcome unknown */
  ok: boolean | null
  why?: string
  status?: LiveStatus
  /** AI mode: the inbox item an action or an agent event belongs to. */
  itemId?: string | null
  item?: { channel: string; from: string; subject: string; body: string; kind: 'routine' | 'adversarial'; probe: string | null }
  /** 'agent' events: the model's reasoning summary, how the episode ended, and what it tried. */
  reasoning?: string | null
  ended?: 'done' | 'max_turns' | 'max_tokens' | 'model_refused' | 'interrupted' | 'error'
  calls?: number
  attempts?: Array<{ tool: string; parameters: Record<string, unknown>; actual: string }>
  itemKind?: 'routine' | 'adversarial'
  probe?: string | null
  /** Adversarial items only: declined the bait, took it and ARC contained it, or took it and policy allowed it. */
  judgment?: 'declined' | 'contained' | 'executed' | null
  usage?: { input: number; output: number; cacheRead: number; cacheWrite: number } | null
  model?: string
}

export type LiveMode = 'scripted' | 'ai'

export interface LiveAi {
  available: boolean
  /** Why AI mode is unavailable or was switched off, if it is. */
  reason: string | null
  model: string
  effort: string | null
  every: number
  episodes: number
  maxEpisodes: number
  tokens: number
  maxTokens: number
}

export interface LiveCounts {
  actions: number; executed: number; pending_approval: number; denied: number; refused: number; unknown: number
  approved: number; rejected: number; left_pending: number; human: number; inbound: number; anomalies: number
  inbox?: number; episodes?: number; ai_errors?: number; bait_declined?: number; bait_contained?: number; bait_executed?: number
}

export interface LiveStatus {
  running: boolean
  mode?: LiveMode
  ai?: LiveAi
  seed: number
  rate: number
  day: number
  tick: number
  startedAt: string | null
  dayStartedAt: string | null
  heldForTests: boolean
  counts?: LiveCounts
}

export interface LiveSnapshot extends LiveStatus {
  counts: LiveCounts
  pendingApprovals: Array<{ approvalId: string; tool: string; agent: string; department: LiveDepartment; summary: string; decision: string; dueTick: number }>
  anomalies: LiveEvent[]
  events: LiveEvent[]
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

/** ARC GET /v1/assurance/summary, as returned by ARC 2.0 (162d00d). `controls` is a count. */
export interface AssuranceSummary {
  totals?: Partial<Record<AssuranceStatus, number>>
  controls?: number
  controlsEnabled?: number
  openFindings?: Partial<Record<'critical' | 'high' | 'medium' | 'low' | 'info', number>>
  [k: string]: unknown
}

/** One control's result from ARC POST /v1/assurance/runs → assessments[]. */
export interface AssuranceAssessment {
  controlId: string
  status: AssuranceStatus
  assurance?: string
  summary?: string
  observations?: unknown[]
  [k: string]: unknown
}

/** POST /api/assurance response */
export interface AssuranceResult {
  pass: boolean
  run?: { run?: unknown; assessments?: AssuranceAssessment[] }
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
  kind: 'integration' | 'phase2' | 'product'
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

/* ── Product suites and coverage (product.mjs, packs/, coverage.mjs) ── */

/** GET /api/suites entry */
export interface SuiteSummary {
  id: string
  name: string
  kind: 'product' | 'pack'
  industry: string | null
  description: string | null
  count: number
}

/** A product-surface or industry-pack check, and its run result. */
export interface SuiteSpec {
  id: string
  label: string
  family: string
  kind: 'implemented' | 'unsupported' | 'not_implemented'
  expected?: string
  reason?: string
  covers?: string[]
}
export interface SuiteRun extends SuiteSpec {
  status: 'pass' | 'fail' | 'unsupported' | 'not_implemented'
  pass: boolean | null
  observed?: unknown
  error?: string
  detail?: string
  elapsedMs?: number
  at?: string
}
export interface SuiteResponse { id: string; name: string; kind: string; scenarios: SuiteSpec[]; runs: SuiteRun[] }

export type CoverageStatus = 'verified' | 'failing' | 'not_run' | 'gap' | 'unmapped' | 'partial' | 'unsupported' | 'not_implemented'
export interface CoverageRow { route: string; status: CoverageStatus; checks: Array<{ ref: string; status: string }>; reason?: string }
export interface CapabilityRow { id: string; label: string; status: CoverageStatus; checks: Array<{ ref: string; status: string }>; reason?: string }
/** GET /api/coverage, and product-latest.json → coverage */
export interface CoverageReport {
  generatedAt: string
  arcRoutes: number
  routes: CoverageRow[]
  routeTotals: Partial<Record<CoverageStatus, number>>
  capabilities: CapabilityRow[]
  capabilityTotals: Partial<Record<CoverageStatus, number>>
  unmapped: string[]
  note: string
}

/** product-report.mjs output — reports/product-latest.json (fields the UI reads) */
export interface ProductReport {
  generatedAt: string
  runner: 'arc-control-sandbox-product'
  revisions: { sandbox: string | null; arcControl: string | null }
  pass: boolean
  failures: string[]
  coverage: CoverageReport
  suites: Record<string, unknown>
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

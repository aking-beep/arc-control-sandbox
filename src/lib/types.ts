// Shapes mirror the Meridian server contracts in src/company.mjs, src/scenarios.mjs
// and src/phase2.mjs at commit 8fc43b8. Nothing here is a new backend contract.

/** GET /api/health */
export interface Health {
  status: 'ok'
  mode: 'synthetic'
  gatewayConfigured: boolean
}

/** One entry of GET /api/scenarios → scenarios[] (createScenarios().list()) */
export interface ScenarioSpec {
  id: string
  label: string
  family: string
  expected: 'EXECUTED' | 'PENDING' | 'DENIED' | 'REFUSED' | 'ONCE'
}

/** show() in scenarios.mjs */
export interface ScenarioObserved {
  httpStatus?: number
  outcome?: string | null
  decision?: string | null
  policyId?: string | null
  evidenceId?: string | null
  evidencePresent?: boolean | null
  approvalId?: string | null
  latencyMs?: number
  error?: string | null
  backendEffects?: number
  replayHttpStatus?: number
  [key: string]: unknown
}

/** POST /api/scenarios/:id result, also GET /api/scenarios → runs[] */
export interface ScenarioRun extends ScenarioSpec {
  pass: boolean
  observed?: ScenarioObserved
  error?: string
  elapsedMs?: number
  at?: string
}

export type Phase2Kind = 'implemented' | 'unsupported' | 'not_implemented'
export type Phase2Status = 'pass' | 'fail' | 'unsupported' | 'not_implemented'
export type Phase2Disposition =
  | 'control_held'
  | 'control_failed'
  | 'limitation_reproduced'
  | 'unsupported'
  | 'not_implemented'

/** CATALOGUE entry in phase2.mjs, GET /api/phase2 → scenarios[] */
export interface Phase2Spec {
  id: string
  label: string
  family: string
  track: 'security' | 'reliability' | 'evidence'
  kind: Phase2Kind
  disposition?: 'limitation_reproduced'
  reason?: string
}

/** runOne() result in phase2.mjs */
export interface Phase2Run extends Omit<Phase2Spec, 'disposition'> {
  status: Phase2Status
  disposition: Phase2Disposition
  pass: boolean | null
  implemented?: boolean
  observed?: Record<string, unknown>
  error?: string
  detail?: string
  elapsedMs?: number
  at?: string
}

/** load() result in scenarios.mjs */
export interface LoadRun {
  pass: boolean
  requested: number
  concurrency: number
  seed: number | null
  elapsedMs?: number
  requestsPerSecond: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  expectedEffects: number
  observedEffects: number
  otherMutations: number
  unexpectedOutcomes: number
  transportErrors?: number
}

/** POST /api/stress */
export interface StressResult {
  preset: string | null
  count: number
  concurrency: number
  pass: boolean
  runs: LoadRun[]
}

export type AssuranceStatus = 'pass' | 'fail' | 'not_assessable' | 'not_applicable' | 'attested'

/** Where a value on screen came from. Every rendered result carries one. */
export type Provenance = 'live' | 'recorded'

import type {
  AssuranceResult, EvidenceResponse, HealthResponse, IntegrationReport, LoadRequest, LoadResult, MeridianState,
  Phase2Report, Phase2Response, Phase2Run, Phase2Summary, Resource, SavedReport, ScenarioRun, ScenariosResponse,
  StressPreset, StressResult, SuiteSummary, SuiteResponse, SuiteRun, CoverageReport, ProductReport
} from './types'

/**
 * Typed adapter over the Meridian sandbox server.
 *
 * - The browser NEVER talks to ARC Control directly and never holds agent keys,
 *   the operator token or the connector token. All ARC traffic is server-side.
 * - Default base is same-origin, because Meridian serves the UI (company.mjs).
 * - A 404 `{ error: 'not_found' }` from Meridian means the route does not exist
 *   in the sandbox yet; it is reported as `not_implemented`, never as empty data.
 */

const BASE_KEY = 'meridian.apiBase'

export function getApiBase(): string {
  try { return localStorage.getItem(BASE_KEY) ?? '' } catch { return '' }
}
export function setApiBase(v: string) {
  try { localStorage.setItem(BASE_KEY, v.replace(/\/$/, '')) } catch { /* ignore */ }
}

export class ApiError extends Error {
  constructor(public kind: 'unreachable' | 'not_implemented' | 'error', message: string, public httpStatus?: number) {
    super(message)
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch (e) {
    throw new ApiError('unreachable', `Meridian server unreachable at ${getApiBase() || 'same origin'}`)
  }
  const text = await res.text()
  let body: unknown
  try { body = JSON.parse(text) } catch {
    throw new ApiError('unreachable', `Non-JSON response from ${path} (HTTP ${res.status}). The Meridian server is not serving this origin.`, res.status)
  }
  if (res.status === 404 && (body as { error?: string })?.error === 'not_found') {
    throw new ApiError('not_implemented', `${path} is not implemented in the sandbox`, 404)
  }
  if (!res.ok) {
    const b = body as { error?: string; detail?: string }
    throw new ApiError('error', b?.detail || b?.error || `HTTP ${res.status}`, res.status)
  }
  return body as T
}

export async function asResource<T>(p: Promise<T>): Promise<Resource<T>> {
  try {
    const data = await p
    return { status: 'live', data, fetchedAt: new Date().toISOString() }
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError('error', String(e))
    return { status: err.kind, error: err.message, fetchedAt: new Date().toISOString() }
  }
}

/* ── Sandbox endpoints (company.mjs) ──────────────────────────────── */

export const meridianApi = {
  health: () => call<HealthResponse>('/api/health'),
  state: () => call<MeridianState>('/api/state'),
  scenarios: () => call<ScenariosResponse>('/api/scenarios'),
  runScenario: (id: string) => call<ScenarioRun>(`/api/scenarios/${encodeURIComponent(id)}`, { method: 'POST' }),
  runAll: () => call<ScenarioRun[]>('/api/scenarios/all', { method: 'POST' }),
  load: (body: LoadRequest) => call<LoadResult>('/api/load', { method: 'POST', body: JSON.stringify(body) }),
  stress: (preset: StressPreset, seed: number) => call<StressResult>('/api/stress', { method: 'POST', body: JSON.stringify({ preset, seed }) }),
  assurance: () => call<AssuranceResult>('/api/assurance', { method: 'POST', body: '{}' }),
  reset: () => call<{ reset: true; note: string }>('/api/reset', { method: 'POST' }),
  phase2: () => call<Phase2Response>('/api/phase2'),
  runPhase2: (id: string) => call<Phase2Run>(`/api/phase2/${encodeURIComponent(id)}`, { method: 'POST', body: '{}' }),
  runPhase2All: () => call<{ summary: Phase2Summary; scenarios: Phase2Run[] }>('/api/phase2/all', { method: 'POST', body: '{}' }),
  evidence: (id: string) => call<EvidenceResponse>(`/api/arc/evidence/${encodeURIComponent(id)}`),
  suites: () => call<{ suites: SuiteSummary[] }>('/api/suites'),
  suite: (id: string) => call<SuiteResponse>(`/api/suites/${encodeURIComponent(id)}`),
  runSuite: (id: string, check: string) => call<SuiteRun | SuiteRun[]>(`/api/suites/${encodeURIComponent(id)}/${encodeURIComponent(check)}`, { method: 'POST', body: '{}' }),
  coverage: () => call<CoverageReport>('/api/coverage'),
  productReport: () => call<SavedReport<ProductReport>>('/api/reports/product'),
  /** A saved report file; `report` is null when the runner has not written one yet. */
  savedReport: <K extends 'integration' | 'phase2'>(kind: K) =>
    call<SavedReport<K extends 'integration' ? IntegrationReport : Phase2Report>>(`/api/reports/${kind}`),
}

/* ── Routes the UI could use but the sandbox does not serve ────────────
 * Each would call ARC with the operator token server-side and return redacted
 * JSON. Until they exist the UI shows what start.mjs registers (REPOSITORY)
 * instead of live ARC inventory. */

export const SERVED_ROUTES: Array<{ route: string; purpose: string; source: string }> = [
  { route: 'GET /api/health', purpose: 'Server reachability, ARC gateway and Phase 2 runner wired', source: 'company.mjs' },
  { route: 'GET /api/state', purpose: 'Meridian business records and mutation log', source: 'company.mjs' },
  { route: 'GET /api/scenarios', purpose: '17 integration specs and the last 30 runs', source: 'scenarios.mjs' },
  { route: 'POST /api/scenarios/:id | all', purpose: 'Run one or all 17 integration scenarios', source: 'scenarios.mjs → ARC /v1/actions' },
  { route: 'GET /api/phase2', purpose: 'Phase 2 catalogue and the last 80 runs', source: 'phase2.mjs' },
  { route: 'POST /api/phase2/:id | all', purpose: 'Run one or all Phase 2 checks', source: 'phase2.mjs → ARC' },
  { route: 'POST /api/load', purpose: 'Custom bounded load run', source: 'scenarios.mjs load()' },
  { route: 'POST /api/stress', purpose: 'Seeded 100 / 500 / 1,000 presets', source: 'scenarios.mjs stress()' },
  { route: 'POST /api/assurance', purpose: 'ARC Assurance run and summary', source: 'ARC /v1/assurance/*' },
  { route: 'POST /api/reset', purpose: 'Reset Meridian fixtures (ARC audit kept)', source: 'company.mjs' },
  { route: 'GET /api/reports/integration | phase2', purpose: 'Saved reports/latest.json and reports/phase2-latest.json, redacted', source: 'company.mjs (filesystem)' },
  { route: 'GET /api/suites, GET|POST /api/suites/:id/:check|all', purpose: 'Product-surface suite and industry packs (Northwind Bank)', source: 'product.mjs, packs/runner.mjs → ARC' },
  { route: 'GET /api/coverage', purpose: 'Every ARC route and capability, and which check exercises it', source: 'coverage.mjs (reads ARC source)' },
  { route: 'POST /hooks/arc', purpose: 'Sink for ARC webhook notifications, so delivery and signatures can be verified', source: 'company.mjs' },
  { route: 'GET /api/arc/evidence/:id', purpose: 'One ARC evidence record, fetched with the server-held operator token and redacted', source: 'ARC GET /v1/evidence/:id' },
]

export const PROPOSED_ROUTES: Array<{ route: string; purpose: string; arcSource: string }> = [
  { route: 'GET /api/arc/agents', purpose: 'Registered agents, status, owner, declared tools', arcSource: 'GET /v1/agents — verify in arc-control' },
  { route: 'GET /api/arc/tools', purpose: 'Registered tools, enabled state, risk tier', arcSource: 'GET /v1/tools — used by phase2.mjs' },
  { route: 'GET /api/arc/policies', purpose: 'Policy inventory and versions', arcSource: 'GET /v1/policies — used by phase2.mjs' },
  { route: 'GET /api/arc/approvals', purpose: 'Approval requests, votes, execution release', arcSource: 'GET /v1/approvals — verify; only /:id/vote and /:id/execute are used' },
  { route: 'GET /api/arc/version', purpose: 'ARC build / commit of the running gateway', arcSource: 'No version endpoint known; phase2-report.mjs reads git HEAD instead' },
  { route: 'GET /api/load/history', purpose: 'Persisted stress results across restarts', arcSource: 'Sandbox (needs persistence)' },
]

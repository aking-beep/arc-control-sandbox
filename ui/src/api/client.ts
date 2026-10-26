import type {
  AssuranceResult, HealthResponse, IntegrationReport, LoadRequest, LoadResult,
  MeridianState, Phase2FileReport, Phase2Response, Phase2Result, Phase2RunAll,
  ReportIndex, Resource, ScenarioRun, ScenariosResponse, StressRequest, StressResult
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
  constructor(public kind: 'unreachable' | 'not_implemented' | 'empty' | 'error', message: string, public httpStatus?: number) {
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
  const code = (body as { error?: string; detail?: string })?.error
  if (res.status === 404 && code === 'not_found') {
    throw new ApiError('not_implemented', `${path} is not implemented in the sandbox`, 404)
  }
  // The route exists and works; the run that produces its data has not happened
  // yet. That is an empty state, never an unsupported capability.
  if (res.status === 404 && (code === 'report_not_generated' || code === 'ui_not_built')) {
    throw new ApiError('empty', (body as { detail?: string })?.detail || `${path} has no data yet`, 404)
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

/* ── Existing endpoints (company.mjs) ─────────────────────────────── */

export const meridianApi = {
  health: () => call<HealthResponse>('/api/health'),
  state: () => call<MeridianState>('/api/state'),
  scenarios: () => call<ScenariosResponse>('/api/scenarios'),
  runScenario: (id: string) => call<ScenarioRun>(`/api/scenarios/${encodeURIComponent(id)}`, { method: 'POST' }),
  runAll: () => call<ScenarioRun[]>('/api/scenarios/all', { method: 'POST' }),
  load: (body: LoadRequest) => call<LoadResult>('/api/load', { method: 'POST', body: JSON.stringify(body) }),
  assurance: () => call<AssuranceResult>('/api/assurance', { method: 'POST', body: '{}' }),
  reset: () => call<{ reset: true; note: string }>('/api/reset', { method: 'POST' }),

  /* Phase 2 security / reliability / evidence harness (src/phase2.mjs). */
  phase2: () => call<Phase2Response>('/api/phase2'),
  runPhase2: (id: string) => call<Phase2Result>(`/api/phase2/${encodeURIComponent(id)}`, { method: 'POST' }),
  runPhase2All: () => call<Phase2RunAll>('/api/phase2/all', { method: 'POST' }),

  /* Bounded stress presets with deterministic seeds (src/scenarios.mjs). */
  stress: (body: StressRequest) => call<StressResult>('/api/stress', { method: 'POST', body: JSON.stringify(body) }),

  /* Saved report files. Redacted server-side; the browser never sees a token. */
  reports: () => call<ReportIndex>('/api/reports'),
  integrationReport: () => call<IntegrationReport>('/api/reports/latest'),
  phase2Report: () => call<Phase2FileReport>('/api/reports/phase2'),
}

/* ── Proposed read-only proxy routes (genuinely NOT in the sandbox) ────
 * Each would be implemented in company.mjs, calling ARC with the operator
 * token server-side and returning redacted JSON. Until they exist, these
 * adapters resolve to `not_implemented` and the UI says so — it does not
 * substitute a fixture. ARC's own registry (agents, tools, policies,
 * approvals, evidence bodies) is reachable only with the operator token, so
 * it stays server-side until these routes are built. */

export const proposedApi = {
  agents: () => call<unknown[]>('/api/arc/agents'),
  tools: () => call<unknown[]>('/api/arc/tools'),
  policies: () => call<unknown[]>('/api/arc/policies'),
  approvals: () => call<unknown[]>('/api/arc/approvals'),
  evidence: (id: string) => call<unknown>(`/api/arc/evidence/${encodeURIComponent(id)}`),
  loadHistory: () => call<unknown[]>('/api/load/history'),
}

export const PROPOSED_ROUTES: Array<{ route: string; purpose: string; arcSource: string }> = [
  { route: 'GET /api/arc/agents', purpose: 'Registered agents, status, owner, declared tools', arcSource: 'GET /v1/agents — verify exists in arc-control' },
  { route: 'GET /api/arc/tools', purpose: 'Registered tools, enabled state, risk tier', arcSource: 'GET /v1/tools — verify exists in arc-control' },
  { route: 'GET /api/arc/policies', purpose: 'Policy inventory and versions', arcSource: 'GET /v1/policies — referenced in scenarios.mjs' },
  { route: 'GET /api/arc/approvals', purpose: 'Approval requests, votes, execution release', arcSource: 'GET /v1/approvals — verify; only /:id/vote and /:id/execute are referenced' },
  { route: 'GET /api/arc/evidence/:id', purpose: 'Redacted evidence record + verification', arcSource: 'GET /v1/evidence/:id — referenced in scenarios.mjs' },
  { route: 'GET /api/load/history', purpose: 'Stress results persisted across restarts', arcSource: 'Sandbox — results are in-process only today' },
]

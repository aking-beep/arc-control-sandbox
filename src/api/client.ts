import type {
  AssuranceResult, HealthResponse, LoadRequest, LoadResult, MeridianState,
  Resource, ScenarioRun, ScenariosResponse
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
}

/* ── Proposed read-only proxy routes (NOT in sandbox yet) ──────────────
 * Each would be implemented in company.mjs, calling ARC with the operator
 * token server-side and returning redacted JSON. Until they exist, these
 * adapters resolve to `not_implemented` and the UI says so. */

export const proposedApi = {
  agents: () => call<unknown[]>('/api/arc/agents'),
  tools: () => call<unknown[]>('/api/arc/tools'),
  policies: () => call<unknown[]>('/api/arc/policies'),
  approvals: () => call<unknown[]>('/api/arc/approvals'),
  evidence: (id: string) => call<unknown>(`/api/arc/evidence/${encodeURIComponent(id)}`),
  reports: () => call<unknown[]>('/api/reports'),
  loadHistory: () => call<unknown[]>('/api/load/history'),
  phase2: () => call<unknown>('/api/reports/phase2'),
}

export const PROPOSED_ROUTES: Array<{ route: string; purpose: string; arcSource: string }> = [
  { route: 'GET /api/arc/agents', purpose: 'Registered agents, status, owner, declared tools', arcSource: 'GET /v1/agents — verify exists in arc-control' },
  { route: 'GET /api/arc/tools', purpose: 'Registered tools, enabled state, risk tier', arcSource: 'GET /v1/tools — verify exists in arc-control' },
  { route: 'GET /api/arc/policies', purpose: 'Policy inventory and versions', arcSource: 'GET /v1/policies — referenced in scenarios.mjs' },
  { route: 'GET /api/arc/approvals', purpose: 'Approval requests, votes, execution release', arcSource: 'GET /v1/approvals — verify; only /:id/vote and /:id/execute are referenced' },
  { route: 'GET /api/arc/evidence/:id', purpose: 'Redacted evidence record + verification', arcSource: 'GET /v1/evidence/:id — referenced in scenarios.mjs' },
  { route: 'GET /api/reports', purpose: 'Saved reports/*.json from npm run validate', arcSource: 'Local filesystem (sandbox)' },
  { route: 'GET /api/load/history', purpose: 'Persisted stress results', arcSource: 'Sandbox (new persistence)' },
  { route: 'GET /api/reports/phase2', purpose: 'Phase 2 security report', arcSource: 'Phase 2 runner (not in repo)' },
]

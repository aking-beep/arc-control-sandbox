import type { Health, Phase2Run, Phase2Spec, ScenarioRun, ScenarioSpec, StressResult } from './types'

// Same-origin calls only. In the repository, ui/ is served by Vite with a proxy
// to Meridian on 127.0.0.1:8890, or built into a directory Meridian serves.
// No agent keys or operator tokens are ever sent to the browser.
const BASE = ''

async function call<T>(path: string, init?: RequestInit, timeoutMs = 120000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal })
    const type = res.headers.get('content-type') || ''
    if (!type.includes('application/json')) throw new Error(`Non-JSON response from ${path}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error ? `${path}: ${body.error}` : `${path}: HTTP ${res.status}`)
    return body as T
  } finally {
    clearTimeout(timer)
  }
}

const post = <T,>(path: string, body?: unknown) =>
  call<T>(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

export const api = {
  health: () => call<Health>('/api/health', undefined, 2500),
  scenarios: () => call<{ scenarios: ScenarioSpec[]; runs: ScenarioRun[] }>('/api/scenarios'),
  phase2: () => call<{ scenarios: Phase2Spec[]; runs: Phase2Run[] }>('/api/phase2'),
  runScenario: (id: string) => post<ScenarioRun | ScenarioRun[]>(`/api/scenarios/${encodeURIComponent(id)}`),
  runPhase2: (id: string) => post<Phase2Run | { scenarios: Phase2Run[] }>(`/api/phase2/${encodeURIComponent(id)}`),
  stress: (preset: '100' | '500' | '1000', seed = 1) => post<StressResult>('/api/stress', { preset, seed }),
  reset: () => post<{ reset: boolean; note: string }>('/api/reset'),
}

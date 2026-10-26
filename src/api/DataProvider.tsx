import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { asResource, meridianApi, ApiError } from './client'
import type {
  AssuranceResult, HealthResponse, LoadRequest, LoadResult, MeridianState,
  Resource, ScenarioRun, ScenariosResponse
} from './types'

export interface SessionLoadRun { at: string; request: LoadRequest; result: LoadResult }
export interface SessionAssuranceRun { at: string; result: AssuranceResult }
export interface ActionError { at: string; action: string; message: string; kind: string }

interface DataContextValue {
  health: Resource<HealthResponse>
  state: Resource<MeridianState>
  scenarios: Resource<ScenariosResponse>
  /** Runs from the server (GET /api/scenarios → runs). Server keeps the last 30, cleared on reset. */
  runs: ScenarioRun[]
  latestRunById: Map<string, ScenarioRun>
  running: Set<string>
  loadRuns: SessionLoadRun[]
  assuranceRuns: SessionAssuranceRun[]
  lastError: ActionError | null
  connected: boolean
  refresh: () => Promise<void>
  runScenario: (id: string) => Promise<void>
  runAll: () => Promise<void>
  runLoad: (req: LoadRequest) => Promise<LoadResult | null>
  runAssurance: () => Promise<AssuranceResult | null>
  reset: () => Promise<boolean>
  clearError: () => void
}

const DataContext = createContext<DataContextValue | null>(null)
const POLL_MS = 20000

export function DataProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<Resource<HealthResponse>>({ status: 'loading' })
  const [state, setState] = useState<Resource<MeridianState>>({ status: 'loading' })
  const [scenarios, setScenarios] = useState<Resource<ScenariosResponse>>({ status: 'loading' })
  const [running, setRunning] = useState<Set<string>>(new Set())
  const [loadRuns, setLoadRuns] = useState<SessionLoadRun[]>([])
  const [assuranceRuns, setAssuranceRuns] = useState<SessionAssuranceRun[]>([])
  const [lastError, setLastError] = useState<ActionError | null>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const [h, st, sc] = await Promise.all([
      asResource(meridianApi.health()),
      asResource(meridianApi.state()),
      asResource(meridianApi.scenarios()),
    ])
    if (!mounted.current) return
    setHealth(h); setState(st); setScenarios(sc)
  }, [])

  useEffect(() => {
    mounted.current = true
    refresh()
    const t = setInterval(refresh, POLL_MS)
    return () => { mounted.current = false; clearInterval(t) }
  }, [refresh])

  const fail = (action: string, e: unknown) => {
    const err = e instanceof ApiError ? e : new ApiError('error', String(e))
    setLastError({ at: new Date().toISOString(), action, message: err.message, kind: err.kind })
  }

  const mark = (ids: string[], on: boolean) => setRunning(prev => {
    const n = new Set(prev)
    ids.forEach(id => on ? n.add(id) : n.delete(id))
    return n
  })

  const runScenario = useCallback(async (id: string) => {
    mark([id], true)
    try { await meridianApi.runScenario(id); await refresh() }
    catch (e) { fail(`Run scenario ${id}`, e) }
    finally { mark([id], false) }
  }, [refresh])

  const runAll = useCallback(async () => {
    const ids = scenarios.data?.scenarios.map(s => s.id) ?? []
    mark(['__all__', ...ids], true)
    try { await meridianApi.runAll(); await refresh() }
    catch (e) { fail('Run integration suite', e) }
    finally { mark(['__all__', ...ids], false) }
  }, [refresh, scenarios.data])

  const runLoad = useCallback(async (req: LoadRequest) => {
    mark(['__load__'], true)
    try {
      const result = await meridianApi.load(req)
      setLoadRuns(prev => [{ at: new Date().toISOString(), request: req, result }, ...prev])
      await refresh()
      return result
    } catch (e) { fail(`Stress run ×${req.count}`, e); return null }
    finally { mark(['__load__'], false) }
  }, [refresh])

  const runAssurance = useCallback(async () => {
    mark(['__assurance__'], true)
    try {
      const result = await meridianApi.assurance()
      setAssuranceRuns(prev => [{ at: new Date().toISOString(), result }, ...prev])
      return result
    } catch (e) { fail('Run ARC assurance', e); return null }
    finally { mark(['__assurance__'], false) }
  }, [])

  const reset = useCallback(async () => {
    try { await meridianApi.reset(); await refresh(); return true }
    catch (e) { fail('Reset business data', e); return false }
  }, [refresh])

  const value = useMemo<DataContextValue>(() => {
    const runs = scenarios.data?.runs ?? []
    const latestRunById = new Map<string, ScenarioRun>()
    for (const r of runs) latestRunById.set(r.id, r)
    return {
      health, state, scenarios, runs, latestRunById, running, loadRuns, assuranceRuns, lastError,
      connected: health.status === 'live',
      refresh, runScenario, runAll, runLoad, runAssurance, reset,
      clearError: () => setLastError(null),
    }
  }, [health, state, scenarios, running, loadRuns, assuranceRuns, lastError, refresh, runScenario, runAll, runLoad, runAssurance, reset])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const v = useContext(DataContext)
  if (!v) throw new Error('useData must be used inside DataProvider')
  return v
}

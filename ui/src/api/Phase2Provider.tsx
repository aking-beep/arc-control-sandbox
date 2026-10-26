import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, asResource, meridianApi } from './client'
import type {
  Phase2Response, Phase2Result, Phase2Spec, Phase2Status, Phase2Summary, Resource, ResultStatus,
} from './types'

/**
 * Live Phase 2 harness state, read from the sandbox — never from a fixture.
 *
 *   GET  /api/phase2            catalogue + the server's recent run records
 *   POST /api/phase2/:id        run one check
 *   POST /api/phase2/all        run the whole catalogue, with a summary
 *
 * Rules this provider enforces, because the report they feed is a security
 * record:
 *   - `unsupported` and `not_implemented` are never rendered as a pass. They
 *     are properties of this ARC build, not measurements, so they come
 *     straight from the catalogue and do not need a run to be true.
 *   - A check that has not run is NOT_RUN, never PASS.
 *   - A derived summary is only labelled complete when every implemented check
 *     in the catalogue has a run record. Otherwise `covered` is short of
 *     `implemented` and callers must say so.
 *   - `limitation_reproduced` is kept distinct from `control_held`: both pass,
 *     but only one of them demonstrates a control.
 */

export interface Phase2ActionError { at: string; action: string; message: string; kind: string }

export interface DerivedSummary extends Phase2Summary {
  /** Implemented checks in the catalogue. */
  implemented: number
  /** Implemented checks that actually have a run record in this window. */
  covered: number
  /** True when every implemented check has been run. */
  complete: boolean
}

interface Phase2ContextValue {
  catalogue: Resource<Phase2Response>
  specs: Phase2Spec[]
  runs: Phase2Result[]
  latestById: Map<string, Phase2Result>
  /** Counts derived from the records actually held. null until the catalogue loads. */
  summary: DerivedSummary | null
  /** The summary returned by the most recent POST /api/phase2/all in this session. */
  reportedSummary: Phase2Summary | null
  running: Set<string>
  lastError: Phase2ActionError | null
  statusOf: (spec: Phase2Spec) => ResultStatus
  /** Resolve by check id, for catalogue rows that map onto a Phase 2 check. */
  statusById: (id: string) => ResultStatus
  failing: Phase2Result[]
  refresh: () => Promise<void>
  runCheck: (id: string) => Promise<void>
  runAll: () => Promise<void>
  clearError: () => void
}

const Phase2Context = createContext<Phase2ContextValue | null>(null)
const POLL_MS = 20000

export const UI_STATUS: Record<Phase2Status, ResultStatus> = {
  pass: 'PASS',
  fail: 'FAIL',
  unsupported: 'UNSUPPORTED',
  not_implemented: 'NOT_IMPLEMENTED',
}

/** Map a runner status to the UI vocabulary. Unknown values become ERROR, never PASS. */
export const phase2UiStatus = (status: Phase2Status): ResultStatus => UI_STATUS[status] ?? 'ERROR'

/** Mirrors summarize() in src/phase2.mjs, over whatever records are held. */
function derive(specs: Phase2Spec[], latest: Map<string, Phase2Result>): DerivedSummary {
  const records: Phase2Result[] = []
  for (const spec of specs) {
    if (spec.kind !== 'implemented') {
      // Static by construction: no product surface exists to pass or fail.
      records.push({ ...spec, status: spec.kind, disposition: spec.kind, pass: null, implemented: false })
      continue
    }
    const run = latest.get(spec.id)
    if (run) records.push(run)
  }
  const tally = (status: Phase2Status) => records.filter(r => r.status === status).length
  const implemented = specs.filter(s => s.kind === 'implemented').length
  const covered = records.filter(r => r.implemented).length
  return {
    total: specs.length,
    pass: tally('pass'),
    fail: tally('fail'),
    unsupported: tally('unsupported'),
    notImplemented: tally('not_implemented'),
    controlHeld: records.filter(r => r.disposition === 'control_held').length,
    limitationReproduced: records.filter(r => r.disposition === 'limitation_reproduced' && r.status === 'pass').length,
    enterpriseReady: false,
    note: 'Sandbox results are observations of this local process. They are not an enterprise certification.',
    implemented,
    covered,
    complete: covered === implemented,
  }
}

export function Phase2Provider({ children }: { children: ReactNode }) {
  const [catalogue, setCatalogue] = useState<Resource<Phase2Response>>({ status: 'loading' })
  const [reportedSummary, setReportedSummary] = useState<Phase2Summary | null>(null)
  const [running, setRunning] = useState<Set<string>>(new Set())
  const [lastError, setLastError] = useState<Phase2ActionError | null>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const next = await asResource(meridianApi.phase2())
    if (mounted.current) setCatalogue(next)
  }, [])

  useEffect(() => {
    mounted.current = true
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => { mounted.current = false; clearInterval(timer) }
  }, [refresh])

  const fail = (action: string, error: unknown) => {
    const err = error instanceof ApiError ? error : new ApiError('error', String(error))
    setLastError({ at: new Date().toISOString(), action, message: err.message, kind: err.kind })
  }

  const mark = (ids: string[], on: boolean) => setRunning(prev => {
    const next = new Set(prev)
    ids.forEach(id => (on ? next.add(id) : next.delete(id)))
    return next
  })

  const runCheck = useCallback(async (id: string) => {
    mark([id], true)
    try { await meridianApi.runPhase2(id); await refresh() }
    catch (error) { fail(`Run Phase 2 check ${id}`, error) }
    finally { mark([id], false) }
  }, [refresh])

  const runAll = useCallback(async () => {
    const ids = catalogue.data?.scenarios.map(s => s.id) ?? []
    mark(['__all__', ...ids], true)
    try {
      const result = await meridianApi.runPhase2All()
      setReportedSummary(result.summary)
      await refresh()
    } catch (error) { fail('Run full Phase 2 catalogue', error) }
    finally { mark(['__all__', ...ids], false) }
  }, [refresh, catalogue.data])

  const value = useMemo<Phase2ContextValue>(() => {
    const specs = catalogue.data?.scenarios ?? []
    const runs = catalogue.data?.runs ?? []
    // runs[] is append-ordered, so a later record for the same id wins.
    const latestById = new Map<string, Phase2Result>()
    for (const run of runs) if (run.implemented) latestById.set(run.id, run)

    const statusOf = (spec: Phase2Spec): ResultStatus => {
      if (spec.kind !== 'implemented') return UI_STATUS[spec.kind]
      if (running.has(spec.id)) return 'RUNNING'
      const run = latestById.get(spec.id)
      if (!run) return 'NOT_RUN'
      return UI_STATUS[run.status] ?? 'ERROR'
    }

    const specById = new Map(specs.map(spec => [spec.id, spec]))
    const statusById = (id: string): ResultStatus => {
      const spec = specById.get(id)
      // An id the live catalogue does not carry cannot be claimed as passing.
      return spec ? statusOf(spec) : 'NOT_RUN'
    }

    return {
      catalogue, specs, runs, latestById, statusById,
      summary: specs.length ? derive(specs, latestById) : null,
      reportedSummary, running, lastError, statusOf,
      failing: [...latestById.values()].filter(run => run.status === 'fail'),
      refresh, runCheck, runAll,
      clearError: () => setLastError(null),
    }
  }, [catalogue, reportedSummary, running, lastError, refresh, runCheck, runAll])

  return <Phase2Context.Provider value={value}>{children}</Phase2Context.Provider>
}

export function usePhase2() {
  const value = useContext(Phase2Context)
  if (!value) throw new Error('usePhase2 must be used inside Phase2Provider')
  return value
}

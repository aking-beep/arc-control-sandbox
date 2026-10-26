import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import type { Phase2Run, Phase2Spec, Phase2Status, Provenance, ScenarioRun, ScenarioSpec, StressResult } from './types'
import { SCENARIO_SPECS } from '../data/scenarios'
import { PHASE2_CATALOGUE, PHASE2_RECORDED_NOTES, recordedPhase2Status } from '../data/phase2'

export type Mode = 'detecting' | 'live' | 'fixture'

export interface ScenarioResult {
  status: 'pass' | 'fail' | 'not_run'
  provenance: Provenance
  run?: ScenarioRun
  note?: string
}

export interface Phase2Result {
  status: Phase2Status | 'not_run'
  limitation: boolean
  provenance: Provenance
  run?: Phase2Run
  note?: string
}

interface LabData {
  mode: Mode
  gatewayConfigured: boolean
  scenarioSpecs: ScenarioSpec[]
  phase2Specs: Phase2Spec[]
  scenarioResult: (id: string) => ScenarioResult
  phase2Result: (spec: Phase2Spec) => Phase2Result
  running: Set<string>
  lastError: string | null
  lastStress: StressResult | null
  runScenario: (id: string) => Promise<void>
  runPhase2: (id: string) => Promise<void>
  runStress: (preset: '100' | '500' | '1000') => Promise<void>
  resetBusiness: () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<LabData | null>(null)

export function LabDataProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('detecting')
  const [gatewayConfigured, setGateway] = useState(false)
  const [scenarioSpecs, setScenarioSpecs] = useState<ScenarioSpec[]>(SCENARIO_SPECS)
  const [phase2Specs, setPhase2Specs] = useState<Phase2Spec[]>(PHASE2_CATALOGUE)
  const [scenarioRuns, setScenarioRuns] = useState<Record<string, ScenarioRun>>({})
  const [phase2Runs, setPhase2Runs] = useState<Record<string, Phase2Run>>({})
  const [running, setRunning] = useState<Set<string>>(new Set())
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastStress, setLastStress] = useState<StressResult | null>(null)

  const refresh = useCallback(async () => {
    const [sc, p2] = await Promise.all([api.scenarios(), api.phase2()])
    if (sc.scenarios.length) setScenarioSpecs(sc.scenarios)
    if (p2.scenarios.length) setPhase2Specs(p2.scenarios)
    setScenarioRuns(latestBy(sc.runs))
    setPhase2Runs(latestBy(p2.runs))
  }, [])

  useEffect(() => {
    let cancelled = false
    api
      .health()
      .then(async (h) => {
        if (cancelled) return
        setGateway(h.gatewayConfigured)
        setMode('live')
        await refresh().catch((e) => setLastError(String(e.message)))
      })
      .catch(() => !cancelled && setMode('fixture'))
    return () => {
      cancelled = true
    }
  }, [refresh])

  const track = useCallback(async (key: string, fn: () => Promise<void>) => {
    setRunning((s) => new Set(s).add(key))
    setLastError(null)
    try {
      await fn()
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning((s) => {
        const n = new Set(s)
        n.delete(key)
        return n
      })
    }
  }, [])

  const runScenario = useCallback(
    (id: string) =>
      track(`s:${id}`, async () => {
        if (mode !== 'live') throw new Error('Backend unavailable — runs are disabled in design-fixture mode.')
        await api.runScenario(id)
        await refresh()
      }),
    [mode, refresh, track],
  )
  const runPhase2 = useCallback(
    (id: string) =>
      track(`p:${id}`, async () => {
        if (mode !== 'live') throw new Error('Backend unavailable — runs are disabled in design-fixture mode.')
        await api.runPhase2(id)
        await refresh()
      }),
    [mode, refresh, track],
  )
  const runStress = useCallback(
    (preset: '100' | '500' | '1000') =>
      track(`stress:${preset}`, async () => {
        if (mode !== 'live') throw new Error('Backend unavailable — runs are disabled in design-fixture mode.')
        setLastStress(await api.stress(preset, 1))
      }),
    [mode, track],
  )
  const resetBusiness = useCallback(
    () =>
      track('reset', async () => {
        if (mode !== 'live') throw new Error('Backend unavailable — reset is disabled in design-fixture mode.')
        await api.reset()
        await refresh()
      }),
    [mode, refresh, track],
  )

  const scenarioResult = useCallback(
    (id: string): ScenarioResult => {
      if (mode === 'live') {
        const run = scenarioRuns[id]
        if (!run) return { status: 'not_run', provenance: 'live', note: 'Not run in this session' }
        return { status: run.pass ? 'pass' : 'fail', provenance: 'live', run, note: run.error }
      }
      return { status: 'pass', provenance: 'recorded', note: 'Passed in recorded 17/17 recheck' }
    },
    [mode, scenarioRuns],
  )

  const phase2Result = useCallback(
    (spec: Phase2Spec): Phase2Result => {
      const limitation = spec.disposition === 'limitation_reproduced'
      if (mode === 'live') {
        const run = phase2Runs[spec.id]
        if (run) return { status: run.status, limitation: run.disposition === 'limitation_reproduced', provenance: 'live', run, note: run.error || run.detail }
        if (spec.kind !== 'implemented') return { status: spec.kind, limitation: false, provenance: 'live', note: spec.reason }
        return { status: 'not_run', limitation, provenance: 'live', note: 'Not run in this session' }
      }
      return { status: recordedPhase2Status(spec), limitation, provenance: 'recorded', note: spec.reason || PHASE2_RECORDED_NOTES[spec.id] }
    },
    [mode, phase2Runs],
  )

  const value = useMemo<LabData>(
    () => ({ mode, gatewayConfigured, scenarioSpecs, phase2Specs, scenarioResult, phase2Result, running, lastError, lastStress, runScenario, runPhase2, runStress, resetBusiness, refresh }),
    [mode, gatewayConfigured, scenarioSpecs, phase2Specs, scenarioResult, phase2Result, running, lastError, lastStress, runScenario, runPhase2, runStress, resetBusiness, refresh],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLab() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLab must be used inside LabDataProvider')
  return v
}

function latestBy<T extends { id: string; at?: string }>(runs: T[]): Record<string, T> {
  const out: Record<string, T> = {}
  for (const r of runs) {
    const prev = out[r.id]
    if (!prev || (r.at ?? '') >= (prev.at ?? '')) out[r.id] = r
  }
  return out
}

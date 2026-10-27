import { useMemo } from 'react'
import { useData } from '../api/DataProvider'
import { useReports, type Loaded } from '../api/ReportsProvider'
import type { DataSource, Phase2Report, Phase2Run, Phase2Spec, ResultStatus } from '../api/types'
import { PHASE2_CATALOG } from '../data/phase2Catalog'

const INFRA_ERROR = /fetch failed|ECONNREFUSED|not initialized|transport_error|socket hang up/i

/** One Phase 2 check as the UI shows it, with where the status came from. */
export interface Phase2Resolved {
  spec: Phase2Spec
  status: ResultStatus
  source: DataSource
  run?: Phase2Run
  at?: string
  /** True when a passing run reproduced a documented limitation rather than a strong control. */
  limitation: boolean
  note?: string
  origin?: string
}

const fromRun = (run: Phase2Run): ResultStatus =>
  run.status === 'pass' ? 'PASS'
    : run.status === 'unsupported' ? 'UNSUPPORTED'
      : run.status === 'not_implemented' ? 'NOT_IMPLEMENTED'
        : run.error && INFRA_ERROR.test(run.error) ? 'ERROR' : 'FAIL'

/**
 * Precedence: running → a run on this server process (LIVE) → the saved report
 * (RECORDED) → what the catalogue says about checks that cannot run (REPO) →
 * NOT RUN. Unsupported and not-implemented never become PASS.
 */
export function resolvePhase2(
  spec: Phase2Spec,
  live: Map<string, Phase2Run>,
  recorded: Loaded<Phase2Report> | null,
  running: Set<string>,
): Phase2Resolved {
  const limitation = spec.disposition === 'limitation_reproduced'
  if (running.has(`p2:${spec.id}`)) return { spec, status: 'RUNNING', source: 'live', limitation }
  const run = live.get(spec.id)
  if (run) return { spec, status: fromRun(run), source: 'live', run, at: run.at, limitation: run.disposition === 'limitation_reproduced', note: run.error ?? run.reason }
  const rec = recorded?.report.scenarios.find(r => r.id === spec.id)
  if (rec) return { spec, status: fromRun(rec), source: 'recorded', run: rec, at: rec.at ?? recorded!.report.generatedAt, limitation: rec.disposition === 'limitation_reproduced', note: rec.error ?? rec.reason, origin: recorded!.fileName }
  if (spec.kind === 'unsupported') return { spec, status: 'UNSUPPORTED', source: 'repository', limitation: false, note: spec.reason }
  if (spec.kind === 'not_implemented') return { spec, status: 'NOT_IMPLEMENTED', source: 'repository', limitation: false, note: spec.reason }
  return { spec, status: 'NOT_RUN', source: 'live', limitation, note: 'Not run on this server and not in a saved report' }
}

export interface Phase2View {
  specs: Phase2Spec[]
  /** Where the catalogue came from: the running server, or the repository copy. */
  catalogSource: 'live' | 'repository'
  resolve: (id: string) => Phase2Resolved | undefined
  all: Phase2Resolved[]
  counts: Record<ResultStatus, number> & { limitation: number }
  sources: Partial<Record<DataSource, number>>
  runnable: boolean
}

export function usePhase2(): Phase2View {
  const { phase2, latestPhase2ById, running, health } = useData()
  const { phase2: recorded } = useReports()
  return useMemo(() => {
    const liveSpecs = phase2.data?.scenarios ?? []
    const specs = liveSpecs.length ? liveSpecs : PHASE2_CATALOG
    const all = specs.map(s => resolvePhase2(s, latestPhase2ById, recorded, running))
    const byId = new Map(all.map(r => [r.spec.id, r]))
    const counts = { PASS: 0, FAIL: 0, NOT_RUN: 0, UNSUPPORTED: 0, NOT_IMPLEMENTED: 0, ERROR: 0, RUNNING: 0, limitation: 0 }
    const sources: Partial<Record<DataSource, number>> = {}
    for (const r of all) {
      counts[r.status]++
      if (r.status === 'PASS' && r.limitation) counts.limitation++
      if (r.status !== 'NOT_RUN') sources[r.source] = (sources[r.source] ?? 0) + 1
    }
    return {
      specs, catalogSource: liveSpecs.length ? 'live' : 'repository', resolve: (id: string) => byId.get(id), all, counts, sources,
      runnable: phase2.status === 'live' && health.data?.phase2Configured !== false && health.data?.gatewayConfigured === true,
    }
  }, [phase2, latestPhase2ById, recorded, running, health.data])
}

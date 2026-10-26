import type { ApprovalReplayObserved, ObservedDecision, ResultStatus, ScenarioRun } from '../api/types'
import type { CatalogScenario } from '../data/catalog'

const INFRA_ERROR = /fetch failed|ECONNREFUSED|not initialized|unknown scenario|transport_error|socket/i

/** Map a runner result to a UI status. A runner failure caused by infrastructure is ERROR, not FAIL. */
export function runStatus(run: ScenarioRun | undefined, isRunning = false): ResultStatus {
  if (isRunning) return 'RUNNING'
  if (!run) return 'NOT_RUN'
  if (run.pass) return 'PASS'
  return run.error && INFRA_ERROR.test(run.error) ? 'ERROR' : 'FAIL'
}

/** Live status for any catalogue entry. Unsupported / unimplemented never become PASS. */
export function catalogStatus(s: CatalogScenario, latest: Map<string, ScenarioRun>, running: Set<string>): ResultStatus {
  switch (s.implementation) {
    case 'executable': return runStatus(latest.get(s.id), running.has(s.id))
    case 'unsupported': return 'UNSUPPORTED'
    case 'not_implemented':
    case 'partial': return 'NOT_IMPLEMENTED'
    case 'baseline_only': return 'NOT_RUN'
  }
}

export function isReplay(o: ScenarioRun['observed']): o is ApprovalReplayObserved {
  return !!o && 'first' in o
}

/** Normalise the two observation shapes into one decision record. */
export function decisionOf(run?: ScenarioRun): ObservedDecision | undefined {
  if (!run?.observed) return undefined
  return isReplay(run.observed) ? run.observed.first : run.observed
}

export function effectsOf(run?: ScenarioRun): number | undefined {
  if (!run?.observed) return undefined
  if (isReplay(run.observed)) return run.observed.backendEffects
  return run.observed.backendEffects
}

export function fmtMs(ms?: number | null) {
  if (ms === undefined || ms === null) return '—'
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`
}

export function fmtTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

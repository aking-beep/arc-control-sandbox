import { useMemo } from 'react'
import type { DataSource, ResultStatus } from '../api/types'
import { BASELINE_NOTE, FINDINGS, type Finding, type FindingStage } from '../data/baseline'
import { usePhase2, type Phase2Resolved } from './phase2'

/** A finding together with the latest result of the Phase 2 check that reproduces it. */
export interface FindingState {
  finding: Finding
  stage: FindingStage
  /** Status of the reproducing check, or FAIL from the committed baseline when there is no newer result. */
  checkStatus: ResultStatus
  source: DataSource
  sourceNote: string
  at?: string
  error?: string
  /** Effects observed by the latest result. null when the result does not say. */
  observedEffects: number | null
  observedLabel: string
  check?: Phase2Resolved
  /** A resolved finding whose check fails again. */
  regressed?: boolean
}

function stateOf(f: Finding, check: Phase2Resolved | undefined): FindingState {
  const result = check && (check.status === 'PASS' || check.status === 'FAIL' || check.status === 'ERROR') ? check : undefined
  if (!result) {
    // Nothing newer than the committed measurement: report on that basis.
    const fixed = !!f.resolution
    return {
      finding: f, stage: fixed ? 'resolved' : 'open', checkStatus: check?.status === 'RUNNING' ? 'RUNNING' : fixed ? 'PASS' : 'FAIL', source: 'baseline', sourceNote: BASELINE_NOTE,
      observedEffects: f.baselineActual.effects, observedLabel: f.baselineActual.value, check,
    }
  }
  const sourceNote = result.source === 'recorded' ? `${result.origin ?? 'saved report'}` : 'Run on the current Meridian server'
  if (result.status === 'PASS') {
    return {
      finding: f, stage: f.resolution ? 'resolved' : 'regression_passing', checkStatus: 'PASS', source: result.source, sourceNote, at: result.at,
      observedEffects: f.expectedEffects, observedLabel: f.expected.value, check: result,
    }
  }
  const seen = result.status === 'FAIL' ? f.describe(result.run?.error) : null
  return {
    finding: f, stage: 'open', checkStatus: result.status, source: result.source, sourceNote, at: result.at, error: result.run?.error,
    observedEffects: seen?.effects ?? null,
    observedLabel: result.status === 'ERROR' ? 'Unknown — check errored' : seen?.label ?? 'See runner error',
    check: result,
    regressed: result.status === 'FAIL' && !!f.resolution,
  }
}

/**
 * Findings never close from this UI alone. `resolved` comes from a recorded fix
 * plus independent retests in data/baseline.ts, and still needs the reproducing
 * check to pass; if it fails, the finding is shown as a regression. Resolved
 * findings stay listed.
 */
export function useFindingStates(): FindingState[] {
  const p2 = usePhase2()
  return useMemo(() => FINDINGS.map(f => stateOf(f, p2.resolve(f.check))), [p2])
}

export function useFindingState(id?: string): FindingState | undefined {
  return useFindingStates().find(s => s.finding.id === id)
}

/**
 * Failing Phase 2 checks that no finding covers yet. They are shown as
 * unclassified failures so a new regression is visible before anyone writes it up.
 */
export function useUnmappedFailures(): Phase2Resolved[] {
  const p2 = usePhase2()
  return useMemo(() => {
    const mapped = new Set(FINDINGS.map(f => f.check))
    return p2.all.filter(r => (r.status === 'FAIL' || r.status === 'ERROR') && !mapped.has(r.spec.id))
  }, [p2])
}

/** Header label and colour for a finding, with regressions called out. */
export function stageText(s: FindingState): { label: string; tone: string } {
  if (s.regressed) return { label: 'Regressed', tone: 'text-critical-ink' }
  if (s.stage === 'resolved') return { label: 'Resolved', tone: 'text-success' }
  if (s.stage === 'open') return { label: 'Open', tone: 'text-critical-ink' }
  return { label: STAGE_LABEL[s.stage], tone: 'text-warning-ink' }
}

export const STAGE_LABEL: Record<FindingStage, string> = {
  open: 'Open',
  fix_proposed: 'Fix proposed',
  regression_passing: 'Check passing · retest pending',
  resolved: 'Resolved',
}

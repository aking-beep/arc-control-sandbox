import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { asResource, meridianApi } from './client'
import type { IntegrationReport, Phase2FileReport, Phase2Summary, ReportIndex, Resource } from './types'

/**
 * Saved report files, served by the sandbox and redacted server-side.
 *
 *   GET /api/reports          which reports exist
 *   GET /api/reports/latest   reports/latest.json        (`npm run validate`)
 *   GET /api/reports/phase2   reports/phase2-latest.json (`npm run phase2`)
 *
 * A report that has not been generated resolves to `empty`, not to
 * `not_implemented` and not to zeroes: the route works, the run has not
 * happened. Callers must show "not generated yet" and the command to run.
 *
 * `importFile` stays for reviewing a report file out of band (a run from
 * another machine, or an archived reports/phase2-<stamp>.json). It validates
 * against the shapes report.mjs and phase2-report.mjs actually write.
 */

export interface Imported<T> { report: T; fileName: string; loadedAt: string }

interface ReportsValue {
  index: Resource<ReportIndex>
  /** Live from the server. */
  integration: Resource<IntegrationReport>
  phase2: Resource<Phase2FileReport>
  /** Out-of-band files the operator opened in this browser. */
  importedIntegration: Imported<IntegrationReport> | null
  importedPhase2: Imported<Phase2FileReport> | null
  refresh: () => Promise<void>
  importFile: (file: File) => Promise<{ ok: true; kind: 'integration' | 'phase2' } | { ok: false; error: string }>
  clear: (kind: 'integration' | 'phase2') => void
}

const KEY = { integration: 'meridian.report.integration', phase2: 'meridian.report.phase2' } as const
const Ctx = createContext<ReportsValue | null>(null)

const read = <T,>(key: string): Imported<T> | null => {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as Imported<T>) : null } catch { return null }
}

const isIntegrationReport = (b: Record<string, unknown>) =>
  Array.isArray(b.results) && typeof b.generatedAt === 'string' &&
  typeof b.verification === 'string' && typeof b.passed === 'number' && typeof b.total === 'number'

/** The shape phase2-report.mjs writes: a summary object plus lowercase-status scenarios. */
const isPhase2Report = (b: Record<string, unknown>) => {
  if (typeof b.generatedAt !== 'string' || !Array.isArray(b.scenarios)) return false
  const summary = b.phase2 as Partial<Phase2Summary> | undefined
  return !!summary && typeof summary.total === 'number' && typeof summary.pass === 'number' && typeof summary.fail === 'number'
}

const P2_STATUS = new Set(['pass', 'fail', 'unsupported', 'not_implemented'])

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<Resource<ReportIndex>>({ status: 'loading' })
  const [integration, setIntegration] = useState<Resource<IntegrationReport>>({ status: 'loading' })
  const [phase2, setPhase2] = useState<Resource<Phase2FileReport>>({ status: 'loading' })
  const [importedIntegration, setImportedIntegration] = useState(() => read<IntegrationReport>(KEY.integration))
  const [importedPhase2, setImportedPhase2] = useState(() => read<Phase2FileReport>(KEY.phase2))
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const [i, integ, p2] = await Promise.all([
      asResource(meridianApi.reports()),
      asResource(meridianApi.integrationReport()),
      asResource(meridianApi.phase2Report()),
    ])
    if (!mounted.current) return
    setIndex(i); setIntegration(integ); setPhase2(p2)
  }, [])

  useEffect(() => {
    mounted.current = true
    refresh()
    return () => { mounted.current = false }
  }, [refresh])

  const importFile = useCallback<ReportsValue['importFile']>(async file => {
    let body: unknown
    try { body = JSON.parse(await file.text()) } catch { return { ok: false, error: `${file.name} is not valid JSON` } }
    const b = body as Record<string, unknown>
    const meta = { fileName: file.name, loadedAt: new Date().toISOString() }

    if (b && isIntegrationReport(b)) {
      const value = { report: b as unknown as IntegrationReport, ...meta }
      setImportedIntegration(value)
      try { localStorage.setItem(KEY.integration, JSON.stringify(value)) } catch { /* quota */ }
      return { ok: true, kind: 'integration' }
    }
    if (b && isPhase2Report(b)) {
      const bad = (b.scenarios as Array<{ id?: unknown; status?: unknown }>)
        .find(r => typeof r.id !== 'string' || !P2_STATUS.has(String(r.status)))
      if (bad) {
        return { ok: false, error: `Phase 2 scenario ${String(bad.id ?? '?')} has status "${String(bad.status)}". Expected pass, fail, unsupported or not_implemented.` }
      }
      const value = { report: b as unknown as Phase2FileReport, ...meta }
      setImportedPhase2(value)
      try { localStorage.setItem(KEY.phase2, JSON.stringify(value)) } catch { /* quota */ }
      return { ok: true, kind: 'phase2' }
    }
    return { ok: false, error: `${file.name} is neither a reports/latest.json (npm run validate) nor a reports/phase2-latest.json (npm run phase2).` }
  }, [])

  const clear = useCallback((kind: 'integration' | 'phase2') => {
    try { localStorage.removeItem(KEY[kind]) } catch { /* ignore */ }
    if (kind === 'integration') setImportedIntegration(null)
    else setImportedPhase2(null)
  }, [])

  const value = useMemo<ReportsValue>(() => ({
    index, integration, phase2, importedIntegration, importedPhase2, refresh, importFile, clear,
  }), [index, integration, phase2, importedIntegration, importedPhase2, refresh, importFile, clear])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useReports() {
  const value = useContext(Ctx)
  if (!value) throw new Error('useReports must be used inside ReportsProvider')
  return value
}

/**
 * Count a Phase 2 report's scenarios by status. Never merges unsupported or
 * not_implemented into pass, and keeps the limitation-reproduced subset of the
 * passes visible so "31 passed" is not read as "31 controls proven".
 */
export function phase2Counts(report: Phase2FileReport) {
  const counts = { pass: 0, fail: 0, unsupported: 0, notImplemented: 0, limitationReproduced: 0 }
  for (const scenario of report.scenarios) {
    if (scenario.status === 'pass') counts.pass++
    else if (scenario.status === 'fail') counts.fail++
    else if (scenario.status === 'unsupported') counts.unsupported++
    else if (scenario.status === 'not_implemented') counts.notImplemented++
    if (scenario.status === 'pass' && scenario.disposition === 'limitation_reproduced') counts.limitationReproduced++
  }
  return counts
}

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { IntegrationReport, Phase2Report, ResultStatus } from './types'

/**
 * RECORDED source: saved report files loaded by the user.
 *
 * - Integration: the exact `reports/latest.json` / `reports/integration-*.json`
 *   written by report.mjs (`npm run validate`).
 * - Phase 2: the documented Phase2Report shape in api/types.ts (PROPOSED format;
 *   no Phase 2 runner exists in arc-control-sandbox@c1e8c05).
 *
 * Kept in localStorage so a reload doesn't lose them. Replace the file import
 * with GET /api/reports once the sandbox serves reports/*.json.
 */

export interface Loaded<T> { report: T; fileName: string; loadedAt: string }

interface ReportsValue {
  integration: Loaded<IntegrationReport> | null
  phase2: Loaded<Phase2Report> | null
  importFile: (file: File) => Promise<{ ok: true; kind: 'integration' | 'phase2' } | { ok: false; error: string }>
  clear: (kind: 'integration' | 'phase2') => void
}

const KEY = { integration: 'meridian.report.integration', phase2: 'meridian.report.phase2' } as const
const Ctx = createContext<ReportsValue | null>(null)

const read = <T,>(k: string): Loaded<T> | null => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as Loaded<T> : null } catch { return null }
}

const P2_STATUS: ResultStatus[] = ['PASS', 'FAIL', 'UNSUPPORTED', 'NOT_IMPLEMENTED', 'ERROR', 'NOT_RUN']

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [integration, setIntegration] = useState(() => read<IntegrationReport>(KEY.integration))
  const [phase2, setPhase2] = useState(() => read<Phase2Report>(KEY.phase2))

  const importFile = useCallback<ReportsValue['importFile']>(async file => {
    let body: unknown
    try { body = JSON.parse(await file.text()) } catch { return { ok: false, error: `${file.name} is not valid JSON` } }
    const b = body as Record<string, unknown>
    const loaded = { fileName: file.name, loadedAt: new Date().toISOString() }

    if (b && Array.isArray(b.results) && typeof b.generatedAt === 'string' && typeof b.verification === 'string' && typeof b.passed === 'number') {
      const v = { report: b as unknown as IntegrationReport, ...loaded }
      setIntegration(v); try { localStorage.setItem(KEY.integration, JSON.stringify(v)) } catch { /* quota */ }
      return { ok: true, kind: 'integration' }
    }
    if (b && b.suite === 'phase2' && Array.isArray(b.results) && typeof b.generatedAt === 'string') {
      const bad = (b.results as Array<{ id?: unknown; status?: unknown }>).find(r => typeof r.id !== 'string' || !P2_STATUS.includes(r.status as ResultStatus))
      if (bad) return { ok: false, error: `Phase 2 result ${String(bad.id ?? '?')} has an unknown status. Use PASS, FAIL, UNSUPPORTED, NOT_IMPLEMENTED or ERROR.` }
      const v = { report: b as unknown as Phase2Report, ...loaded }
      setPhase2(v); try { localStorage.setItem(KEY.phase2, JSON.stringify(v)) } catch { /* quota */ }
      return { ok: true, kind: 'phase2' }
    }
    return { ok: false, error: `${file.name} is neither a report.mjs integration report nor a Phase 2 report (suite: "phase2").` }
  }, [])

  const clear = useCallback((kind: 'integration' | 'phase2') => {
    try { localStorage.removeItem(KEY[kind]) } catch { /* ignore */ }
    kind === 'integration' ? setIntegration(null) : setPhase2(null)
  }, [])

  return <Ctx.Provider value={{ integration, phase2, importFile, clear }}>{children}</Ctx.Provider>
}

export function useReports() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useReports must be used inside ReportsProvider')
  return v
}

/** Count a Phase 2 report's results by status. Never merges UNSUPPORTED / NOT_IMPLEMENTED into PASS. */
export function phase2Counts(r: Phase2Report) {
  const c = { pass: 0, fail: 0, unsupported: 0, notImplemented: 0, error: 0, notRun: 0 }
  for (const x of r.results) {
    if (x.status === 'PASS') c.pass++
    else if (x.status === 'FAIL') c.fail++
    else if (x.status === 'UNSUPPORTED') c.unsupported++
    else if (x.status === 'NOT_IMPLEMENTED') c.notImplemented++
    else if (x.status === 'ERROR') c.error++
    else c.notRun++
  }
  return c
}

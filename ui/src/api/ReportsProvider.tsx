import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { meridianApi } from './client'
import type { IntegrationReport, Phase2Report, Phase2Status } from './types'

/**
 * RECORDED source: saved report files.
 *
 * - Integration: reports/latest.json written by report.mjs (`npm run validate`).
 * - Phase 2: reports/phase2-latest.json written by phase2-report.mjs (`npm run phase2`).
 *
 * The server copy (GET /api/reports/:kind) loads automatically. A file the user
 * imports takes precedence until cleared, and is kept in localStorage so a
 * reload does not lose it. Both are labelled with where they came from.
 */

export interface Loaded<T> { report: T; fileName: string; loadedAt: string; origin: 'server' | 'file' }

type Kind = 'integration' | 'phase2'

interface ReportsValue {
  integration: Loaded<IntegrationReport> | null
  phase2: Loaded<Phase2Report> | null
  importFile: (file: File) => Promise<{ ok: true; kind: Kind } | { ok: false; error: string }>
  clear: (kind: Kind) => void
  reload: () => Promise<void>
}

const KEY = { integration: 'meridian.report.integration', phase2: 'meridian.report.phase2.v2' } as const
const Ctx = createContext<ReportsValue | null>(null)

const read = <T,>(k: string): Loaded<T> | null => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as Loaded<T> : null } catch { return null }
}

const P2_STATUS: Phase2Status[] = ['pass', 'fail', 'unsupported', 'not_implemented']

const isIntegration = (b: Record<string, unknown>) =>
  Array.isArray(b.results) && typeof b.generatedAt === 'string' && typeof b.verification === 'string' && typeof b.passed === 'number'
const isPhase2 = (b: Record<string, unknown>) =>
  b.runner === 'arc-control-sandbox-phase2' && Array.isArray(b.scenarios) && typeof b.generatedAt === 'string' && !!b.phase2

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [imported, setImported] = useState(() => ({ integration: read<IntegrationReport>(KEY.integration), phase2: read<Phase2Report>(KEY.phase2) }))
  const [server, setServer] = useState<{ integration: Loaded<IntegrationReport> | null; phase2: Loaded<Phase2Report> | null }>({ integration: null, phase2: null })

  const reload = useCallback(async () => {
    const at = new Date().toISOString()
    const [i, p] = await Promise.all([
      meridianApi.savedReport('integration').catch(() => null),
      meridianApi.savedReport('phase2').catch(() => null),
    ])
    setServer({
      integration: i?.report && isIntegration(i.report as unknown as Record<string, unknown>) ? { report: i.report as IntegrationReport, fileName: i.file, loadedAt: at, origin: 'server' } : null,
      phase2: p?.report && isPhase2(p.report as unknown as Record<string, unknown>) ? { report: p.report as Phase2Report, fileName: p.file, loadedAt: at, origin: 'server' } : null,
    })
  }, [])

  useEffect(() => { reload() }, [reload])

  const importFile = useCallback<ReportsValue['importFile']>(async file => {
    let body: unknown
    try { body = JSON.parse(await file.text()) } catch { return { ok: false, error: `${file.name} is not valid JSON` } }
    const b = (body ?? {}) as Record<string, unknown>
    const loaded = { fileName: file.name, loadedAt: new Date().toISOString(), origin: 'file' as const }

    if (isIntegration(b)) {
      const v = { report: b as unknown as IntegrationReport, ...loaded }
      setImported(s => ({ ...s, integration: v })); try { localStorage.setItem(KEY.integration, JSON.stringify(v)) } catch { /* quota */ }
      return { ok: true, kind: 'integration' }
    }
    if (isPhase2(b)) {
      const bad = (b.scenarios as Array<{ id?: unknown; status?: unknown }>).find(r => typeof r.id !== 'string' || !P2_STATUS.includes(r.status as Phase2Status))
      if (bad) return { ok: false, error: `Phase 2 result ${String(bad.id ?? '?')} has an unknown status. Expected pass, fail, unsupported or not_implemented.` }
      const v = { report: b as unknown as Phase2Report, ...loaded }
      setImported(s => ({ ...s, phase2: v })); try { localStorage.setItem(KEY.phase2, JSON.stringify(v)) } catch { /* quota */ }
      return { ok: true, kind: 'phase2' }
    }
    return { ok: false, error: `${file.name} is neither reports/latest.json (npm run validate) nor reports/phase2-latest.json (npm run phase2).` }
  }, [])

  const clear = useCallback((kind: Kind) => {
    try { localStorage.removeItem(KEY[kind]) } catch { /* ignore */ }
    setImported(s => ({ ...s, [kind]: null }))
  }, [])

  return (
    <Ctx.Provider value={{ integration: imported.integration ?? server.integration, phase2: imported.phase2 ?? server.phase2, importFile, clear, reload }}>
      {children}
    </Ctx.Provider>
  )
}

export function useReports() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useReports must be used inside ReportsProvider')
  return v
}

/** Count a Phase 2 report's results by status. Never merges unsupported / not implemented into pass. */
export function phase2Counts(r: Phase2Report) {
  const c = { pass: 0, fail: 0, unsupported: 0, notImplemented: 0, limitation: 0 }
  for (const x of r.scenarios) {
    if (x.status === 'pass') { c.pass++; if (x.disposition === 'limitation_reproduced') c.limitation++ }
    else if (x.status === 'fail') c.fail++
    else if (x.status === 'unsupported') c.unsupported++
    else c.notImplemented++
  }
  return c
}

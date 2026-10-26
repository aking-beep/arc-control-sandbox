import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Play, Search } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Button, Th, Td, Empty } from '../../components/ui/primitives'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SourceTag } from '../../components/ui/SourceTag'
import { ScenarioDrawer } from '../../components/lab/ScenarioDrawer'
import { ALL_CATALOG, SUITE_LABEL, type CatalogScenario, type Suite } from '../../data/catalog'
import { BASELINE_NOTE } from '../../data/baseline'
import { PATHS, PATH_LABEL, pathOf, type ArcPath } from '../../data/paths'
import type { ResultStatus, ScenarioRun } from '../../api/types'
import { catalogStatus, decisionOf, fmtMs, fmtTime } from '../../lib/status'
import { FAMILIES, FAMILY_LABEL, familyOf, type Family } from '../../data/families'
import { useReports } from '../../api/ReportsProvider'
import { usePhase2 } from '../../lib/phase2'

const STATUSES: ResultStatus[] = ['PASS', 'FAIL', 'NOT_RUN', 'UNSUPPORTED', 'NOT_IMPLEMENTED', 'ERROR']

export function ScenarioLab() {
  const { latestRunById, running, runScenario, runAll, runPhase2, runPhase2All, arcReady } = useData()
  const p2 = usePhase2()
  const [params, setParams] = useSearchParams()
  const suite = (params.get('suite') as Suite | 'all') ?? 'all'
  const path = (params.get('path') as ArcPath | null) ?? 'all'
  const family = (params.get('family') as Family | null) ?? 'all'
  const { integration: recInt } = useReports()
  const recById = useMemo(() => new Map((recInt?.report.results ?? []).map(r => [r.id, r] as [string, ScenarioRun])), [recInt])
  const statusOf = (s: CatalogScenario) => catalogStatus(s, latestRunById, running, p2.resolve)
  const [grouped, setGrouped] = useState(true)
  const [status, setStatus] = useState<ResultStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<CatalogScenario | null>(null)
  const live = arcReady

  useEffect(() => {
    const f = params.get('focus')
    if (f) setSelected(ALL_CATALOG.find(s => s.id === f) ?? null)
  }, [params])

  const rows = useMemo(() => ALL_CATALOG.filter(s => {
    if (suite !== 'all' && s.suite !== suite) return false
    if (path !== 'all' && pathOf(s.id) !== path) return false
    if (family !== 'all' && familyOf(s.category) !== family) return false
    if (status !== 'all' && statusOf(s) !== status) return false
    if (q && !`${s.id} ${s.description} ${s.category} ${s.agent} ${s.tool}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [suite, path, family, status, q, latestRunById, running, p2])

  const sections: Array<{ id: ArcPath | 'flat'; rows: CatalogScenario[] }> = grouped
    ? (['allow', 'approval', 'deny', 'refuse', 'phase2', 'planned'] as ArcPath[]).map(id => ({ id, rows: rows.filter(s => pathOf(s.id) === id) })).filter(g => g.rows.length)
    : [{ id: 'flat', rows }]

  const count = (fn: (s: CatalogScenario) => boolean) => ALL_CATALOG.filter(fn).length
  const setParam = (key: string) => (v: string) => { const n = new URLSearchParams(params); v === 'all' ? n.delete(key) : n.set(key, v); n.delete('focus'); setParams(n) }
  const setSuite = setParam('suite')

  return (
    <>
      <PageHeader
        title="Scenario Lab"
        description="Every scenario asserts ARC’s response, readable evidence and the actual Meridian mutation count. A scenario only passes when all three agree."
        actions={<>
          <Button loading={running.has('__p2all__')} disabled={!p2.runnable || running.has('__all__')} onClick={runPhase2All}
            title={p2.runnable ? 'POST /api/phase2/all — registers probe agents, tools and policies in the running ARC process; takes a minute or more' : 'Phase 2 runner not reachable'}>Run Phase 2 suite</Button>
          <Button variant="primary" icon={<Play className="size-3.5" />} loading={running.has('__all__')} disabled={!live || running.has('__p2all__')} onClick={runAll}
            title={live ? 'POST /api/scenarios/all' : 'Meridian server or ARC gateway not reachable'}>Run original 17</Button>
        </>}
      />

      <div className="grid gap-5 lg:grid-cols-[176px_minmax(0,1fr)]">
        <aside className="space-y-5 text-[13px]">
          <FilterGroup label="Suite" value={suite} onChange={setSuite} options={[
            { id: 'all', label: 'All scenarios', n: ALL_CATALOG.length },
            ...(['original', 'phase2', 'adversarial'] as Suite[]).map(s => ({ id: s, label: SUITE_LABEL[s], n: count(x => x.suite === s) })),
          ]} />
          <FilterGroup label="ARC decision path" value={path} onChange={setParam('path')} options={[
            { id: 'all', label: 'Any path' },
            ...(['allow', 'approval', 'deny', 'refuse', 'phase2', 'planned'] as ArcPath[]).map(p => ({ id: p, label: PATH_LABEL[p], n: count(x => pathOf(x.id) === p) })),
          ]} />
          <FilterGroup label="Family" value={family} onChange={setParam('family')} options={[
            { id: 'all', label: 'Any family' },
            ...FAMILIES.map(f => ({ id: f, label: FAMILY_LABEL[f], n: count(x => familyOf(x.category) === f) })),
          ]} />
          <FilterGroup label="Status" value={status} onChange={v => setStatus(v as ResultStatus | 'all')} options={[
            { id: 'all', label: 'Any status' },
            ...STATUSES.map(s => ({ id: s, label: s.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()), n: count(x => statusOf(x) === s) })),
          ]} />
          <p className="text-[11.5px] leading-relaxed text-faint">Run buttons appear only for scenarios the sandbox backend can execute. Phase 2 catalogue: {p2.catalogSource === 'live' ? 'from the running server' : 'repository copy (runner not available)'}.</p>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-80 items-center gap-2 rounded-md border border-line bg-surface px-2.5">
              <Search className="size-3.5 text-faint" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search id, description, agent, tool" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex rounded-md border border-line bg-surface p-0.5 text-[12px]">
                {([[true, 'By ARC path'], [false, 'Flat list']] as const).map(([v, l]) => (
                  <button key={l} onClick={() => setGrouped(v)} className={`rounded px-2 py-1 whitespace-nowrap transition-colors duration-150 ${grouped === v ? 'bg-navy text-white' : 'text-muted hover:text-ink'}`}>{l}</button>
                ))}
              </div>
              <span className="text-[12px] text-muted"><span className="tnum">{rows.length}</span> shown</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[900px] border-collapse">
              <thead><tr>
                <Th>ID</Th><Th>Scenario · agent → tool</Th><Th>Expected</Th><Th>Actual</Th><Th>Status</Th><Th>Backend effect</Th><Th>Evidence</Th><Th>Last run</Th><Th />
              </tr></thead>
              {sections.map(sec => (
              <tbody key={sec.id}>
                {sec.id !== 'flat' && <PathHeader id={sec.id} latest={latestRunById} p2={p2} />}
                {sec.rows.map(s => {
                  const isP2 = s.runner === 'phase2'
                  const run = isP2 ? undefined : latestRunById.get(s.id)
                  const p2r = isP2 ? p2.resolve(s.id) : undefined
                  const st = statusOf(s)
                  const d = decisionOf(run)
                  const finding = s.note?.match(/finding (ARC-SEC-\d+)/)?.[1]
                  return (
                    <tr key={s.id} onClick={() => setSelected(s)} className={`cursor-pointer transition-colors duration-100 hover:bg-canvas ${selected?.id === s.id ? 'bg-mint-50/60' : ''}`}>
                      <Td className="font-mono text-[11.5px] text-muted">{s.id}</Td>
                      <Td>
                        <div className="font-medium text-ink">{s.description}</div>
                        <div className="text-[11.5px] text-faint">{s.category} · <span className="font-mono">{s.agent} → <span className="text-teal-ink">{s.tool}</span></span></div>
                      </Td>
                      <Td className="font-mono text-[11.5px]">{s.expected}</Td>
                      <Td className="font-mono text-[11.5px]">
                        {run ? (d?.outcome ?? d?.decision ?? (d ? `HTTP ${d.httpStatus}` : '—')) :
                          p2r?.run ? <span className="inline-flex items-center gap-1.5"><span className={p2r.run.status === 'fail' ? 'font-medium text-critical-ink' : 'text-ink'}>{p2r.run.disposition.replace('_', ' ')}</span><SourceTag source={p2r.source} at={p2r.at} note={p2r.origin} /></span> :
                          !isP2 && recById.get(s.id) ? <span className="inline-flex items-center gap-1.5"><span className={recById.get(s.id)!.pass ? 'text-ink' : 'font-medium text-critical-ink'}>{recById.get(s.id)!.pass ? 'PASS' : 'FAIL'}</span><SourceTag source="recorded" note={`${recInt!.fileName} · ${fmtTime(recInt!.report.generatedAt)}`} /></span> :
                          s.baseline ? <span className="inline-flex items-center gap-1.5"><span className="text-muted">{s.baseline}</span><SourceTag source="baseline" note={BASELINE_NOTE} /></span> : <span className="text-faint">—</span>}
                      </Td>
                      <Td><StatusBadge status={st} /></Td>
                      <Td className="font-mono text-[11.5px] text-muted">{s.expectedEffect}</Td>
                      <Td className="font-mono text-[11.5px]">{d?.evidenceId ? <span className="text-teal-ink">{d.evidenceId.slice(0, 10)}…</span> : <span className="text-faint">{run ? 'none' : '—'}</span>}</Td>
                      <Td className="whitespace-nowrap font-mono text-[11.5px] text-muted">
                        {run ? <><div>{fmtTime(run.at)}</div><div className="text-faint">{fmtMs(run.elapsedMs)}</div></> :
                          p2r?.run ? <><div>{fmtTime(p2r.at)}</div><div className="text-faint">{fmtMs(p2r.run.elapsedMs)}</div></> : '—'}
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        {finding && (
                          <Link to={`/lab/inspector?finding=${finding}`} onClick={e => e.stopPropagation()}
                            className="rounded px-2 py-1 text-[12px] font-medium text-critical-ink transition-colors duration-150 hover:bg-critical-50">Inspect</Link>
                        )}
                        {s.implementation === 'executable' && (() => {
                          const key = isP2 ? `p2:${s.id}` : s.id
                          const enabled = isP2 ? p2.runnable : live
                          return (
                            <button onClick={e => { e.stopPropagation(); isP2 ? runPhase2(s.id) : runScenario(s.id) }} disabled={!enabled || running.has(key) || running.has('__p2all__') || running.has('__all__')}
                              title={isP2 ? `POST /api/phase2/${s.id}` : `POST /api/scenarios/${s.id}`}
                              className="rounded px-2 py-1 text-[12px] font-medium text-teal-ink transition-colors duration-150 hover:bg-mint-50 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent">
                              {running.has(key) ? 'Running…' : 'Run'}
                            </button>
                          )
                        })()}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
              ))}
            </table>
            {rows.length === 0 && <Empty title="No scenarios match these filters" />}
          </div>
        </div>
      </div>

      <ScenarioDrawer scenario={selected} onClose={() => { setSelected(null); if (params.get('focus')) { const n = new URLSearchParams(params); n.delete('focus'); setParams(n) } }} />
      <p className="mt-4 text-[12px] text-muted">Need the request → decision → effect chain? <Link to="/lab/inspector" className="font-medium text-teal-ink hover:underline">Open the Live Action Inspector</Link>.</p>
    </>
  )
}

/** Section header row: the path's contract, its live tally, and the known break if any. */
function PathHeader({ id, latest, p2 }: { id: ArcPath; latest: Map<string, ScenarioRun>; p2: ReturnType<typeof usePhase2> }) {
  const def = PATHS.find(p => p.id === id)
  if (id === 'phase2') {
    const c = p2.counts
    return (
      <tr className="bg-canvas">
        <td colSpan={9} className="border-b border-line px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[12.5px] font-semibold text-ink">{PATH_LABEL[id]}</span>
            <span className="text-[12px] text-muted">phase2.mjs. A pass that reproduces a documented limitation is marked as such; unsupported and not-implemented are never passes.</span>
            <span className="ml-auto tnum text-[11.5px] text-muted">
              <span className="font-semibold text-ink">{c.PASS}</span> pass{c.limitation ? ` (${c.limitation} limitation)` : ''} · <span className={c.FAIL ? 'font-semibold text-critical-ink' : ''}>{c.FAIL} fail</span>{c.ERROR ? ` · ${c.ERROR} error` : ''} · {c.UNSUPPORTED} unsupported · {c.NOT_IMPLEMENTED} not implemented · {c.NOT_RUN} not run
            </span>
          </div>
        </td>
      </tr>
    )
  }
  const runs = def ? def.scenarios.map(s => latest.get(s)).filter(Boolean) : []
  const held = runs.filter(r => r!.pass).length
  return (
    <tr className="bg-canvas">
      <td colSpan={9} className="border-b border-line px-3 py-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[12.5px] font-semibold text-ink">{PATH_LABEL[id]}</span>
          {def ? <span className="text-[12px] text-muted">{def.contract}</span> : <span className="text-[12px] text-muted">Specified in MASTER_BUILD_PLAN.md and only partly covered by Phase 2. Not counted as passes.</span>}
          <span className="ml-auto flex items-center gap-3 text-[11.5px]">
            {def && <span className="tnum text-muted">{runs.length ? <><span className="font-semibold text-ink">{held}</span>/{def.scenarios.length} held this session</> : 'not run this session'}</span>}
            {def?.knownBreak && <Link to={`/lab/inspector?finding=${def.knownBreak.findingId}`} className="font-mono font-medium text-critical-ink hover:underline">● {def.knownBreak.findingId} broke this path</Link>}
          </span>
        </div>
      </td>
    </tr>
  )
}

function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ id: string; label: string; n?: number }> }) {
  return (
    <div>
      <div className="mb-1.5 px-2 text-[11px] font-medium text-faint">{label}</div>
      <ul className="space-y-px">
        {options.map(o => (
          <li key={o.id}>
            <button onClick={() => onChange(o.id)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors duration-150 ${value === o.id ? 'bg-surface font-medium text-ink shadow-[inset_0_0_0_1px_var(--color-line)]' : 'text-muted hover:text-ink'}`}>
              <span className="truncate">{o.label}</span>
              {o.n !== undefined && <span className="font-mono text-[11px] text-faint">{o.n}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

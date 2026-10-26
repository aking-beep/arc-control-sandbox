import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Play, Search } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Button, Th, Td, Empty } from '../../components/ui/primitives'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SourceTag } from '../../components/ui/SourceTag'
import { ScenarioDrawer } from '../../components/lab/ScenarioDrawer'
import { ALL_CATALOG, SUITE_LABEL, type CatalogScenario, type Suite } from '../../data/catalog'
import { PATHS, PATH_LABEL, pathOf, type ArcPath } from '../../data/paths'
import type { ResultStatus, ScenarioRun } from '../../api/types'
import { catalogStatus, decisionOf, fmtMs, fmtTime } from '../../lib/status'
import { FAMILIES, FAMILY_LABEL, familyOf, type Family } from '../../data/families'
import { useReports } from '../../api/ReportsProvider'
import { usePhase2 } from '../../api/Phase2Provider'

const STATUSES: ResultStatus[] = ['PASS', 'FAIL', 'NOT_RUN', 'UNSUPPORTED', 'NOT_IMPLEMENTED', 'ERROR']

export function ScenarioLab() {
  const { latestRunById, running, runScenario, runAll, scenarios } = useData()
  const [params, setParams] = useSearchParams()
  const suite = (params.get('suite') as Suite | 'all') ?? 'all'
  const path = (params.get('path') as ArcPath | null) ?? 'all'
  const family = (params.get('family') as Family | null) ?? 'all'
  const { integration } = useReports()
  const savedInt = integration.data
  const recById = useMemo(() => new Map((savedInt?.results ?? []).map(r => [r.id, r] as [string, ScenarioRun])), [savedInt])
  const phase2 = usePhase2()
  const [grouped, setGrouped] = useState(true)
  const [status, setStatus] = useState<ResultStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<CatalogScenario | null>(null)
  const live = scenarios.status === 'live'

  useEffect(() => {
    const f = params.get('focus')
    if (f) setSelected(ALL_CATALOG.find(s => s.id === f) ?? null)
  }, [params])

  const rows = useMemo(() => ALL_CATALOG.filter(s => {
    if (suite !== 'all' && s.suite !== suite) return false
    if (path !== 'all' && pathOf(s.id) !== path) return false
    if (family !== 'all' && familyOf(s.category) !== family) return false
    if (status !== 'all' && catalogStatus(s, latestRunById, running, phase2.statusById) !== status) return false
    if (q && !`${s.id} ${s.description} ${s.category} ${s.agent} ${s.tool} ${s.phase2Id ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [suite, path, family, status, q, latestRunById, running, phase2.statusById])

  // The Phase 2 suite is the live catalogue, filtered the same way.
  const p2Rows = useMemo(() => phase2.specs.filter(spec => {
    if (path !== 'all' && pathOf(spec.id) !== path) return false
    if (family !== 'all' && familyOf(spec.family) !== family) return false
    if (status !== 'all' && phase2.statusOf(spec) !== status) return false
    if (q && !`${spec.id} ${spec.label} ${spec.family} ${spec.track}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [phase2, path, family, status, q])
  const showPhase2 = suite === 'all' || suite === 'phase2'

  const sections: Array<{ id: ArcPath | 'flat'; rows: CatalogScenario[] }> = grouped
    ? (['allow', 'approval', 'deny', 'refuse', 'planned'] as ArcPath[]).map(id => ({ id, rows: rows.filter(s => pathOf(s.id) === id) })).filter(g => g.rows.length)
    : [{ id: 'flat', rows }]

  const count = (fn: (s: CatalogScenario) => boolean) => ALL_CATALOG.filter(fn).length
  const countAll = (st: ResultStatus) =>
    ALL_CATALOG.filter(x => catalogStatus(x, latestRunById, running, phase2.statusById) === st).length +
    phase2.specs.filter(spec => phase2.statusOf(spec) === st).length
  const setParam = (key: string) => (v: string) => { const n = new URLSearchParams(params); v === 'all' ? n.delete(key) : n.set(key, v); n.delete('focus'); setParams(n) }
  const setSuite = setParam('suite')

  return (
    <>
      <PageHeader
        title="Scenario Lab"
        description="Every scenario asserts ARC’s response, readable evidence and the actual Meridian mutation count. A scenario only passes when all three agree."
        actions={<>
          <Button icon={<Play className="size-3.5" />} loading={phase2.running.has('__all__')} disabled={phase2.catalogue.status !== 'live'} onClick={phase2.runAll}
            title={phase2.catalogue.status === 'live' ? 'POST /api/phase2/all' : 'Meridian server not reachable'}>Run Phase 2</Button>
          <Button variant="primary" icon={<Play className="size-3.5" />} loading={running.has('__all__')} disabled={!live} onClick={runAll}
            title={live ? 'POST /api/scenarios/all' : 'Meridian server not reachable'}>Run original 17</Button>
        </>}
      />

      <div className="grid gap-5 lg:grid-cols-[176px_minmax(0,1fr)]">
        <aside className="space-y-5 text-[13px]">
          <FilterGroup label="Suite" value={suite} onChange={setSuite} options={[
            { id: 'all', label: 'All scenarios', n: ALL_CATALOG.length + phase2.specs.length },
            ...(['original', 'phase2', 'adversarial', 'regression'] as Suite[]).map(s => ({
              id: s, label: SUITE_LABEL[s],
              n: s === 'phase2' ? phase2.specs.length : count(x => x.suite === s),
            })),
          ]} />
          <FilterGroup label="ARC decision path" value={path} onChange={setParam('path')} options={[
            { id: 'all', label: 'Any path' },
            ...(['allow', 'approval', 'deny', 'refuse', 'planned'] as ArcPath[]).map(p => ({ id: p, label: PATH_LABEL[p], n: count(x => pathOf(x.id) === p) })),
          ]} />
          <FilterGroup label="Family" value={family} onChange={setParam('family')} options={[
            { id: 'all', label: 'Any family' },
            ...FAMILIES.map(f => ({ id: f, label: FAMILY_LABEL[f], n: count(x => familyOf(x.category) === f) })),
          ]} />
          <FilterGroup label="Status" value={status} onChange={v => setStatus(v as ResultStatus | 'all')} options={[
            { id: 'all', label: 'Any status' },
            ...STATUSES.map(s => ({ id: s, label: s.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()), n: countAll(s) })),
          ]} />
          <p className="text-[11.5px] leading-relaxed text-faint">Run buttons appear only for scenarios the sandbox backend can execute.</p>
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
              <span className="text-[12px] text-muted"><span className="tnum">{rows.length + (showPhase2 ? p2Rows.length : 0)}</span> shown</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[900px] border-collapse">
              <thead><tr>
                <Th>ID</Th><Th>Scenario · agent → tool</Th><Th>Expected</Th><Th>Actual</Th><Th>Status</Th><Th>Backend effect</Th><Th>Evidence</Th><Th>Last run</Th><Th />
              </tr></thead>
              {sections.map(sec => (
              <tbody key={sec.id}>
                {sec.id !== 'flat' && <PathHeader id={sec.id} latest={latestRunById} />}
                {sec.rows.map(s => {
                  const run = latestRunById.get(s.id)
                  const st = catalogStatus(s, latestRunById, running, phase2.statusById)
                  const p2run = s.phase2Id ? phase2.latestById.get(s.phase2Id) : undefined
                  const d = decisionOf(run)
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
                          p2run ? <span className="inline-flex items-center gap-1.5"><span className={p2run.status === 'fail' ? 'font-medium text-critical-ink' : 'text-ink'}>{p2run.status.replace(/_/g, ' ')}</span><SourceTag source="live" at={p2run.at} /></span> :
                          recById.get(s.id) ? <span className="inline-flex items-center gap-1.5"><span className={recById.get(s.id)!.pass ? 'text-ink' : 'font-medium text-critical-ink'}>{recById.get(s.id)!.pass ? 'PASS' : 'FAIL'}</span><SourceTag source="recorded" note={`reports/latest.json · ${fmtTime(savedInt!.generatedAt)}`} /></span> :
                          s.implementation === 'unsupported' ? <span className="text-faint">no surface to test</span> :
                          <span className="text-faint">—</span>}
                      </Td>
                      <Td><StatusBadge status={st} /></Td>
                      <Td className="font-mono text-[11.5px] text-muted">{s.expectedEffect}{s.phase2Id && <div className="text-faint">via {s.phase2Id}</div>}</Td>
                      <Td className="font-mono text-[11.5px]">{d?.evidenceId ? <span className="text-teal-ink">{d.evidenceId.slice(0, 10)}…</span> : <span className="text-faint">{run ? 'none' : '—'}</span>}</Td>
                      <Td className="whitespace-nowrap font-mono text-[11.5px] text-muted">{run ? <><div>{fmtTime(run.at)}</div><div className="text-faint">{fmtMs(run.elapsedMs)}</div></> : '—'}</Td>
                      <Td className="text-right">
                        {s.implementation === 'phase2' && s.phase2Id && (
                          <button onClick={e => { e.stopPropagation(); phase2.runCheck(s.phase2Id!) }}
                            disabled={phase2.catalogue.status !== 'live' || phase2.running.has(s.phase2Id)}
                            title={`POST /api/phase2/${s.phase2Id}`}
                            className="rounded px-2 py-1 text-[12px] font-medium text-teal-ink transition-colors duration-150 hover:bg-mint-50 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent">
                            {phase2.running.has(s.phase2Id) ? 'Running…' : 'Run check'}
                          </button>
                        )}
                        {s.implementation === 'executable' && (
                          <button onClick={e => { e.stopPropagation(); runScenario(s.id) }} disabled={!live || running.has(s.id)}
                            className="rounded px-2 py-1 text-[12px] font-medium text-teal-ink transition-colors duration-150 hover:bg-mint-50 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent">
                            {running.has(s.id) ? 'Running…' : 'Run'}
                          </button>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
              ))}

              {showPhase2 && (
                <tbody>
                  <tr className="bg-canvas">
                    <td colSpan={9} className="border-b border-line px-3 py-2">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-[12.5px] font-semibold text-ink">Phase 2 — security, reliability and evidence</span>
                        <span className="text-[12px] text-muted">Live catalogue from GET /api/phase2. Unsupported and not-implemented checks have no product surface to test and are never passes.</span>
                        <span className="ml-auto text-[11.5px]">
                          <SourceTag source={phase2.catalogue.status === 'live' ? 'live' : 'repository'} at={phase2.catalogue.fetchedAt} />
                        </span>
                      </div>
                    </td>
                  </tr>
                  {p2Rows.map(spec => {
                    const run = phase2.latestById.get(spec.id)
                    const st = phase2.statusOf(spec)
                    return (
                      <tr key={spec.id} className="transition-colors duration-100 hover:bg-canvas">
                        <Td className="font-mono text-[11.5px] text-muted">{spec.id}</Td>
                        <Td>
                          <div className="font-medium text-ink">{spec.label}</div>
                          <div className="text-[11.5px] text-faint">{spec.family} · <span className="font-mono">{spec.track}</span>{spec.disposition === 'limitation_reproduced' && <span className="ml-1.5 text-warning-ink">reproduces a limitation, not a control</span>}</div>
                        </Td>
                        <Td className="font-mono text-[11.5px]">{spec.kind === 'implemented' ? 'assertion holds' : spec.kind.replace(/_/g, ' ')}</Td>
                        <Td className="font-mono text-[11.5px]">
                          {run ? <span className={run.status === 'fail' ? 'font-medium text-critical-ink' : 'text-ink'}>{run.status.replace(/_/g, ' ')}</span>
                               : spec.kind !== 'implemented' ? <span className="text-faint">no surface to test</span>
                               : <span className="text-faint">—</span>}
                        </Td>
                        <Td><StatusBadge status={st} /></Td>
                        <Td className="text-[11.5px] text-muted">{run?.error ?? spec.reason ?? (run?.status === 'pass' ? 'assertions held' : '—')}</Td>
                        <Td className="font-mono text-[11.5px] text-faint">—</Td>
                        <Td className="whitespace-nowrap font-mono text-[11.5px] text-muted">{run?.at ? <><div>{fmtTime(run.at)}</div><div className="text-faint">{fmtMs(run.elapsedMs)}</div></> : '—'}</Td>
                        <Td className="text-right">
                          {spec.kind === 'implemented' && (
                            <button onClick={() => phase2.runCheck(spec.id)}
                              disabled={phase2.catalogue.status !== 'live' || phase2.running.has(spec.id)}
                              title={`POST /api/phase2/${spec.id}`}
                              className="rounded px-2 py-1 text-[12px] font-medium text-teal-ink transition-colors duration-150 hover:bg-mint-50 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent">
                              {phase2.running.has(spec.id) ? 'Running…' : 'Run'}
                            </button>
                          )}
                        </Td>
                      </tr>
                    )
                  })}
                  {phase2.catalogue.status === 'loading' && <tr><td colSpan={9} className="px-3 py-4 text-[12.5px] text-muted">Loading GET /api/phase2…</td></tr>}
                  {phase2.catalogue.status !== 'live' && phase2.catalogue.status !== 'loading' && (
                    <tr><td colSpan={9} className="px-3 py-4 text-[12.5px] text-critical-ink">Phase 2 catalogue unavailable — {phase2.catalogue.error ?? 'GET /api/phase2 did not respond'}</td></tr>
                  )}
                </tbody>
              )}
            </table>
            {rows.length === 0 && (!showPhase2 || p2Rows.length === 0) && <Empty title="No scenarios match these filters" />}
          </div>
        </div>
      </div>

      <ScenarioDrawer scenario={selected} onClose={() => { setSelected(null); if (params.get('focus')) { const n = new URLSearchParams(params); n.delete('focus'); setParams(n) } }} />
      <p className="mt-4 text-[12px] text-muted">Need the request → decision → effect chain? <Link to="/lab/inspector" className="font-medium text-teal-ink hover:underline">Open the Live Action Inspector</Link>.</p>
    </>
  )
}

/** Section header row: the path's contract, its live tally, and the known break if any. */
function PathHeader({ id, latest }: { id: ArcPath; latest: Map<string, ScenarioRun> }) {
  const def = PATHS.find(p => p.id === id)
  const runs = def ? def.scenarios.map(s => latest.get(s)).filter(Boolean) : []
  const held = runs.filter(r => r!.pass).length
  return (
    <tr className="bg-canvas">
      <td colSpan={9} className="border-b border-line px-3 py-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[12.5px] font-semibold text-ink">{PATH_LABEL[id]}</span>
          {def ? <span className="text-[12px] text-muted">{def.contract}</span> : <span className="text-[12px] text-muted">Specified in MASTER_BUILD_PLAN.md. No scenario code, so these cannot run and are not counted as passes.</span>}
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

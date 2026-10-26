import { Link } from 'react-router-dom'
import type { ScenarioRun } from '../../api/types'
import { PATHS } from '../../data/paths'
import { ORIGINAL } from '../../data/catalog'
import { runStatus } from '../../lib/status'
import { RESULT_COLOR } from '../ui/StatusBadge'
import { SourceTag } from '../ui/SourceTag'
import { DOC_NOTE } from '../../data/findingDocs'

/**
 * One row per ARC decision path. Cells are the repository scenarios on that path,
 * coloured by their latest LIVE result (grey = not run this session). The right
 * column carries the BASELINE finding that broke the path, so a green row never
 * hides a known failure.
 */
export function BehaviourMatrix({ latest, running }: { latest: Map<string, ScenarioRun>; running: Set<string> }) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_112px_minmax(0,1.25fr)] gap-4 border-b border-line px-4 py-2 text-[11px] font-medium text-muted">
        <span>Decision path · what ARC must do</span>
        <span>Repository scenarios <SourceTag source="live" /></span>
        <span>This session</span>
        <span>Known break <SourceTag source="recorded" note={DOC_NOTE} /></span>
      </div>
      <ul className="divide-y divide-line">
        {PATHS.map(p => {
          const st = p.scenarios.map(id => runStatus(latest.get(id), running.has(id)))
          const held = st.filter(s => s === 'PASS').length
          const broke = st.filter(s => s === 'FAIL').length
          const err = st.filter(s => s === 'ERROR').length
          const notRun = st.filter(s => s === 'NOT_RUN').length
          return (
            <li key={p.id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_112px_minmax(0,1.25fr)] items-center gap-4 px-4 py-3">
              <div className="min-w-0">
                <Link to={`/lab/scenarios?path=${p.id}`} className="text-[13px] font-medium text-ink hover:underline">{p.label}</Link>
                <p className="text-[12px] leading-snug text-muted">{p.contract}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.scenarios.map((id, i) => {
                  const spec = ORIGINAL.find(s => s.id === id)
                  const s = st[i]
                  return (
                    <Link key={id} to={latest.get(id) ? `/lab/inspector?run=${id}` : `/lab/scenarios?focus=${id}`}
                      title={`${spec?.num} ${id} · ${s.replace('_', ' ')}`}
                      className={`h-5 w-7 rounded-[3px] transition-opacity duration-150 hover:opacity-80 ${s === 'NOT_RUN' ? 'border border-dashed border-line-strong' : ''} ${s === 'RUNNING' ? 'animate-pulse' : ''}`}
                      style={s === 'NOT_RUN' ? undefined : { background: RESULT_COLOR[s] }} />
                  )
                })}
              </div>
              <div className="tnum text-[12px] leading-tight">
                {notRun === st.length ? <span className="text-faint">not run</span> : <>
                  <div><span className="font-semibold text-ink">{held}</span><span className="text-muted">/{st.length} held</span></div>
                  {broke > 0 && <div className="font-medium text-critical-ink">{broke} broke</div>}
                  {err > 0 && <div className="text-warning-ink">{err} error</div>}
                  {notRun > 0 && <div className="text-faint">{notRun} not run</div>}
                </>}
              </div>
              <div className="min-w-0">
                {p.knownBreak ? (
                  <Link to={`/lab/inspector?finding=${p.knownBreak.findingId}`} className="group block">
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-critical" />
                      <span className="font-mono text-[12px] font-medium text-critical-ink group-hover:underline">{p.knownBreak.findingId}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink">{p.knownBreak.summary}</p>
                  </Link>
                ) : <span className="text-[12px] text-faint">None reported. Untested variants are listed in the Scenario Lab.</span>}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="border-t border-line px-4 py-2.5 text-[11.5px] text-faint">
        A path that holds in the 17 repository scenarios can still break under conditions they do not exercise, such as concurrency or a policy change mid-flight. That is why the known-break column is independent of the live result.
      </p>
    </div>
  )
}

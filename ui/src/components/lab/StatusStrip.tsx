import { useData } from '../../api/DataProvider'
import { AGENTS, POLICIES, TOOLS } from '../../data/registry'
import { useReports } from '../../api/ReportsProvider'
import { useFindingStates } from '../../lib/findings'
import { fmtTime } from '../../lib/status'

/** One compact line of environment facts. Reachability is a dot, never a readiness verdict. */
export function StatusStrip() {
  const { health, runs, assuranceRuns } = useData()
  const findings = useFindingStates()
  const { phase2: recP2 } = useReports()
  const arcRev = recP2?.report.revisions.arcControl
  const meridian = health.status === 'loading' ? 'checking' : health.status === 'live' ? 'reachable' : 'unreachable'
  const gateway = health.status !== 'live' ? 'unknown' : health.data?.gatewayConfigured ? 'configured' : 'not configured'
  const last = runs.length ? runs[runs.length - 1].at : undefined

  const items: Array<{ k: string; v: string; tone?: 'ok' | 'bad' | 'muted' | 'crit'; src: string }> = [
    { k: 'Meridian backend', v: meridian, tone: health.status === 'live' ? 'ok' : health.status === 'loading' ? 'muted' : 'bad', src: 'GET /api/health' },
    { k: 'ARC gateway', v: gateway, tone: gateway === 'configured' ? 'ok' : gateway === 'unknown' ? 'muted' : 'bad', src: 'gatewayConfigured from /api/health' },
    { k: 'ARC build', v: arcRev ? arcRev.slice(0, 7) : 'unreported', tone: arcRev ? undefined : 'muted', src: arcRev ? `git HEAD of ARC_REPO_PATH when ${recP2!.fileName} was written — not necessarily the running process` : 'No version endpoint exposed by the sandbox' },
    { k: 'Agents', v: `${AGENTS.filter(a => a.registered).length}`, src: 'start.mjs (repository) — not live' },
    { k: 'Tools', v: `${TOOLS.length}`, src: 'start.mjs (repository) — not live' },
    { k: 'Policies', v: `${POLICIES.length}`, src: 'start.mjs (repository) — not live' },
    { k: 'Latest execution', v: last ? fmtTime(last) : 'none yet', tone: last ? undefined : 'muted', src: 'GET /api/scenarios' },
    { k: 'Open findings', v: `${findings.filter(f => f.stage !== 'resolved').length}`, tone: 'crit', src: `Reproducing checks: ${findings.map(f => `${f.finding.check} ${f.checkStatus} (${f.source})`).join(', ')}` },
    { k: 'Assurance', v: assuranceRuns.length ? fmtTime(assuranceRuns[0].at) : 'not run', tone: assuranceRuns.length ? undefined : 'muted', src: 'POST /api/assurance' },
  ]
  const toneCls = { ok: 'text-success', bad: 'text-critical-ink', muted: 'text-faint', crit: 'text-critical-ink font-semibold' }
  const dot = { ok: 'bg-success', bad: 'bg-critical', muted: 'bg-neutral', crit: 'bg-critical' }

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-5 xl:grid-cols-9">
      {items.map(it => (
        <div key={it.k} title={`Source: ${it.src}`} className="min-w-0 border-b border-r border-line px-3 py-2.5 xl:border-b-0 [&:nth-child(9)]:border-r-0">
          <div className="truncate text-[11px] text-muted">{it.k}</div>
          <div className={`mt-0.5 flex items-center gap-1.5 truncate text-[13px] font-medium ${it.tone ? toneCls[it.tone] : 'text-ink'}`}>
            {(it.tone === 'ok' || it.tone === 'bad') && <span className={`size-1.5 shrink-0 rounded-full ${dot[it.tone]}`} />}
            <span className="truncate tnum">{it.v}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

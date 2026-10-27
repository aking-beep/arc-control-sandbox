import { Link } from 'react-router-dom'
import { findingTraceFor } from '../../data/findingTraces'
import { ADJACENT_CHECKS } from '../../data/paths'
import { stageText, type FindingState } from '../../lib/findings'
import { usePhase2 } from '../../lib/phase2'
import { fmtTime } from '../../lib/status'
import { StatusBadge } from '../ui/StatusBadge'
import { SourceTag } from '../ui/SourceTag'
import { FindingAnatomy } from './FindingAnatomy'

/** One finding as a case file: verdict counts, behaviour, anatomy, and the check that reproduces it. */
export function FindingCase({ s }: { key?: string; s: FindingState }) {
  const f = s.finding
  const t = findingTraceFor(s)
  const p2 = usePhase2()
  const adjacent = (ADJACENT_CHECKS[f.id] ?? []).map(id => p2.resolve(id)).filter(Boolean)
  const numeric = s.observedLabel.length <= 3 && f.expected.value.length <= 3
  const stage = stageText(s)

  return (
    <article className="rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <span className="rounded bg-critical px-1.5 py-px text-[10.5px] font-semibold uppercase text-white">{f.severity}</span>
        <Link to={`/lab/findings/${f.id}`} className="font-mono text-[12.5px] font-medium text-ink hover:underline">{f.id}</Link>
        <span className="text-[14px] font-semibold text-ink">{f.title}</span>
        <span className={`ml-auto text-[12px] font-medium ${stage.tone}`}>{stage.label}</span>
      </header>

      <div className="grid gap-6 px-5 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
          <div>
            <div className="text-[12px] text-muted">Expected · {f.expected.label.toLowerCase()}</div>
            <div className={`tnum mt-1 font-semibold leading-none text-ink ${numeric ? 'text-[40px]' : 'text-[17px]'}`}>{f.expected.value}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[12px] text-muted">Observed <SourceTag source={s.source} at={s.at} note={s.sourceNote} /></div>
            <div className={`tnum mt-1 font-semibold leading-none ${s.checkStatus === 'PASS' ? 'text-ink' : 'text-critical-ink'} ${numeric ? 'text-[40px]' : 'text-[17px]'}`}>{s.observedLabel}</div>
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11.5px] font-medium text-muted">ARC should have</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-ink">{t.expectedBehaviour}</dd>
            </div>
            <div>
              <dt className="text-[11.5px] font-medium text-critical-ink">{f.resolution && !s.regressed ? 'ARC did, before the fix' : 'ARC did'}</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-ink">{t.observedBehaviour}</dd>
            </div>
          </dl>
          <FindingAnatomy state={s} />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-2 border-t border-line px-5 py-3 text-[12.5px] sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-muted">Affected control</dt><dd className="text-ink">{f.control}</dd>
        <dt className="text-muted">Reproducing check</dt>
        <dd className="flex flex-wrap items-center gap-2">
          <StatusBadge status={s.checkStatus} />
          <Link to={`/lab/scenarios?focus=${f.check}`} className="font-mono text-teal-ink hover:underline">{f.check}</Link>
          <span className="text-muted">{s.at ? `· ${fmtTime(s.at)}` : ''} {s.regressed ? '· Was resolved; this failure reopens it.' : s.checkStatus === 'PASS' && !f.resolution ? '· A pass alone does not close the finding; it needs a recorded fix and an independent retest.' : ''}</span>
        </dd>
        {f.resolution && <>
          <dt className="text-muted">Resolution</dt>
          <dd className="text-ink">Fixed in <span className="font-mono text-[12px]">{f.resolution.fixedIn}</span> by <span className="font-mono text-[12px]">{f.resolution.fixedBy}</span>.
            <ul className="mt-1 list-disc pl-4 text-[12px] text-muted">{f.resolution.retests.map(r => <li key={r}>{r}</li>)}</ul>
            {f.resolution.note && <div className="mt-1 text-[12px] text-muted">{f.resolution.note}</div>}
          </dd>
        </>}
        {s.error && <><dt className="text-muted">Runner error</dt><dd className="font-mono text-[11.5px] text-ink">{s.error}</dd></>}
        <dt className="text-muted">Same path</dt>
        <dd className="flex flex-wrap gap-x-4 gap-y-1">
          {adjacent.map(r => (
            <Link key={r!.spec.id} to={`/lab/scenarios?focus=${r!.spec.id}`} className="inline-flex items-center gap-1.5 text-ink hover:underline">
              <StatusBadge status={r!.status} /><span className="font-mono text-[11.5px]">{r!.spec.id}</span>
            </Link>
          ))}
        </dd>
      </dl>

      <footer className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-[12.5px]">
        <Link to={`/lab/inspector?finding=${f.id}`} className="font-medium text-teal-ink hover:underline">Inspect request → decision → effect</Link>
        <Link to={`/lab/findings/${f.id}`} className="font-medium text-teal-ink hover:underline">Full finding</Link>
        {f.id === 'ARC-SEC-002' && <Link to="/lab/policies" className="font-medium text-teal-ink hover:underline">Policy & approval timeline</Link>}
      </footer>
    </article>
  )
}

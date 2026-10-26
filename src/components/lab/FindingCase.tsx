import { Link } from 'react-router-dom'
import type { Finding } from '../../data/baseline'
import { findingTrace } from '../../data/findingTraces'
import { ADJACENT_UNTESTED } from '../../data/paths'
import { ALL_CATALOG } from '../../data/catalog'
import { StatusBadge } from '../ui/StatusBadge'
import { FindingAnatomy } from './FindingAnatomy'

/** One open finding as a case file: verdict counts, behaviour, anatomy, what is still untested. */
export function FindingCase({ f }: { key?: string; f: Finding }) {
  const t = findingTrace(f.id)
  const adjacent = (ADJACENT_UNTESTED[f.id] ?? []).map(id => ALL_CATALOG.find(s => s.id === id)).filter(Boolean)
  const numeric = f.actual.value.length <= 3

  return (
    <article className="rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <span className="rounded bg-critical px-1.5 py-px text-[10.5px] font-semibold uppercase text-white">{f.severity}</span>
        <Link to={`/lab/findings/${f.id}`} className="font-mono text-[12.5px] font-medium text-ink hover:underline">{f.id}</Link>
        <span className="text-[14px] font-semibold text-ink">{f.title}</span>
        <span className="ml-auto text-[12px] font-medium text-critical-ink">Open</span>
      </header>

      <div className="grid gap-6 px-5 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
          <div>
            <div className="text-[12px] text-muted">Expected · {f.expected.label.toLowerCase()}</div>
            <div className={`tnum mt-1 font-semibold leading-none text-ink ${numeric ? 'text-[40px]' : 'text-[17px]'}`}>{f.expected.value}</div>
          </div>
          <div>
            <div className="text-[12px] text-muted">Observed · {f.actual.label.toLowerCase()}</div>
            <div className={`tnum mt-1 font-semibold leading-none text-critical-ink ${numeric ? 'text-[40px]' : 'text-[17px]'}`}>{f.actual.value}</div>
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11.5px] font-medium text-muted">ARC should have</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-ink">{t?.expectedBehaviour}</dd>
            </div>
            <div>
              <dt className="text-[11.5px] font-medium text-critical-ink">ARC did</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-ink">{t?.observedBehaviour}</dd>
            </div>
          </dl>
          <FindingAnatomy findingId={f.id} />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-2 border-t border-line px-5 py-3 text-[12.5px] sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-muted">Affected control</dt><dd className="text-ink">{f.control}</dd>
        <dt className="text-muted">Regression</dt>
        <dd className="flex flex-wrap items-center gap-2"><StatusBadge status="NOT_IMPLEMENTED" /><span className="text-muted">Repository scenario <Link to={`/lab/scenarios?focus=${f.relatedScenario}`} className="font-mono text-teal-ink hover:underline">{f.relatedScenario}</Link> is a different test. Its result does not close this finding.</span></dd>
        <dt className="text-muted">Untested nearby</dt>
        <dd className="flex flex-wrap gap-x-3 gap-y-1">
          {adjacent.map(s => (
            <Link key={s!.id} to={`/lab/scenarios?focus=${s!.id}`} className="text-ink hover:underline">
              <span className="font-mono text-[11.5px] text-faint">{s!.id}</span> {s!.description}
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

import { Link } from 'react-router-dom'
import type { Finding } from '../../data/findingDocs'
import { findingTrace } from '../../data/findingTraces'
import { ADJACENT_UNTESTED } from '../../data/paths'
import { ALL_CATALOG } from '../../data/catalog'
import { StatusBadge } from '../ui/StatusBadge'
import { FindingAnatomy } from './FindingAnatomy'

/** One finding as a case file: live verdict, behaviour, anatomy, what is still untested. */
export function FindingCase({ f }: { key?: string; f: Finding }) {
  const t = findingTrace(f.id)
  const adjacent = (ADJACENT_UNTESTED[f.id] ?? []).map(id => ALL_CATALOG.find(s => s.id === id)).filter(Boolean)
  const numeric = f.expected.value.length <= 3

  return (
    <article className="rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <span className="rounded bg-critical px-1.5 py-px text-[10.5px] font-semibold uppercase text-white">{f.severity}</span>
        <Link to={`/lab/findings/${f.id}`} className="font-mono text-[12.5px] font-medium text-ink hover:underline">{f.id}</Link>
        <span className="text-[14px] font-semibold text-ink">{f.title}</span>
        <span className="ml-auto"><StatusBadge status={f.status} /></span>
      </header>

      <div className="grid gap-6 px-5 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
          <div>
            <div className="text-[12px] text-muted">Expected · {f.expected.label.toLowerCase()}</div>
            <div className={`tnum mt-1 font-semibold leading-none text-ink ${numeric ? 'text-[40px]' : 'text-[17px]'}`}>{f.expected.value}</div>
          </div>
          <div>
            <div className="text-[12px] text-muted">Latest run</div>
            {f.status === 'NOT_RUN'
              ? <div className="mt-1 text-[15px] font-semibold leading-tight text-faint">Not retested</div>
              : <div className={`mt-1 font-semibold leading-tight ${f.status === 'FAIL' ? 'text-[15px] text-critical-ink' : 'text-[15px] text-success-ink'}`}>
                  {f.status === 'FAIL' ? 'Defect reproduced' : 'Assertion held'}
                </div>}
            <div className="mt-1 font-mono text-[11px] text-faint">{f.phase2Id}</div>
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11.5px] font-medium text-muted">ARC should have</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-ink">{t?.expectedBehaviour ?? `${f.expected.label}: ${f.expected.value}`}</dd>
            </div>
            <div>
              <dt className="text-[11.5px] font-medium text-critical-ink">ARC did</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-ink">{t?.observedBehaviour ?? f.observed ?? `${f.documentedActual.label}: ${f.documentedActual.value}`}</dd>
            </div>
          </dl>
          {f.observed && (
            <div className="rounded-md bg-canvas px-3 py-2.5">
              <div className="text-[11.5px] font-medium text-muted">Runner assertion · {f.phase2Id}</div>
              <p className="mt-1 font-mono text-[12px] leading-relaxed text-critical-ink">{f.observed}</p>
            </div>
          )}
          <FindingAnatomy findingId={f.id} />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-2 border-t border-line px-5 py-3 text-[12.5px] sm:grid-cols-[auto_minmax(0,1fr)]">
        <dt className="text-muted">Affected control</dt><dd className="text-ink">{f.control}</dd>
        <dt className="text-muted">Regression</dt>
        <dd className="flex flex-wrap items-center gap-2"><StatusBadge status={f.status} /><span className="text-muted">Phase 2 check <Link to={`/lab/scenarios?suite=phase2&focus=${f.phase2Id}`} className="font-mono text-teal-ink hover:underline">{f.phase2Id}</Link>. Repository scenario <Link to={`/lab/scenarios?focus=${f.relatedScenario}`} className="font-mono text-teal-ink hover:underline">{f.relatedScenario}</Link> is a different test and does not close this finding.</span></dd>
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

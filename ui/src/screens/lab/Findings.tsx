import { Link } from 'react-router-dom'
import { PageHeader, Section } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { RemediationStepper } from '../../components/lab/RemediationStepper'
import { FindingCase } from '../../components/lab/FindingCase'
import { useFindingStates, useUnmappedFailures } from '../../lib/findings'
import { usePhase2 } from '../../lib/phase2'
import { fmtTime } from '../../lib/status'

export function Findings() {
  const states = useFindingStates()
  const unmapped = useUnmappedFailures()
  const p2 = usePhase2()
  const open = states.filter(s => s.stage !== 'resolved')
  const failing = states.filter(s => s.checkStatus === 'FAIL').length

  return (
    <>
      <PageHeader
        title="Security Findings"
        description="Authorization failures the lab has observed, each tied to the Phase 2 check that reproduces it. A finding is resolved only with a recorded fix and an independent retest, and it stays listed: if its check fails again it is shown as a regression."
        meta={<span className="flex flex-wrap items-center gap-2">{Array.from(new Set(states.map(s => s.source))).map(src => <SourceTag key={src} source={src} />)}</span>}
      />

      <div className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-4 border-b border-line pb-5">
        <div>
          <div className="text-[12px] text-muted">Open findings</div>
          <div className="tnum mt-1 text-[36px] font-semibold leading-none text-critical-ink">{open.length}</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Reproducing checks failing</div>
          <div className="tnum mt-1.5 text-[13px] text-ink"><span className="font-semibold">{failing}</span> of {states.length}</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Severity</div>
          <div className="mt-1.5 text-[13px] text-ink"><span className="tnum font-semibold">{states.filter(s => s.finding.severity === 'critical').length}</span> critical · <span className="tnum font-semibold">{states.filter(s => s.finding.severity === 'high').length}</span> high</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Affected path</div>
          <div className="mt-1.5 text-[13px] text-ink">Execution after authorization; agent lifecycle</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {unmapped.length > 0 && (
            <section className="rounded-lg border border-critical/40 bg-critical-50 px-5 py-4">
              <h2 className="text-[13.5px] font-semibold text-critical-ink">{unmapped.length} failing Phase 2 check{unmapped.length === 1 ? '' : 's'} not yet written up as a finding</h2>
              <ul className="mt-2 space-y-1.5">
                {unmapped.map(r => (
                  <li key={r.spec.id} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                    <StatusBadge status={r.status} />
                    <Link to={`/lab/scenarios?focus=${r.spec.id}`} className="font-mono text-ink hover:underline">{r.spec.id}</Link>
                    <SourceTag source={r.source} at={r.at} note={r.origin} />
                    {r.run?.error && <span className="font-mono text-[11.5px] text-muted">{r.run.error}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {states.map(s => <FindingCase key={s.finding.id} s={s} />)}
        </div>

        <div className="space-y-5">
          <Section title="Remediation progress">
            <div className="space-y-5">
              {states.map(s => (
                <div key={s.finding.id}>
                  <div className="mb-2 font-mono text-[12px] text-ink">{s.finding.id}</div>
                  <RemediationStepper stage={s.stage} />
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] leading-relaxed text-faint">Fixes belong in aking-beep/arc-control. This lab does not modify ARC Control and never marks a finding resolved by itself.</p>
          </Section>

          <Section title="Reproducing checks">
            <ul className="space-y-3">
              {states.map(s => (
                <li key={s.finding.id} className="text-[12.5px]">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/lab/scenarios?focus=${s.finding.check}`} className="font-mono text-[12px] text-ink hover:underline">{s.finding.check}</Link>
                    <StatusBadge status={s.checkStatus} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-muted"><SourceTag source={s.source} note={s.sourceNote} />{s.at && <span className="font-mono text-[11px]">{fmtTime(s.at)}</span>}</div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Not findings, also not passes">
            <p className="text-[12.5px] leading-relaxed text-muted">
              Phase 2 also lists <span className="tnum font-medium text-ink">{p2.counts.UNSUPPORTED}</span> unsupported and <span className="tnum font-medium text-ink">{p2.counts.NOT_IMPLEMENTED}</span> not-implemented checks. They cannot be tested against this ARC build, so they are not findings, but they do not count as passes either.
            </p>
            <Link to="/lab/scenarios?suite=phase2" className="mt-2 inline-block text-[12px] font-medium text-teal-ink hover:underline">Phase 2 in Scenario Lab →</Link>
          </Section>
        </div>
      </div>
    </>
  )
}

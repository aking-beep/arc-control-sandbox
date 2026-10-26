import { Link } from 'react-router-dom'
import { PageHeader, Section } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { RemediationStepper } from '../../components/lab/RemediationStepper'
import { FindingCase } from '../../components/lab/FindingCase'
import { FINDINGS, BASELINE_NOTE, phase2Baseline } from '../../data/baseline'
import { REGRESSION } from '../../data/catalog'

export function Findings() {
  const open = FINDINGS.filter(f => f.stage !== 'resolved')

  return (
    <>
      <PageHeader
        title="Security Findings"
        description="Authorization failures the lab has observed. A finding is resolved only when a recorded regression run passes. A committed fix alone does not close it."
        meta={<SourceTag source="baseline" note={BASELINE_NOTE} />}
      />

      <div className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-4 border-b border-line pb-5">
        <div>
          <div className="text-[12px] text-muted">Open findings</div>
          <div className="tnum mt-1 text-[36px] font-semibold leading-none text-critical-ink">{open.length}</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Severity</div>
          <div className="mt-1.5 text-[13px] text-ink"><span className="tnum font-semibold">{FINDINGS.filter(f => f.severity === 'critical').length}</span> critical · <span className="tnum font-semibold">{FINDINGS.filter(f => f.severity === 'high').length}</span> high</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Affected path</div>
          <div className="mt-1.5 text-[13px] text-ink">Execution, after authorization succeeded</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Latest regression result</div>
          <div className="mt-1.5 flex items-center gap-2"><StatusBadge status="NOT_IMPLEMENTED" /><span className="text-[12px] text-muted">no regression tests exist</span></div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {FINDINGS.map(f => <FindingCase key={f.id} f={f} />)}
        </div>

        <div className="space-y-5">
          <Section title="Remediation progress">
            <div className="space-y-5">
              {FINDINGS.map(f => (
                <div key={f.id}>
                  <div className="mb-2 font-mono text-[12px] text-ink">{f.id}</div>
                  <RemediationStepper stage={f.stage} />
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] leading-relaxed text-faint">Fixes belong in aking-beep/arc-control. This lab does not modify ARC Control.</p>
          </Section>

          <Section title="Regression tests needed to close">
            <ul className="space-y-3">
              {REGRESSION.map(r => (
                <li key={r.id} className="text-[12.5px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] text-ink">{r.id}</span>
                    <StatusBadge status="NOT_IMPLEMENTED" />
                  </div>
                  <div className="mt-0.5 text-muted">{r.expectedEffect}</div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Not findings, also not passes">
            <p className="text-[12.5px] leading-relaxed text-muted">
              Phase 2 also reported <span className="tnum font-medium text-ink">{phase2Baseline.unsupported}</span> unsupported and <span className="tnum font-medium text-ink">{phase2Baseline.notImplemented}</span> not-implemented checks. They were never tested, so they can't be findings, but they don't count as passes either.
            </p>
            <Link to="/lab/scenarios?suite=phase2" className="mt-2 inline-block text-[12px] font-medium text-teal-ink hover:underline">Phase 2 in Scenario Lab →</Link>
          </Section>
        </div>
      </div>
    </>
  )
}

import { Link } from 'react-router-dom'
import { PageHeader, Section, Button } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { RemediationStepper } from '../../components/lab/RemediationStepper'
import { FindingCase } from '../../components/lab/FindingCase'
import { Empty } from '../../components/ui/primitives'
import { deriveFindings, DOC_NOTE } from '../../data/findingDocs'
import { REGRESSION } from '../../data/catalog'
import { usePhase2 } from '../../api/Phase2Provider'
import { fmtTime } from '../../lib/status'

export function Findings() {
  const phase2 = usePhase2()
  const findings = deriveFindings(phase2.latestById)
  const reproducing = findings.filter(f => f.status === 'FAIL')
  const notRetested = findings.filter(f => f.status === 'NOT_RUN')
  const p2 = phase2.summary

  return (
    <>
      <PageHeader
        title="Security Findings"
        description="Authorization failures the lab has observed. A finding closes only when the ARC Control defect is fixed and independently retested. A passing check here, or a committed fix alone, does not close it."
        meta={<>
          <SourceTag source={phase2.catalogue.status === 'live' ? 'live' : 'repository'} at={phase2.catalogue.fetchedAt} note={DOC_NOTE} />
          <Button variant="ghost" loading={phase2.running.has('__all__')} onClick={phase2.runAll}
            disabled={phase2.catalogue.status !== 'live'}
            title="POST /api/phase2/all">Re-run Phase 2</Button>
        </>}
      />

      <div className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-4 border-b border-line pb-5">
        <div>
          <div className="text-[12px] text-muted">Reproducing on the latest run</div>
          <div className="tnum mt-1 text-[36px] font-semibold leading-none text-critical-ink">{reproducing.length}</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Tracked findings</div>
          <div className="tnum mt-1 text-[36px] font-semibold leading-none text-ink">{findings.length}</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Severity</div>
          <div className="mt-1.5 text-[13px] text-ink"><span className="tnum font-semibold">{findings.filter(f => f.severity === 'critical').length}</span> critical · <span className="tnum font-semibold">{findings.filter(f => f.severity === 'high').length}</span> high</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Affected path</div>
          <div className="mt-1.5 text-[13px] text-ink">Execution, after authorization succeeded</div>
        </div>
        <div>
          <div className="text-[12px] text-muted">Latest Phase 2 observation</div>
          <div className="mt-1.5 flex items-center gap-2">
            {notRetested.length === findings.length
              ? <><StatusBadge status="NOT_RUN" /><span className="text-[12px] text-muted">not retested in this window</span></>
              : <><StatusBadge status={reproducing.length ? 'FAIL' : 'PASS'} /><span className="text-[12px] text-muted">{fmtTime(findings.find(f => f.at)?.at ?? undefined)}</span></>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {phase2.catalogue.status === 'loading'
            ? <Empty title="Loading Phase 2 catalogue">GET /api/phase2…</Empty>
            : phase2.catalogue.status !== 'live'
              ? <Empty title="Phase 2 harness unreachable">{phase2.catalogue.error ?? 'GET /api/phase2 did not respond.'} Findings cannot be verified without it, so none are shown as passing.</Empty>
              : findings.map(f => <FindingCase key={f.id} f={f} />)}
        </div>

        <div className="space-y-5">
          <Section title="Remediation progress">
            <div className="space-y-5">
              {findings.map(f => (
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
              {p2
                ? <>Phase 2 carries <span className="tnum font-medium text-ink">{p2.unsupported}</span> unsupported and <span className="tnum font-medium text-ink">{p2.notImplemented}</span> not-implemented checks. No product surface exists to test them, so they can't be findings — and they don't count as passes either.{p2.limitationReproduced > 0 && <> A further <span className="tnum font-medium text-ink">{p2.limitationReproduced}</span> pass by reproducing a known limitation rather than by holding a control.</>}</>
                : 'Phase 2 catalogue not loaded.'}
            </p>
            <Link to="/lab/scenarios?suite=phase2" className="mt-2 inline-block text-[12px] font-medium text-teal-ink hover:underline">Phase 2 in Scenario Lab →</Link>
          </Section>
        </div>
      </div>
    </>
  )
}

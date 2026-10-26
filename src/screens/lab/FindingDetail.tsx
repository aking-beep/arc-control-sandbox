import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader, Section, KV } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { RemediationStepper } from '../../components/lab/RemediationStepper'
import { RevalidationTimeline } from '../../components/lab/RevalidationTimeline'
import { FanOutTable } from '../../components/lab/FindingAnatomy'
import { FINDINGS, BASELINE_NOTE } from '../../data/baseline'
import { POLICIES } from '../../data/registry'

export function FindingDetail() {
  const { id } = useParams()
  const f = FINDINGS.find(x => x.id === id)
  if (!f) return <Navigate to="/lab/findings" replace />
  const fin = POLICIES.find(p => p.id === 'MER-FIN-001')!

  return (
    <>
      <PageHeader
        title={`${f.id} · ${f.title}`}
        description={f.summary}
        meta={<>
          <span className="rounded bg-critical px-1.5 py-px text-[10.5px] font-semibold uppercase text-white">{f.severity}</span>
          <span className="text-[12px] font-medium text-critical-ink">Open</span>
          <SourceTag source="baseline" note={BASELINE_NOTE} />
        </>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Section title="Expected vs actual">
            <div className="grid grid-cols-2 divide-x divide-line">
              <div className="pr-6">
                <div className="text-[12px] text-muted">Expected · {f.expected.label}</div>
                <div className="tnum mt-1 text-[40px] font-semibold leading-none text-ink">{f.expected.value}</div>
              </div>
              <div className="pl-6">
                <div className="text-[12px] text-muted">Observed · {f.actual.label}</div>
                <div className={`tnum mt-1 font-semibold leading-none text-critical-ink ${f.actual.value.length > 3 ? 'text-[24px]' : 'text-[40px]'}`}>{f.actual.value}</div>
              </div>
            </div>
          </Section>

          {f.id === 'ARC-SEC-001' && (
            <Section title="Per-request fan-out" aside={<Link to={`/lab/inspector?finding=${f.id}`} className="text-[12px] font-medium text-teal-ink hover:underline">Open in Inspector →</Link>}>
              <FanOutTable n={8} />
            </Section>
          )}

          {f.id === 'ARC-SEC-002' && (
            <Section title="Authorization vs execution" aside={<span className="text-[11.5px] text-faint">Ordinal sequence · timestamps not loaded</span>}>
              <RevalidationTimeline />
              <dl className="mt-4 grid grid-cols-2 gap-x-8 divide-y-0">
                <div>
                  <KV k="Original policy" mono>{fin.id} v{fin.version}</KV>
                  <KV k="Matched rule" mono>manager-approval</KV>
                  <KV k="Approval timestamp" mono><Pending /></KV>
                </div>
                <div>
                  <KV k="New policy" mono><Pending text="version/id not loaded" /></KV>
                  <KV k="Execution timestamp" mono><Pending /></KV>
                  <KV k="Business effect">Refund executed (+1)</KV>
                </div>
              </dl>
            </Section>
          )}

          <Section title="Reproduction">
            <ol className="space-y-2.5">
              {f.reproduction.map((step, i) => (
                <li key={i} className="grid grid-cols-[24px_1fr] gap-2 text-[13px] leading-relaxed text-ink">
                  <span className="font-mono text-[12px] text-faint">{i + 1}.</span><span>{step}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Regression test status">
            <div className="flex items-start gap-3">
              <StatusBadge status="NOT_IMPLEMENTED" size="md" />
              <p className="text-[13px] leading-relaxed text-muted">{f.regression.note}</p>
            </div>
            <p className="mt-3 text-[12.5px] text-muted">
              Related repository scenario: <Link to={`/lab/scenarios?focus=${f.relatedScenario}`} className="font-mono text-teal-ink hover:underline">{f.relatedScenario}</Link> — a different test; its result does not affect this finding.
            </p>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Remediation"><RemediationStepper stage={f.stage} />
            <p className="mt-3 text-[12px] leading-relaxed text-muted">Advances to “Resolved” only when a recorded regression run passes. Remediation belongs in aking-beep/arc-control; this lab does not modify ARC.</p>
          </Section>
          <Section title="Details">
            <dl>
              <KV k="Component">{f.component}</KV>
              <KV k="Control">{f.control}</KV>
              <KV k="Evidence">{f.evidence}</KV>
            </dl>
          </Section>
          <Section title="Investigate">
            <div className="flex flex-col gap-1.5 text-[12.5px]">
              <Link to="/lab/policies" className="font-medium text-teal-ink hover:underline">Policy & approval timeline →</Link>
              <Link to={`/lab/inspector?finding=${f.id}`} className="font-medium text-teal-ink hover:underline">Live Action Inspector →</Link>
              <Link to="/lab/evidence" className="font-medium text-teal-ink hover:underline">Evidence Explorer →</Link>
            </div>
          </Section>
        </div>
      </div>
    </>
  )
}

function Pending({ text = 'awaiting report' }: { text?: string }) {
  return <span className="text-faint">{text}</span>
}

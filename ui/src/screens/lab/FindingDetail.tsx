import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader, Section, KV } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { RemediationStepper } from '../../components/lab/RemediationStepper'
import { RevalidationTimeline } from '../../components/lab/RevalidationTimeline'
import { FanOutTable } from '../../components/lab/FindingAnatomy'
import { POLICIES } from '../../data/registry'
import { STAGE_LABEL, useFindingState } from '../../lib/findings'
import { fmtTime } from '../../lib/status'

export function FindingDetail() {
  const { id } = useParams()
  const st = useFindingState(id)
  if (!st) return <Navigate to="/lab/findings" replace />
  const f = st.finding
  const fin = POLICIES.find(p => p.id === 'MER-FIN-001')!

  return (
    <>
      <PageHeader
        title={`${f.id} · ${f.title}`}
        description={f.summary}
        meta={<>
          <span className="rounded bg-critical px-1.5 py-px text-[10.5px] font-semibold uppercase text-white">{f.severity}</span>
          <span className={`text-[12px] font-medium ${st.stage === 'open' ? 'text-critical-ink' : 'text-warning-ink'}`}>{STAGE_LABEL[st.stage]}</span>
          <SourceTag source={st.source} at={st.at} note={st.sourceNote} />
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
                <div className="text-[12px] text-muted">Observed · {f.baselineActual.label}</div>
                <div className={`tnum mt-1 font-semibold leading-none ${st.checkStatus === 'PASS' ? 'text-ink' : 'text-critical-ink'} ${st.observedLabel.length > 3 ? 'text-[24px]' : 'text-[40px]'}`}>{st.observedLabel}</div>
              </div>
            </div>
          </Section>

          {f.id === 'ARC-SEC-001' && (
            <Section title="Per-request fan-out" aside={<Link to={`/lab/inspector?finding=${f.id}`} className="text-[12px] font-medium text-teal-ink hover:underline">Open in Inspector →</Link>}>
              {st.observedEffects === null ? <p className="text-[12.5px] text-muted">The latest result did not report a refund count.</p> : <FanOutTable n={8} observed={Math.min(8, st.observedEffects)} />}
            </Section>
          )}

          {f.id === 'ARC-SEC-002' && (
            <Section title="Authorization vs execution" aside={<span className="text-[11.5px] text-faint">Ordinal sequence · the check returns no per-step times</span>}>
              <RevalidationTimeline held={st.checkStatus === 'PASS'} />
              <dl className="mt-4 grid grid-cols-2 gap-x-8 divide-y-0">
                <div>
                  <KV k="Original policy" mono>{fin.id} v{fin.version}</KV>
                  <KV k="Matched rule" mono>manager-approval</KV>
                  <KV k="Amount" mono>$1,850 · cus-101</KV>
                </div>
                <div>
                  <KV k="New policy" mono>MER-P2-DENY-QUEUED (always DENY)</KV>
                  <KV k="Check run" mono>{st.at ? fmtTime(st.at) : <Pending />}</KV>
                  <KV k="Business effect">{st.observedEffects === null ? <Pending text="not reported" /> : st.observedEffects === 0 ? 'No refund' : `Refund executed (+${st.observedEffects})`}</KV>
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

          <Section title="Reproducing check">
            <div className="flex items-start gap-3">
              <StatusBadge status={st.checkStatus} size="md" />
              <div className="text-[13px] leading-relaxed text-muted">
                <Link to={`/lab/scenarios?focus=${f.check}`} className="font-mono text-teal-ink hover:underline">{f.check}</Link> in phase2.mjs.{' '}
                {st.checkStatus === 'PASS' ? 'Passing. The finding stays listed until the ARC Control fix is independently retested.' : st.checkStatus === 'FAIL' ? 'Failing. The assertion is unchanged; it will pass only when ARC Control behaves correctly.' : 'No conclusive result on this server.'}
                {st.error && <div className="mt-1.5 font-mono text-[12px] text-ink">{st.error}</div>}
              </div>
            </div>
            <p className="mt-3 text-[12.5px] text-muted">
              Related repository scenario: <Link to={`/lab/scenarios?focus=${f.relatedScenario}`} className="font-mono text-teal-ink hover:underline">{f.relatedScenario}</Link> — a different test; its result does not affect this finding.
            </p>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Remediation"><RemediationStepper stage={st.stage} />
            <p className="mt-3 text-[12px] leading-relaxed text-muted">“Check passing” is the furthest this UI goes. “Resolved” needs an independent retest of the ARC fix. Remediation belongs in aking-beep/arc-control; this lab does not modify ARC.</p>
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

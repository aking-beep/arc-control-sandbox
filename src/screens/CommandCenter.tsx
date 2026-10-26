import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ScanSearch } from 'lucide-react'
import { useLab } from '../lib/LabData'
import { PageHeader, SectionTitle } from '../components/PageHeader'
import { ProvenanceTag, SeverityTag } from '../components/Status'
import { FINDINGS } from '../data/findings'
import { REPORT } from '../data/report'
import { usePhase2Counts, useIntegrationCounts } from '../lib/counts'
import { Phase2Bar } from '../components/Phase2Bar'
import { AssuranceStrip } from '../components/AssuranceStrip'
import { AgentsTable } from '../components/AgentsTable'
import { StressTable } from '../components/StressTable'

export function CommandCenter() {
  const { mode } = useLab()
  const p2 = usePhase2Counts()
  const integ = useIntegrationCounts()
  const failures = FINDINGS.filter((f) => f.kind === 'failure')
  const provenance = mode === 'live' ? 'live' : 'recorded'

  return (
    <div>
      <PageHeader
        title="Validation Command Center"
        description={
          <>
            Independent validation of ARC Control against Meridian’s synthetic enterprise. {REPORT.environment}. Sandbox results are observations of
            this process, not an enterprise certification.
          </>
        }
      />

      <div className="space-y-10 px-8 py-7">
        {/* Verdict */}
        <section className="flex items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <span>Assessment</span>
              <ProvenanceTag provenance={provenance} />
              {mode !== 'live' && <span className="text-subtle">Measured {REPORT.measuredAt}</span>}
            </div>
            <h2 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-navy-900">
              Not enterprise-ready
              <span className="text-fail"> · {p2.fail} authorization {p2.fail === 1 ? 'failure' : 'failures'} open</span>
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              {p2.unsupported} capabilities have no product surface in this ARC build, {p2.notImplemented} check was not run, and {p2.limitation}{' '}
              passing checks reproduce a known limitation rather than a strong control.
            </p>
          </div>
          <Link
            to="/findings"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-navy-900 px-3.5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-navy-800"
          >
            Review findings <ArrowRight size={14} />
          </Link>
        </section>

        {/* Primary: open failures + results */}
        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-8 overflow-hidden rounded-lg border border-fail-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h3 className="text-[13px] font-semibold text-navy-900">Open authorization failures</h3>
              <span className="text-[12px] text-subtle">Neither patched in ARC Control · assertions unchanged</span>
            </div>
            <ul className="divide-y divide-line">
              {failures.map((f) => (
                <li key={f.id} className="grid grid-cols-[1fr_auto] gap-6 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11.5px] text-subtle">{f.code}</span>
                      <SeverityTag severity={f.severity} />
                      <span className="font-mono text-[11.5px] text-muted">{f.component}</span>
                    </div>
                    <Link to={`/findings/${f.id}`} className="mt-1.5 block text-[15px] font-semibold text-ink hover:text-teal-700">
                      {f.title}
                    </Link>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.summary}</p>
                    <div className="mt-3 flex items-center gap-4">
                      <Link to={`/findings/${f.id}`} className="text-[12.5px] font-medium text-teal-700 hover:text-teal-600">
                        Evidence & reproduction
                      </Link>
                      <Link to={`/inspector/${f.actionId}`} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-teal-700 hover:text-teal-600">
                        <ScanSearch size={13} /> Inspect action
                      </Link>
                    </div>
                  </div>
                  <div className="flex w-[180px] flex-col justify-center gap-2 border-l border-line pl-6">
                    <div>
                      <div className="text-[11px] text-subtle">Expected</div>
                      <div className="tnum font-mono text-[18px] font-medium text-ink">{f.expectedValue}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-subtle">Observed</div>
                      <div className="tnum font-mono text-[18px] font-semibold text-fail">{f.observedValue}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-4 flex flex-col gap-6">
            <div>
              <SectionTitle aside={<ProvenanceTag provenance={provenance} />}>Original integration scenarios</SectionTitle>
              <div className="flex items-baseline gap-2">
                <span className="tnum text-[28px] font-semibold tracking-tight text-navy-900">
                  {integ.pass}
                  <span className="text-subtle">/{integ.total}</span>
                </span>
                <span className="text-[13px] text-muted">{mode === 'live' ? 'passed this session' : 'passed, rechecked after Phase 2'}</span>
              </div>
              {integ.fail > 0 && <div className="mt-1 text-[12.5px] font-medium text-fail">{integ.fail} failing</div>}
              {mode === 'live' && integ.notRun > 0 && <div className="mt-1 text-[12.5px] text-subtle">{integ.notRun} not run yet</div>}
              <p className="mt-2 text-[12px] leading-relaxed text-subtle">Each asserts ARC’s decision, readable evidence and Meridian’s mutation count.</p>
            </div>
            <div className="border-t border-line pt-5">
              <SectionTitle aside={`${p2.total} checks`}>Phase 2 security & reliability</SectionTitle>
              <Phase2Bar counts={p2} />
              <Link to="/scenarios?tab=phase2" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-teal-700 hover:text-teal-600">
                Open in Scenario Lab <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        <AssuranceStrip />

        <section className="grid grid-cols-12 gap-8">
          <div className="col-span-7">
            <AgentsTable />
          </div>
          <div className="col-span-5">
            <StressTable />
          </div>
        </section>
      </div>
    </div>
  )
}

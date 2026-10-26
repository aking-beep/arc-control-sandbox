import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ArrowUpRight, Play, ChevronRight } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Button, Empty, SkeletonRows } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { StackBar } from '../../components/lab/StackBar'
import { StatusStrip } from '../../components/lab/StatusStrip'
import { BehaviourMatrix } from '../../components/lab/BehaviourMatrix'
import { ReportImport } from '../../components/lab/ReportImport'
import { useReports } from '../../api/ReportsProvider'
import { usePhase2 } from '../../api/Phase2Provider'
import { deriveFindings, DOC_NOTE } from '../../data/findingDocs'
import { ORIGINAL } from '../../data/catalog'
import { ENDPOINTS } from '../../data/registry'
import { runStatus, fmtTime, fmtMs } from '../../lib/status'

export function CommandCenter() {
  const { latestRunById, running, runAll, runs, state, loadRuns, scenarios } = useData()
  const liveCounts = ORIGINAL.reduce((acc, s) => {
    const st = runStatus(latestRunById.get(s.id))
    acc[st] = (acc[st] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const anyLive = runs.length > 0
  const lastRun = runs.length ? runs[runs.length - 1] : undefined
  const suiteRunning = running.has('__all__')
  const { integration: savedIntegration } = useReports()
  const savedInt = savedIntegration.data
  const phase2 = usePhase2()
  // Live Phase 2 counts. `summary` is derived from the records actually held, so
  // a partial window reads as partial rather than as a smaller catalogue.
  const p2 = phase2.summary
  const findings = deriveFindings(phase2.latestById)
  const phase2Running = phase2.running.has('__all__')

  return (
    <>
      <PageHeader
        title="Command Center"
        description="Agents act. ARC Control governs. Meridian records the business effect. This lab independently checks whether the control held — and shows where it did not."
        meta={<span className="text-[12px] text-muted">Last execution <span className="font-mono text-ink">{fmtTime(lastRun?.at)}</span>{lastRun && <> · <SourceTag source="live" at={lastRun.at} /></>}</span>}
        actions={<>
          <a href={ENDPOINTS.arcConsole} target="_blank" rel="noreferrer"><Button variant="ghost" icon={<ArrowUpRight className="size-3.5" />}>ARC Console</Button></a>
          <Button icon={<Play className="size-3.5" />} loading={phase2Running} onClick={phase2.runAll}
            disabled={phase2.catalogue.status !== 'live'}
            title={phase2.catalogue.status !== 'live' ? 'Meridian server not reachable' : 'POST /api/phase2/all — runs the full catalogue, including the two known failures'}>
            Run Phase 2
          </Button>
          <Button variant="primary" icon={<Play className="size-3.5" />} loading={suiteRunning} onClick={runAll}
            disabled={scenarios.status !== 'live'} title={scenarios.status !== 'live' ? 'Meridian server not reachable' : 'POST /api/scenarios/all'}>
            Run Integration Suite
          </Button>
        </>}
      />

      <StatusStrip />

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Section title="Validation overview" aside={<><span className="text-[11.5px] text-faint">No aggregate readiness score</span><ReportImport variant="ghost" label="Load report" /></>} pad={false}>
          <div className="divide-y divide-line">
            <SuiteRow title="Original integration" sub="17 executable scenarios · scenarios.mjs"
              tag={anyLive ? <SourceTag source="live" at={lastRun?.at} /> : savedInt ? <SourceTag source="recorded" at={savedInt.generatedAt} note="reports/latest.json" /> : <SourceTag source="repository" note="scenarios.mjs catalogue · no run yet" />}
              link="/lab/scenarios">
              {anyLive ? (
                <>
                  <StackBar segments={[
                    { label: 'pass', value: liveCounts.PASS ?? 0, tone: 'pass' },
                    { label: 'fail', value: liveCounts.FAIL ?? 0, tone: 'fail' },
                    { label: 'error', value: liveCounts.ERROR ?? 0, tone: 'warn' },
                    { label: 'not run this session', value: liveCounts.NOT_RUN ?? 0, tone: 'empty' },
                  ]} />
                  <p className="mt-2 text-[12px] text-muted">{savedInt ? `Last saved report (reports/latest.json): ${savedInt.passed}/${savedInt.total} passed.` : 'No saved report yet — run npm run validate to write reports/latest.json.'}</p>
                </>
              ) : savedInt ? (
                <>
                  <StackBar segments={[{ label: 'pass', value: savedInt.passed, tone: 'pass' }, { label: 'fail', value: savedInt.failed, tone: 'fail' }]} />
                  <p className="mt-2 text-[12px] text-muted">From <span className="font-mono">reports/latest.json</span>, generated {fmtTime(savedInt.generatedAt)}. Not run in this session.</p>
                </>
              ) : (
                <Empty title="Not run yet">
                  {savedIntegration.status === 'empty'
                    ? 'No saved report. Run the suite above, or npm run validate to write reports/latest.json.'
                    : 'Run the integration suite to produce results. Nothing is shown until a run records one.'}
                </Empty>
              )}
            </SuiteRow>

            <SuiteRow title="Phase 2 security" sub={p2 ? `${p2.total} checks · ${p2.implemented} executable · phase2.mjs` : 'phase2.mjs catalogue'}
              tag={phase2.catalogue.status === 'live' ? <SourceTag source="live" at={phase2.catalogue.fetchedAt} /> : <SourceTag source="repository" note="catalogue unavailable" />} link="/lab/scenarios?suite=phase2">
              {!p2 ? (
                <Empty title="Phase 2 catalogue unavailable">
                  {phase2.catalogue.status === 'loading' ? 'Loading GET /api/phase2…' : `GET /api/phase2 — ${phase2.catalogue.error ?? 'not reachable'}`}
                </Empty>
              ) : (
                <>
                  <StackBar segments={[
                    { label: 'pass', value: p2.pass, tone: 'pass' },
                    { label: 'fail', value: p2.fail, tone: 'fail' },
                    { label: 'unsupported', value: p2.unsupported, tone: 'hatch' },
                    { label: 'not implemented', value: p2.notImplemented, tone: 'hatch' },
                    { label: 'not run', value: p2.implemented - p2.covered, tone: 'empty' },
                  ]} />
                  <p className="mt-2 text-[12px] text-muted">
                    Unsupported and not-implemented checks are not passes.{' '}
                    {p2.covered === 0
                      ? 'No check has run in this window — run Phase 2 above.'
                      : <>
                          {p2.covered}/{p2.implemented} executable checks run.{' '}
                          {p2.fail > 0
                            ? <span className="font-medium text-critical-ink">{p2.fail} failing.</span>
                            : p2.complete ? 'None failing on this run.' : 'None failing so far.'}
                          {p2.limitationReproduced > 0 && <> {p2.limitationReproduced} of the passes reproduce a known limitation rather than demonstrating a control.</>}
                        </>}
                  </p>
                </>
              )}
            </SuiteRow>

            <SuiteRow title="Stress tests" sub="Local, single process, in-memory · not production capacity"
              tag={loadRuns.length ? <SourceTag source="live" at={loadRuns[0].at} /> : <SourceTag source="repository" note="Presets from DAY_1_RUNBOOK.md" />} link="/lab/stress">
              <div className="grid grid-cols-3 gap-3">
                {[100, 500, 1000].map(n => {
                  const r = loadRuns.find(l => l.result.requested === n)
                  return (
                    <div key={n} className="rounded-md bg-canvas px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="tnum text-[13px] font-semibold text-ink">{n.toLocaleString()} req</span>
                        <StatusBadge status={r ? (r.result.pass ? 'PASS' : 'FAIL') : 'NOT_RUN'} />
                      </div>
                      <div className="mt-1 font-mono text-[11.5px] text-muted">
                        {r ? `p95 ${fmtMs(r.result.p95Ms)} · ${r.result.observedEffects}/${r.result.expectedEffects} effects` : 'No result this session'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </SuiteRow>
          </div>
        </Section>

        <Section title="Security findings" aside={<SourceTag source={phase2.catalogue.status === 'live' ? 'live' : 'repository'} at={phase2.catalogue.fetchedAt} note={DOC_NOTE} />} pad={false}>
          <ul className="divide-y divide-line">
            {findings.map(f => (
              <li key={f.id}>
                <Link to={`/lab/findings/${f.id}`} className="group block px-4 py-3.5 transition-colors duration-150 hover:bg-canvas">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-critical px-1.5 py-px text-[10.5px] font-semibold uppercase text-white">{f.severity}</span>
                    <span className="font-mono text-[12px] text-ink">{f.id}</span>
                    <span className="ml-auto"><StatusBadge status={f.status} /></span>
                  </div>
                  <div className="mt-1.5 text-[13.5px] font-medium text-ink">{f.title}</div>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{f.summary}</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted">{f.verdict}</p>
                  <div className="mt-2 flex items-center justify-between text-[11.5px]">
                    <span className="font-mono text-faint">{f.phase2Id}{f.at && <> · {fmtTime(f.at)}</>}</span>
                    <ChevronRight className="size-3.5 text-faint transition-transform duration-150 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-4 py-3 text-[12px] text-muted">
            A finding stays listed until the ARC Control fix is confirmed and independently retested. A passing check here is one observation on this process. <Link to="/lab/findings" className="font-medium text-teal-ink hover:underline">Findings center →</Link>
          </div>
        </Section>
      </div>

      <Section className="mt-5" title="How ARC Control behaved, by decision path" pad={false}
        aside={<Link to="/lab/inspector" className="text-[12px] font-medium text-teal-ink hover:underline">Open Live Action Inspector →</Link>}>
        <BehaviourMatrix latest={latestRunById} running={running} />
      </Section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Section title="Recent scenario runs" aside={<SourceTag source="live" at={scenarios.fetchedAt} />} pad={false}>
          {scenarios.status === 'loading' ? <SkeletonRows rows={4} cols={3} /> :
            runs.length === 0 ? <Empty title="No runs in this session">{scenarios.status === 'live' ? 'Run the integration suite or an individual scenario.' : 'Meridian server not reachable. Results appear here once runs are recorded.'}</Empty> : (
              <ul className="divide-y divide-line">
                {[...runs].reverse().slice(0, 6).map((r, i) => (
                  <li key={`${r.id}-${r.at}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                    <StatusBadge status={runStatus(r)} />
                    <Link to={`/lab/inspector?run=${r.id}`} className="min-w-0 flex-1 truncate text-[13px] text-ink hover:underline">{r.label}</Link>
                    <span className="font-mono text-[11.5px] text-faint">{fmtMs(r.elapsedMs)}</span>
                    <span className="w-28 text-right font-mono text-[11.5px] text-faint">{fmtTime(r.at)}</span>
                  </li>
                ))}
              </ul>
            )}
        </Section>
        <Section title="Meridian business effects" aside={<SourceTag source="live" at={state.fetchedAt} />} pad={false}>
          {state.status === 'loading' ? <SkeletonRows rows={4} cols={3} /> :
            !state.data?.mutationLog.length ? <Empty title="No business mutations recorded">{state.status === 'live' ? 'The Meridian mutation log is empty. Mutations appear only when an ARC-authorized connector call reaches /internal/*.' : 'Mutation log unavailable while Meridian is unreachable.'}</Empty> : (
              <ul className="divide-y divide-line">
                {[...state.data.mutationLog].reverse().slice(0, 6).map((m, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="font-mono text-[12px] text-teal-ink">{m.tool}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted">{JSON.stringify(m.parameters)}</span>
                    <span className="font-mono text-[11.5px] text-faint">{fmtTime(m.at)}</span>
                  </li>
                ))}
              </ul>
            )}
        </Section>
      </div>

    </>
  )
}

function SuiteRow({ title, sub, tag, link, children }: { title: string; sub: string; tag: ReactNode; link: string; children: ReactNode }) {
  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Link to={link} className="text-[14px] font-semibold text-ink hover:underline">{title}</Link>
          <div className="text-[12px] text-muted">{sub}</div>
        </div>
        {tag}
      </div>
      {children}
    </div>
  )
}

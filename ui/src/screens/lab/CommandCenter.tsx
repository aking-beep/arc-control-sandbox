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
import { BASELINE_NOTE, integrationBaseline, phase2Baseline } from '../../data/baseline'
import { usePhase2 } from '../../lib/phase2'
import { stageText, useFindingStates, useUnmappedFailures } from '../../lib/findings'
import type { DataSource } from '../../api/types'
import { ORIGINAL } from '../../data/catalog'
import { ENDPOINTS } from '../../data/registry'
import { runStatus, fmtTime, fmtMs } from '../../lib/status'
import { useLiveOps } from '../../api/LiveProvider'
import { LiveFeed } from '../../components/lab/LiveFeed'
import { LiveState } from '../../components/lab/LiveState'

export function CommandCenter() {
  const { latestRunById, running, runAll, runPhase2All, runs, state, stressRuns, scenarios, arcReady } = useData()
  const p2 = usePhase2()
  const live = useLiveOps()
  const lc = live.snapshot?.counts
  const findings = useFindingStates()
  const unmapped = useUnmappedFailures()
  const liveCounts = ORIGINAL.reduce((acc, s) => {
    const st = runStatus(latestRunById.get(s.id))
    acc[st] = (acc[st] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const anyLive = runs.length > 0
  const lastRun = runs.length ? runs[runs.length - 1] : undefined
  const suiteRunning = running.has('__all__')
  const { integration: recInt, phase2: recP2 } = useReports()
  const p2Measured = !!(p2.sources.live || p2.sources.recorded)
  const p2Sources = (Object.keys(p2.sources) as DataSource[]).filter(k => k === 'live' || k === 'recorded')

  return (
    <>
      <PageHeader
        title="Command Center"
        description="Agents act. ARC Control governs. Meridian records the business effect. This lab independently checks whether the control held — and shows where it did not."
        meta={<span className="text-[12px] text-muted">Last execution <span className="font-mono text-ink">{fmtTime(lastRun?.at)}</span>{lastRun && <> · <SourceTag source="live" at={lastRun.at} /></>}</span>}
        actions={<>
          <a href={ENDPOINTS.arcConsole} target="_blank" rel="noreferrer"><Button variant="ghost" icon={<ArrowUpRight className="size-3.5" />}>ARC Console</Button></a>
          <Button loading={running.has('__p2all__')} onClick={runPhase2All} disabled={!p2.runnable || suiteRunning}
            title={p2.runnable ? 'POST /api/phase2/all — runs all Phase 2 checks against the shared ARC process' : 'Phase 2 runner not reachable'}>Run Phase 2</Button>
          <Button variant="primary" icon={<Play className="size-3.5" />} loading={suiteRunning} onClick={runAll}
            disabled={!arcReady || running.has('__p2all__')} title={!arcReady ? 'Meridian server or ARC gateway not reachable' : 'POST /api/scenarios/all'}>
            Run Integration Suite
          </Button>
        </>}
      />

      <StatusStrip />

      <Section className="mt-5" pad={false}
        title={<span className="flex items-center gap-2">Live operations <LiveState compact /></span>}
        aside={<span className="flex items-center gap-3 text-[12px] text-muted">
          {lc && <span className="font-mono">{lc.actions} actions · <span className="text-success">{lc.executed}</span> executed · <span className="text-warning-ink">{lc.pending_approval}</span> held · <span className="text-critical-ink">{lc.denied + lc.refused}</span> stopped · <span className={lc.anomalies ? 'text-critical-ink' : 'text-success'}>{lc.anomalies} anomalies</span></span>}
          <Link to="/lab/live" className="font-medium text-teal-ink hover:underline">Open →</Link>
        </span>}>
        <LiveFeed events={live.events} limit={6} empty="Live operations are not running. Open Live Operations and press Start to watch the agents work through a day." />
      </Section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Section title="Validation overview" aside={<><span className="text-[11.5px] text-faint">No aggregate readiness score</span><ReportImport variant="ghost" label="Load report" /></>} pad={false}>
          <div className="divide-y divide-line">
            <SuiteRow title="Original integration" sub="17 executable scenarios · scenarios.mjs"
              tag={anyLive ? <SourceTag source="live" at={lastRun?.at} /> : recInt ? <SourceTag source="recorded" at={recInt.report.generatedAt} note={recInt.fileName} /> : <SourceTag source="baseline" note={BASELINE_NOTE} />}
              link="/lab/scenarios">
              {anyLive ? (
                <>
                  <StackBar segments={[
                    { label: 'pass', value: liveCounts.PASS ?? 0, tone: 'pass' },
                    { label: 'fail', value: liveCounts.FAIL ?? 0, tone: 'fail' },
                    { label: 'error', value: liveCounts.ERROR ?? 0, tone: 'warn' },
                    { label: 'not run this session', value: liveCounts.NOT_RUN ?? 0, tone: 'empty' },
                  ]} />
                  <p className="mt-2 text-[12px] text-muted">{recInt ? `Last saved report (${recInt.fileName}): ${recInt.report.passed}/${recInt.report.total} passed.` : `Committed baseline: ${integrationBaseline.passed}/${integrationBaseline.total} passed (17/17 recheck in docs/PHASE_2_READINESS.md).`}</p>
                </>
              ) : recInt ? (
                <>
                  <StackBar segments={[{ label: 'pass', value: recInt.report.passed, tone: 'pass' }, { label: 'fail', value: recInt.report.failed, tone: 'fail' }]} />
                  <p className="mt-2 text-[12px] text-muted">From <span className="font-mono">{recInt.fileName}</span>, generated {fmtTime(recInt.report.generatedAt)}. Not run in this session.</p>
                </>
              ) : (
                <>
                  <StackBar segments={[{ label: 'pass', value: integrationBaseline.passed, tone: 'pass' }, { label: 'fail', value: 0, tone: 'fail' }]} />
                  <p className="mt-2 text-[12px] text-muted">Historical result. Not run in this session — run the suite to replace it with live results.</p>
                </>
              )}
            </SuiteRow>

            <SuiteRow title="Phase 2 security" sub={`${p2.specs.length} checks · phase2.mjs${p2.catalogSource === 'repository' ? ' (repository copy)' : ''}`}
              tag={p2Measured
                ? <span className="flex items-center gap-1.5">{p2Sources.map(src => <SourceTag key={src} source={src} at={src === 'recorded' ? recP2?.report.generatedAt : undefined} note={src === 'recorded' ? recP2?.fileName : undefined} />)}</span>
                : <SourceTag source="baseline" note={BASELINE_NOTE} />} link="/lab/scenarios?suite=phase2">
              {p2Measured ? (
                <>
                  <StackBar segments={[
                    { label: 'pass', value: p2.counts.PASS, tone: 'pass' },
                    { label: 'fail', value: p2.counts.FAIL, tone: 'fail' },
                    ...(p2.counts.ERROR ? [{ label: 'error', value: p2.counts.ERROR, tone: 'warn' as const }] : []),
                    { label: 'unsupported', value: p2.counts.UNSUPPORTED, tone: 'hatch' },
                    { label: 'not implemented', value: p2.counts.NOT_IMPLEMENTED, tone: 'hatch' },
                    ...(p2.counts.NOT_RUN ? [{ label: 'not run', value: p2.counts.NOT_RUN, tone: 'empty' as const }] : []),
                  ]} />
                  <p className="mt-2 text-[12px] text-muted">
                    {p2.counts.limitation ? `${p2.counts.limitation} of the passes reproduce a documented limitation. ` : ''}Unsupported and not-implemented checks are not passes.
                    {p2.sources.live && p2.sources.recorded ? ' Mixes runs on this server with the saved report; each row in the Scenario Lab shows its source.' : ''}
                  </p>
                </>
              ) : (
                <>
                  <StackBar segments={[
                    { label: 'pass', value: phase2Baseline.pass, tone: 'pass' },
                    { label: 'fail', value: phase2Baseline.fail, tone: 'fail' },
                    { label: 'unsupported', value: phase2Baseline.unsupported, tone: 'hatch' },
                    { label: 'not implemented', value: phase2Baseline.notImplemented, tone: 'hatch' },
                  ]} />
                  <p className="mt-2 text-[12px] text-muted">Committed measurement, not run in this session. Run Phase 2 or <span className="font-mono">npm run phase2</span> to replace it.</p>
                </>
              )}
            </SuiteRow>

            <SuiteRow title="Stress tests" sub="Local, single process, in-memory · not production capacity"
              tag={stressRuns.length ? <SourceTag source="live" at={stressRuns[0].at} /> : recP2?.report.stress?.length ? <SourceTag source="recorded" at={recP2.report.generatedAt} note={recP2.fileName} /> : <SourceTag source="repository" note="Presets from scenarios.mjs STRESS_PRESETS" />} link="/lab/stress">
              <div className="grid grid-cols-3 gap-3">
                {(['100', '500', '1000'] as const).map(n => {
                  const live = stressRuns.find(l => l.preset === n)
                  const rec = recP2?.report.stress?.find(st => st.preset === n)
                  const r = live?.result ?? rec
                  const worst = r ? [...r.runs].sort((a, b) => b.p95Ms - a.p95Ms)[0] : undefined
                  return (
                    <div key={n} className="rounded-md bg-canvas px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="tnum text-[13px] font-semibold text-ink">{Number(n).toLocaleString()} req</span>
                        <StatusBadge status={r ? (r.pass ? 'PASS' : 'FAIL') : 'NOT_RUN'} />
                      </div>
                      <div className="mt-1 font-mono text-[11.5px] text-muted">
                        {r && worst ? `${r.runs.length} seed${r.runs.length === 1 ? '' : 's'} · worst p95 ${fmtMs(worst.p95Ms)}` : 'No result'}
                      </div>
                      <div className="font-mono text-[11px] text-faint">{live ? 'this session' : rec ? 'saved report' : ''}</div>
                    </div>
                  )
                })}
              </div>
            </SuiteRow>
          </div>
        </Section>

        <Section title="Security findings" aside={<span className="text-[11.5px] text-faint">From Phase 2 checks</span>} pad={false}>
          {unmapped.length > 0 && (
            <Link to="/lab/findings" className="block border-b border-critical/30 bg-critical-50 px-4 py-2.5 text-[12.5px] text-critical-ink hover:underline">
              {unmapped.length} failing Phase 2 check{unmapped.length === 1 ? '' : 's'} with no finding yet: <span className="font-mono">{unmapped.map(r => r.spec.id).join(', ')}</span>
            </Link>
          )}
          <ul className="divide-y divide-line">
            {findings.map(st => {
              const f = st.finding
              return (
                <li key={f.id}>
                  <Link to={`/lab/findings/${f.id}`} className="group block px-4 py-3.5 transition-colors duration-150 hover:bg-canvas">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-critical px-1.5 py-px text-[10.5px] font-semibold uppercase text-white">{f.severity}</span>
                      <span className="font-mono text-[12px] text-ink">{f.id}</span>
                      <span className={`ml-auto text-[11.5px] ${stageText(st).tone}`}>{stageText(st).label}</span>
                    </div>
                    <div className="mt-1.5 text-[13.5px] font-medium text-ink">{f.title}</div>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{f.summary}</p>
                    <div className="mt-2 flex items-baseline gap-4 text-[12px]">
                      <span className="text-muted">Expected <span className="tnum font-semibold text-ink">{f.expected.value}</span></span>
                      <span className="text-muted">Observed <span className={`tnum font-semibold ${st.checkStatus === 'PASS' ? 'text-ink' : 'text-critical-ink'}`}>{st.observedLabel}</span></span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11.5px]">
                      <span className="flex items-center gap-1.5 text-muted"><span className="font-mono">{f.check}</span> <StatusBadge status={st.checkStatus} /> <SourceTag source={st.source} at={st.at} note={st.sourceNote} /></span>
                      <ChevronRight className="size-3.5 text-faint transition-transform duration-150 group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-line px-4 py-3 text-[12px] text-muted">
            Resolved means a recorded fix plus an independent retest; a later failure reopens it. <Link to="/lab/findings" className="font-medium text-teal-ink hover:underline">Findings center →</Link>
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

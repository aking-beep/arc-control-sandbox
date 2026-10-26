import { Link } from 'react-router-dom'
import { Check, X, Minus } from 'lucide-react'
import { Drawer } from '../ui/Drawer'
import { KV, Button } from '../ui/primitives'
import { StatusBadge } from '../ui/StatusBadge'
import { SourceTag } from '../ui/SourceTag'
import { useData } from '../../api/DataProvider'
import { usePhase2 } from '../../api/Phase2Provider'
import { SUITE_LABEL, type CatalogScenario } from '../../data/catalog'
import { catalogStatus, decisionOf, fmtMs, fmtTime } from '../../lib/status'

const EXPECTED_DECISION: Record<string, string | null> = { EXECUTED: 'ALLOW', PENDING: 'REQUIRE_APPROVAL', DENIED: 'DENY', REFUSED: null, ONCE: 'ALLOW' }

export function ScenarioDrawer({ scenario, onClose }: { scenario: CatalogScenario | null; onClose: () => void }) {
  const { latestRunById, running, runScenario, scenarios } = useData()
  const phase2 = usePhase2()
  const s = scenario
  const p2run = s?.phase2Id ? phase2.latestById.get(s.phase2Id) : undefined
  const run = s ? latestRunById.get(s.id) : undefined
  const d = decisionOf(run)

  return (
    <Drawer open={!!s} onClose={onClose} width={560}
      title={s?.description}
      subtitle={s && <span className="flex items-center gap-2"><span className="font-mono">{s.id}</span> · {SUITE_LABEL[s.suite]} · <StatusBadge status={catalogStatus(s, latestRunById, running)} /></span>}>
      {s && (
        <div className="space-y-6">
          <dl className="divide-y divide-line">
            <KV k="Category">{s.category}</KV>
            <KV k="Agent" mono>{s.agent}</KV>
            <KV k="Target tool" mono>{s.tool}</KV>
            <KV k="Expected result" mono>{s.expected}</KV>
            <KV k="Expected effect">{s.expectedEffect}</KV>
            {s.note && <KV k="Note">{s.note}</KV>}
            {s.phase2Id && (
              <KV k="Phase 2 check" mono>
                <span className="mr-2">{s.phase2Id}</span>
                {p2run
                  ? <><StatusBadge status={p2run.status === 'fail' ? 'FAIL' : p2run.status === 'pass' ? 'PASS' : 'NOT_RUN'} /> <SourceTag source="live" at={p2run.at} /></>
                  : <span className="text-faint">not run in this window</span>}
              </KV>
            )}
          </dl>

          {s.implementation === 'executable' ? (
            <>
              <div>
                <h3 className="mb-2 text-[12px] font-semibold text-ink">Assertion chain {run && <span className="ml-1 font-normal text-faint">· latest run {fmtTime(run.at)}</span>}</h3>
                {!run ? <p className="rounded-md bg-canvas px-3 py-3 text-[12.5px] text-muted">Not run in this session. No assertions to show.</p> : (
                  <ul className="divide-y divide-line rounded-md border border-line">
                    <Assert label="ARC outcome" expected={s.expected} actual={d?.outcome ?? (d ? `HTTP ${d.httpStatus}` : '—')} ok={run.pass ? true : undefined} />
                    <Assert label="Decision effect" expected={EXPECTED_DECISION[s.expected] ?? 'pre-decision refusal'} actual={d?.decision ?? 'none'} ok={run.pass ? true : undefined} />
                    <Assert label="Evidence readable" expected={EXPECTED_DECISION[s.expected] ? 'yes' : 'n/a'} actual={d?.evidencePresent === null || d?.evidencePresent === undefined ? 'n/a' : d.evidencePresent ? 'yes' : 'no'} ok={d?.evidencePresent === false ? false : run.pass ? true : undefined} />
                    <Assert label="Backend effect" expected={s.expectedEffect} actual={run.pass ? 'matched (asserted by runner)' : 'see error'} ok={run.pass} />
                  </ul>
                )}
                {run && !run.pass && run.error && (
                  <div className="mt-3 rounded-md border border-critical/30 bg-critical-50 px-3 py-2.5">
                    <div className="text-[11.5px] font-medium text-critical-ink">Runner assertion failed</div>
                    <div className="mt-0.5 font-mono text-[12px] text-ink">{run.error}</div>
                  </div>
                )}
                <p className="mt-2 text-[11.5px] leading-relaxed text-faint">The runner stops at the first failed assertion and returns one error string; individual assertion results are not reported separately.</p>
              </div>

              {d && (
                <dl className="divide-y divide-line">
                  <KV k="HTTP status" mono>{d.httpStatus}</KV>
                  <KV k="Policy" mono>{d.policyId ?? '—'}</KV>
                  <KV k="Evidence ID" mono>{d.evidenceId ? <Link className="text-teal-ink hover:underline" to={`/lab/evidence?q=${d.evidenceId}`}>{d.evidenceId}</Link> : '—'}</KV>
                  <KV k="Approval ID" mono>{d.approvalId ?? '—'}</KV>
                  <KV k="ARC latency" mono>{fmtMs(d.latencyMs)}</KV>
                  <KV k="Scenario duration" mono>{fmtMs(run?.elapsedMs)}</KV>
                </dl>
              )}

              {run && (
                <details className="rounded-md border border-line">
                  <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium text-ink">Raw runner JSON</summary>
                  <pre className="max-h-72 overflow-auto border-t border-line bg-canvas px-3 py-2 font-mono text-[11px] leading-relaxed text-ink">{JSON.stringify(run, null, 2)}</pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button variant="primary" loading={running.has(s.id)} disabled={scenarios.status !== 'live'} onClick={() => runScenario(s.id)}>Run scenario</Button>
                <Link to={`/lab/inspector?run=${s.id}`}><Button>Open in Inspector</Button></Link>
              </div>
            </>
          ) : (
            <div className="rounded-md bg-canvas px-4 py-3 text-[12.5px] leading-relaxed text-muted">
              {s.implementation === 'phase2' && (
                <>
                  <p>Implemented as the Phase 2 check <span className="font-mono text-ink">{s.phase2Id}</span>, not as an original-17 scenario. Run it from the Phase 2 section of the Scenario Lab, or with <span className="font-mono">npm run phase2</span>.</p>
                  {p2run?.error && <p className="mt-2 font-mono text-[12px] text-critical-ink">{p2run.error}</p>}
                  <Button className="mt-3" loading={phase2.running.has(s.phase2Id!)} disabled={phase2.catalogue.status !== 'live'} onClick={() => phase2.runCheck(s.phase2Id!)}>Run Phase 2 check</Button>
                </>
              )}
              {s.implementation === 'not_implemented' && 'Specified in MASTER_BUILD_PLAN.md but no scenario code exists anywhere. It cannot run and is not counted as a pass.'}
              {s.implementation === 'partial' && 'Only the assurance API trigger exists. The assertion that ARC reports unassessable rather than invented green is not automated.'}
              {s.implementation === 'unsupported' && 'Requires an ARC capability that is not shipped. Blocked by product gap — not a pass.'}
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

function Assert({ label, expected, actual, ok }: { label: string; expected: string; actual: string; ok?: boolean }) {
  return (
    <li className="grid grid-cols-[20px_120px_1fr_1fr] items-center gap-2 px-3 py-2 text-[12px]">
      {ok === true ? <Check className="size-3.5 text-success" /> : ok === false ? <X className="size-3.5 text-critical" /> : <Minus className="size-3.5 text-faint" />}
      <span className="text-muted">{label}</span>
      <span className="font-mono text-[11.5px] text-faint">exp {expected}</span>
      <span className="font-mono text-[11.5px] text-ink">{actual}</span>
    </li>
  )
}

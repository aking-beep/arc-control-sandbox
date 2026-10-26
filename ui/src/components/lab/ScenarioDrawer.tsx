import { Link } from 'react-router-dom'
import { Check, X, Minus } from 'lucide-react'
import { Drawer } from '../ui/Drawer'
import { KV, Button } from '../ui/primitives'
import { StatusBadge } from '../ui/StatusBadge'
import { SourceTag } from '../ui/SourceTag'
import { useData } from '../../api/DataProvider'
import { SUITE_LABEL, type CatalogScenario } from '../../data/catalog'
import { catalogStatus, decisionOf, fmtMs, fmtTime } from '../../lib/status'
import { usePhase2 } from '../../lib/phase2'
import { MASTER_PLAN_COVERAGE } from '../../data/catalog'

const EXPECTED_DECISION: Record<string, string | null> = { EXECUTED: 'ALLOW', PENDING: 'REQUIRE_APPROVAL', DENIED: 'DENY', REFUSED: null, ONCE: 'ALLOW' }

export function ScenarioDrawer({ scenario, onClose }: { scenario: CatalogScenario | null; onClose: () => void }) {
  const { latestRunById, running, runScenario, runPhase2, arcReady } = useData()
  const p2 = usePhase2()
  const s = scenario
  const p2r = s?.runner === 'phase2' ? p2.resolve(s.id) : undefined
  const planItems = s ? Object.entries(MASTER_PLAN_COVERAGE).filter(([, ids]) => ids.includes(s.id)).map(([n]) => n) : []
  const run = s ? latestRunById.get(s.id) : undefined
  const d = decisionOf(run)

  return (
    <Drawer open={!!s} onClose={onClose} width={560}
      title={s?.description}
      subtitle={s && <span className="flex items-center gap-2"><span className="font-mono">{s.id}</span> · {SUITE_LABEL[s.suite]} · <StatusBadge status={catalogStatus(s, latestRunById, running, p2.resolve)} /></span>}>
      {s && (
        <div className="space-y-6">
          <dl className="divide-y divide-line">
            <KV k="Category">{s.category}</KV>
            <KV k="Agent" mono>{s.agent}</KV>
            <KV k="Target tool" mono>{s.tool}</KV>
            <KV k="Expected result" mono>{s.expected}</KV>
            <KV k="Expected effect">{s.expectedEffect}</KV>
            {s.note && <KV k="Note">{s.note}</KV>}
            {s.baseline && <KV k="Baseline"><span className="mr-2 font-mono text-[12px]">{s.baseline}</span><SourceTag source="baseline" /></KV>}
            {planItems.length > 0 && <KV k="Master plan">Scenario {planItems.join(', ')} in MASTER_BUILD_PLAN.md</KV>}
          </dl>

          {s.runner === 'phase2' && s.implementation === 'executable' ? (
            <>
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-ink">Latest result {p2r && p2r.status !== 'NOT_RUN' && <SourceTag source={p2r.source} at={p2r.at} note={p2r.origin} />}</h3>
                {!p2r?.run ? <p className="rounded-md bg-canvas px-3 py-3 text-[12.5px] text-muted">Not run on this server and not in a saved Phase 2 report.</p> : (
                  <dl className="divide-y divide-line">
                    <KV k="Status"><StatusBadge status={p2r.status} /></KV>
                    <KV k="Disposition" mono>{p2r.run.disposition}</KV>
                    <KV k="Duration" mono>{fmtMs(p2r.run.elapsedMs)}</KV>
                    <KV k="When" mono>{fmtTime(p2r.at)}</KV>
                  </dl>
                )}
                {p2r?.limitation && p2r.status === 'PASS' && <p className="mt-2 rounded-md bg-warning-50 px-3 py-2 text-[12px] text-warning-ink">This pass reproduces a documented limitation. The check behaved as described, which is not the same as the control being strong.</p>}
                {p2r?.run?.error && (
                  <div className="mt-3 rounded-md border border-critical/30 bg-critical-50 px-3 py-2.5">
                    <div className="text-[11.5px] font-medium text-critical-ink">{p2r.status === 'ERROR' ? 'Runner could not complete the check' : 'Check assertion failed'}</div>
                    <div className="mt-0.5 font-mono text-[12px] text-ink">{p2r.run.error}</div>
                  </div>
                )}
              </div>
              {p2r?.run && (
                <details className="rounded-md border border-line">
                  <summary className="cursor-pointer px-3 py-2 text-[12px] font-medium text-ink">Raw check JSON</summary>
                  <pre className="max-h-72 overflow-auto border-t border-line bg-canvas px-3 py-2 font-mono text-[11px] leading-relaxed text-ink">{JSON.stringify(p2r.run, null, 2)}</pre>
                </details>
              )}
              <div className="flex gap-2">
                <Button variant="primary" loading={running.has(`p2:${s.id}`)} disabled={!p2.runnable || running.has('__p2all__')} onClick={() => runPhase2(s.id)}
                  title={`POST /api/phase2/${s.id}`}>Run check</Button>
              </div>
              <p className="text-[11.5px] leading-relaxed text-faint">Phase 2 checks run against the shared ARC process. Some register probe agents, tools and policies and leave them disabled afterwards, which shows up in ARC Assurance.</p>
            </>
          ) : s.implementation === 'executable' ? (
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
                <Button variant="primary" loading={running.has(s.id)} disabled={!arcReady} onClick={() => runScenario(s.id)}>Run scenario</Button>
                <Link to={`/lab/inspector?run=${s.id}`}><Button>Open in Inspector</Button></Link>
              </div>
            </>
          ) : (
            <div className="rounded-md bg-canvas px-4 py-3 text-[12.5px] leading-relaxed text-muted">
              {s.implementation === 'not_implemented' && (s.note ?? 'No scenario code exists. It cannot run and is not counted as a pass.')}
              {s.implementation === 'partial' && s.note}
              {s.implementation === 'unsupported' && <>Requires an ARC capability this build does not ship. Blocked by product gap, not a pass.{s.note && <div className="mt-2 text-ink">{s.note}</div>}</>}
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

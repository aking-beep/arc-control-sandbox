import { useState } from 'react'
import { Play, Info } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Button, Empty, Th, Td } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { StackBar } from '../../components/lab/StackBar'
import { LatencyBars } from '../../components/lab/LatencyBars'
import { fmtMs, fmtTime } from '../../lib/status'

const PRESETS = [
  { count: 100, concurrency: 5 },
  { count: 500, concurrency: 10 },
  { count: 1000, concurrency: 20 },
]

export function StressLab() {
  const { runLoad, running, loadRuns, health } = useData()
  const [count, setCount] = useState(100)
  const [concurrency, setConcurrency] = useState(5)
  const [selectedAt, setSelectedAt] = useState<string | null>(null)
  const busy = running.has('__load__')
  const live = health.status === 'live'
  const current = loadRuns.find(r => r.at === selectedAt) ?? loadRuns[0]
  const r = current?.result
  const errors = r ? r.samples.filter(s => s.actual.startsWith('transport_error') || s.actual.startsWith('HTTP_')).length : 0

  return (
    <>
      <PageHeader
        title="Stress Lab"
        description="Sends real finance.refund requests through the ARC API in parallel and reconciles the decisions ARC returned with the mutations Meridian recorded."
        meta={<span className="inline-flex items-center gap-1.5 rounded-md bg-warning-50 px-2 py-1 text-[12px] text-warning-ink"><Info className="size-3.5" />Local single process · in-memory store · loopback. Not production capacity.</span>}
      />

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Section title="Configuration">
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-ink">Preset</div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map(p => (
                  <button key={p.count} onClick={() => { setCount(p.count); setConcurrency(p.concurrency) }}
                    className={`rounded-md border px-2 py-2 text-center transition-colors duration-150 ${count === p.count ? 'border-navy bg-navy text-white' : 'border-line-strong text-ink hover:bg-canvas'}`}>
                    <div className="tnum text-[13px] font-semibold">{p.count.toLocaleString()}</div>
                    <div className={`text-[10.5px] ${count === p.count ? 'text-mint' : 'text-faint'}`}>c={p.concurrency}</div>
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <div className="mb-1.5 flex justify-between text-[12px]"><span className="font-medium text-ink">Concurrency</span><span className="tnum font-mono text-muted">{concurrency}</span></div>
              <input type="range" min={1} max={25} value={concurrency} onChange={e => setConcurrency(Number(e.target.value))} className="w-full accent-[var(--color-navy)]" />
              <div className="mt-0.5 text-[11px] text-faint">Runner clamps to 1–25 workers</div>
            </label>
            <Disabled label="Test seed" />
            <Disabled label="Scenario mix" value="Fixed: 50% $120 · 25% $1,800 · 25% $4,200" />
            <Disabled label="Execution mode" />
            <Button variant="primary" className="w-full justify-center" icon={<Play className="size-3.5" />} loading={busy} disabled={!live}
              onClick={() => runLoad({ count, concurrency }).then(res => res && setSelectedAt(null))}>
              Run {count.toLocaleString()} requests
            </Button>
            {!live && <p className="text-[11.5px] text-muted">Meridian server not reachable — POST /api/load unavailable.</p>}
            <p className="text-[11.5px] leading-relaxed text-faint">Avoid running stress and the scenario suite at the same time; both write to the same mutation log.</p>
          </div>
        </Section>

        <div className="min-w-0 space-y-5">
          {!r ? (
            <Section>
              <Empty title={busy ? 'Running…' : 'No stress results in this session'}>
                Results appear only from a completed POST /api/load. No sample or projected figures are shown. Stress results are not persisted by the sandbox; recorded Phase 2 local results load here once a report endpoint exists.
              </Empty>
            </Section>
          ) : (
            <>
              <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] divide-x divide-line rounded-lg border border-line bg-surface">
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between text-[12px] text-muted">Unexpected effects <StatusBadge status={r.pass ? 'PASS' : 'FAIL'} /></div>
                  <div className={`tnum mt-1 text-[32px] font-semibold leading-none ${r.observedEffects !== r.expectedEffects ? 'text-critical-ink' : 'text-ink'}`}>{r.observedEffects - r.expectedEffects}</div>
                  <div className="mt-1.5 font-mono text-[11.5px] text-muted">expected {r.expectedEffects} · observed {r.observedEffects}</div>
                </div>
                <Metric k="Throughput" v={`${r.requestsPerSecond}`} unit="req/s" />
                <Metric k="Unexpected outcomes" v={`${r.unexpectedOutcomes}`} unit={`of ${r.requested}`} bad={r.unexpectedOutcomes > 0} />
                <Metric k="Error rate" v={`${((errors / r.requested) * 100).toFixed(1)}%`} unit="from samples" />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Section title="Latency (per request)" aside={<SourceTag source="live" at={current.at} />}>
                  <LatencyBars p50={r.p50Ms} p95={r.p95Ms} p99={r.p99Ms} />
                </Section>
                <Section title="Authorization decisions">
                  <StackBar height={12} segments={[
                    { label: 'executed', value: r.outcomeDistribution.executed, tone: 'pass' },
                    { label: 'pending approval', value: r.outcomeDistribution.pending_approval, tone: 'warn' },
                    { label: 'denied', value: r.outcomeDistribution.denied, tone: 'neutral' },
                    { label: 'other', value: r.requested - r.outcomeDistribution.executed - r.outcomeDistribution.pending_approval - r.outcomeDistribution.denied, tone: 'fail' },
                  ]} />
                  <p className="mt-3 text-[12px] text-muted">{r.requested.toLocaleString()} requests · {r.concurrency} workers · {fmtMs(r.elapsedMs)} total</p>
                </Section>
              </div>

              {r.samples.length > 0 && (
                <Section title={`Mismatch samples (${r.samples.length} of ${r.unexpectedOutcomes})`} pad={false}>
                  <table className="w-full border-collapse">
                    <thead><tr><Th>Expected</Th><Th>Actual</Th><Th>Evidence</Th><Th>Latency</Th></tr></thead>
                    <tbody>{r.samples.map((s, i) => (
                      <tr key={i}><Td className="font-mono text-[11.5px]">{s.expected}</Td><Td className="font-mono text-[11.5px] text-critical-ink">{s.actual}</Td><Td>{s.evidence ? 'yes' : 'no'}</Td><Td className="font-mono text-[11.5px]">{fmtMs(s.timeMs)}</Td></tr>
                    ))}</tbody>
                  </table>
                </Section>
              )}
            </>
          )}

          <Section title="Run history" aside={<span className="text-[11.5px] text-faint">This session only · not persisted</span>} pad={false}>
            {loadRuns.length === 0 ? <Empty title="No runs yet" /> : (
              <table className="w-full border-collapse">
                <thead><tr><Th>When</Th><Th>Requests</Th><Th>Workers</Th><Th>Throughput</Th><Th>p50 / p95 / p99</Th><Th>Effects exp/obs</Th><Th>Result</Th></tr></thead>
                <tbody>{loadRuns.map(l => (
                  <tr key={l.at} onClick={() => setSelectedAt(l.at)} className={`cursor-pointer transition-colors duration-100 hover:bg-canvas ${current?.at === l.at ? 'bg-mint-50/60' : ''}`}>
                    <Td className="font-mono text-[11.5px]">{fmtTime(l.at)}</Td>
                    <Td className="tnum">{l.result.requested}</Td>
                    <Td className="tnum">{l.result.concurrency}</Td>
                    <Td className="tnum font-mono text-[11.5px]">{l.result.requestsPerSecond} req/s</Td>
                    <Td className="font-mono text-[11.5px]">{l.result.p50Ms} / {l.result.p95Ms} / {l.result.p99Ms} ms</Td>
                    <Td className="font-mono text-[11.5px]">{l.result.expectedEffects} / {l.result.observedEffects}</Td>
                    <Td><StatusBadge status={l.result.pass ? 'PASS' : 'FAIL'} /></Td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Section>
        </div>
      </div>
    </>
  )
}

function Metric({ k, v, unit, bad }: { k: string; v: string; unit: string; bad?: boolean }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[12px] text-muted">{k}</div>
      <div className={`tnum mt-1 text-[22px] font-semibold leading-none ${bad ? 'text-critical-ink' : 'text-ink'}`}>{v}</div>
      <div className="mt-1.5 text-[11.5px] text-faint">{unit}</div>
    </div>
  )
}

function Disabled({ label, value = 'Not supported by runner' }: { label: string; value?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]"><span className="font-medium text-muted">{label}</span><span className="text-[10.5px] text-faint">disabled</span></div>
      <div className="rounded-md border border-dashed border-line-strong bg-canvas px-2.5 py-1.5 text-[12px] text-faint">{value}</div>
    </div>
  )
}

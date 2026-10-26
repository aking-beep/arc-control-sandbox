import React, { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { useLab } from '../lib/LabData'
import { RECORDED_STRESS } from '../data/report'
import { Button } from './PageHeader'
import { ProvenanceTag } from './Status'
import type { LoadRun } from '../lib/types'

const PRESETS = [
  { id: '100', label: '100 requests', sub: 'concurrency 5' },
  { id: '500', label: '500 requests', sub: 'concurrency 10' },
  { id: '1000', label: '1,000 requests', sub: 'concurrency 20' },
] as const

export function StressPanel() {
  const { mode, runStress, running, lastStress } = useLab()
  const [preset, setPreset] = useState<'100' | '500' | '1000'>('100')
  const live = mode === 'live'
  const isRunning = running.has(`stress:${preset}`)

  return (
    <div className="px-8 py-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-[13px] font-semibold text-navy-900">Run a preset</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            Seed 1 only from the UI. The three-seed matrix is <span className="font-mono text-[12px]">npm run phase2</span>. Mix: ½ executed $120, ¼ held $1,800, ¼ denied $4,200.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-line-strong p-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`whitespace-nowrap rounded px-3 py-1 text-[12px] font-medium transition-colors duration-150 ${preset === p.id ? 'bg-navy-900 text-white' : 'text-muted hover:text-ink'}`}
              >
                {p.label} <span className={preset === p.id ? 'text-white/60' : 'text-subtle'}>· c{p.sub.split(' ')[1]}</span>
              </button>
            ))}
          </div>
          <Button variant="primary" disabled={!live || isRunning} title={live ? undefined : 'Requires a running Meridian backend'} onClick={() => runStress(preset)}>
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run · POST /api/stress
          </Button>
        </div>
      </div>

      {lastStress && (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-navy-900">
            Latest run <ProvenanceTag provenance="live" />
            <span className={`ml-1 text-[12px] ${lastStress.pass ? 'text-pass' : 'text-fail'}`}>{lastStress.pass ? 'Assertions held' : 'Assertions failed'}</span>
          </div>
          <RunsTable runs={lastStress.runs} />
        </div>
      )}

      <div className="mt-8">
        <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-navy-900">
          Recorded matrix · 3 presets × seeds 1–3 <ProvenanceTag provenance="recorded" />
        </div>
        <RunsTable runs={RECORDED_STRESS} />
        <p className="mt-2 text-[12px] text-subtle">
          Percentiles use floor(p × (n − 1)) on sorted request latencies. One Node process on loopback with MemoryStore. Not a service-level objective.
        </p>
      </div>
    </div>
  )
}

function RunsTable({ runs }: { runs: LoadRun[] }) {
  const maxP99 = Math.max(...runs.map((r) => r.p99Ms), 1)
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <table className="tnum w-full text-right text-[12.5px]">
        <thead>
          <tr className="border-b border-line bg-canvas text-[11.5px] text-subtle">
            <th className="px-4 py-2 text-left font-medium">Preset</th>
            <th className="px-3 py-2 text-left font-medium">Seed</th>
            <th className="px-3 py-2 font-medium">Requests/s</th>
            <th className="px-3 py-2 font-medium">p50</th>
            <th className="px-3 py-2 font-medium">p95</th>
            <th className="px-3 py-2 font-medium">p99</th>
            <th className="w-[160px] px-3 py-2 text-left font-medium">Latency spread</th>
            <th className="px-3 py-2 font-medium">Refunds</th>
            <th className="px-3 py-2 font-medium">Other mutations</th>
            <th className="px-4 py-2 font-medium">Unexpected</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {runs.map((r, i) => (
            <tr key={i}>
              <td className="px-4 py-2 text-left font-medium text-ink">
                {r.requested.toLocaleString()} <span className="font-normal text-subtle">· c{r.concurrency}</span>
              </td>
              <td className="px-3 py-2 text-left text-muted">{r.seed}</td>
              <td className="px-3 py-2 text-ink">{r.requestsPerSecond.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-2 text-muted">{r.p50Ms}</td>
              <td className="px-3 py-2 text-muted">{r.p95Ms}</td>
              <td className="px-3 py-2 text-muted">{r.p99Ms}</td>
              <td className="px-3 py-2">
                <div className="relative h-1.5 w-full rounded-full bg-canvas">
                  <div className="absolute h-1.5 rounded-full bg-navy-600/25" style={{ left: 0, width: `${(r.p99Ms / maxP99) * 100}%` }} />
                  <div className="absolute h-1.5 rounded-full bg-navy-700" style={{ left: 0, width: `${(r.p50Ms / maxP99) * 100}%` }} />
                </div>
              </td>
              <td className={`px-3 py-2 ${r.observedEffects === r.expectedEffects ? 'text-ink' : 'font-semibold text-fail'}`}>
                {r.observedEffects}/{r.expectedEffects}
              </td>
              <td className="px-3 py-2 text-muted">{r.otherMutations}</td>
              <td className={`px-4 py-2 ${r.unexpectedOutcomes ? 'font-semibold text-fail' : 'text-muted'}`}>{r.unexpectedOutcomes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

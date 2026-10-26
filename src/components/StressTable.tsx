import React from 'react'
import { SectionTitle } from './PageHeader'
import { ProvenanceTag } from './Status'
import { RECORDED_STRESS } from '../data/report'
import { useLab } from '../lib/LabData'
import type { LoadRun } from '../lib/types'

export function StressTable() {
  const { lastStress } = useLab()
  const live = lastStress?.runs ?? []
  const rows: { run: LoadRun; live: boolean }[] = [...live.map((run) => ({ run, live: true })), ...RECORDED_STRESS.map((run) => ({ run, live: false }))]
  return (
    <section>
      <SectionTitle aside={<ProvenanceTag provenance={live.length ? 'live' : 'recorded'} />}>Stress · finance.refund mix</SectionTitle>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <table className="tnum w-full text-right text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-canvas text-[11.5px] text-subtle">
              <th className="px-4 py-2 text-left font-medium">Requests · seed</th>
              <th className="px-3 py-2 font-medium">req/s</th>
              <th className="px-3 py-2 font-medium">p95</th>
              <th className="px-3 py-2 font-medium">p99</th>
              <th className="px-4 py-2 font-medium">Refunds</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ run, live: isLive }, i) => (
              <tr key={i} className={isLive ? 'bg-teal-50/50' : ''}>
                <td className="px-4 py-2 text-left">
                  <span className="font-medium text-ink">{run.requested.toLocaleString()}</span>
                  <span className="text-subtle"> · c{run.concurrency} · s{run.seed}</span>
                  {isLive && <span className="ml-1.5 text-[10.5px] font-medium text-teal-700">live</span>}
                </td>
                <td className="px-3 py-2 text-ink">{run.requestsPerSecond.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-3 py-2 text-muted">{run.p95Ms} ms</td>
                <td className="px-3 py-2 text-muted">{run.p99Ms} ms</td>
                <td className={`px-4 py-2 ${run.observedEffects === run.expectedEffects ? 'text-ink' : 'font-semibold text-fail'}`}>
                  {run.observedEffects}/{run.expectedEffects}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-subtle">
        All nine recorded runs matched seeded outcomes with 0 unexpected mutations. One Node process on loopback with MemoryStore — not a benchmark or SLO.
      </p>
    </section>
  )
}

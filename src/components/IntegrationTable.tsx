import React from 'react'
import { Play, Loader2 } from 'lucide-react'
import type { ScenarioSpec } from '../lib/types'
import { useLab } from '../lib/LabData'
import { StatusPill } from './Status'

export function IntegrationTable({ specs, selected, onSelect }: { specs: ScenarioSpec[]; selected?: string; onSelect: (id: string) => void }) {
  const { scenarioResult, runScenario, running, mode } = useLab()
  const live = mode === 'live'
  return (
    <table className="w-full text-left text-[12.5px]">
      <thead className="sticky top-0 z-10 bg-canvas">
        <tr className="border-b border-line text-[11.5px] text-subtle">
          <th className="py-2 pl-8 pr-3 font-medium">Scenario</th>
          <th className="px-3 py-2 font-medium">Family</th>
          <th className="px-3 py-2 font-medium">Expected</th>
          <th className="px-3 py-2 font-medium">Actual</th>
          <th className="px-3 py-2 font-medium">Result</th>
          <th className="px-3 py-2 text-right font-medium">Latency</th>
          <th className="px-3 py-2 font-medium">Evidence</th>
          <th className="w-12 py-2 pr-8" />
        </tr>
      </thead>
      <tbody className="divide-y divide-line bg-surface">
        {specs.map((s) => {
          const r = scenarioResult(s.id)
          const obs = r.run?.observed
          const isRunning = running.has(`s:${s.id}`) || running.has('s:all')
          return (
            <tr
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`cursor-pointer transition-colors duration-150 ${selected === s.id ? 'bg-teal-50' : 'hover:bg-canvas'}`}
            >
              <td className="py-2.5 pl-8 pr-3">
                <div className="font-medium text-ink">{s.label}</div>
                <div className="font-mono text-[11px] text-subtle">{s.id}</div>
              </td>
              <td className="px-3 py-2.5 text-muted">{s.family}</td>
              <td className="px-3 py-2.5 font-mono text-[11.5px] text-ink">{s.expected}</td>
              <td className="max-w-[240px] px-3 py-2.5">
                {r.provenance === 'recorded' ? (
                  <span className="text-[12px] text-muted">Matched · recorded aggregate</span>
                ) : r.run ? (
                  r.run.pass ? (
                    <span className="font-mono text-[11.5px] text-ink">
                      {[obs?.outcome, obs?.decision, obs?.httpStatus && `HTTP ${obs.httpStatus}`].filter(Boolean).join(' · ') || 'assertions held'}
                    </span>
                  ) : (
                    <span className="line-clamp-2 font-mono text-[11.5px] text-fail">{r.run.error}</span>
                  )
                ) : (
                  <span className="text-subtle">—</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                {isRunning ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
                    <Loader2 size={12} className="animate-spin" /> Running
                  </span>
                ) : (
                  <StatusPill status={r.status} />
                )}
              </td>
              <td className="tnum px-3 py-2.5 text-right text-muted">
                {r.run?.elapsedMs != null ? `${r.run.elapsedMs} ms` : <span className="text-subtle" title="Not captured in recorded report">—</span>}
              </td>
              <td className="px-3 py-2.5">
                {obs?.evidenceId ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink" title={obs.evidenceId}>
                    {obs.evidenceId.slice(0, 10)}…
                    {obs.evidencePresent && <span className="text-pass">✓</span>}
                  </span>
                ) : (
                  <span className="text-[11.5px] text-subtle">{r.provenance === 'recorded' ? 'Not captured' : '—'}</span>
                )}
              </td>
              <td className="py-2.5 pr-8 text-right">
                <button
                  type="button"
                  disabled={!live || isRunning}
                  title={live ? `Run ${s.id}` : 'Requires a running Meridian backend'}
                  onClick={(e) => {
                    e.stopPropagation()
                    runScenario(s.id)
                  }}
                  className="grid h-7 w-7 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Play size={13} />
                </button>
              </td>
            </tr>
          )
        })}
        {specs.length === 0 && (
          <tr>
            <td colSpan={8} className="px-8 py-10 text-center text-[13px] text-muted">
              No scenarios match these filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

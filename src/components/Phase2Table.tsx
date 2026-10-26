import React from 'react'
import { Play, Loader2 } from 'lucide-react'
import type { Phase2Spec } from '../lib/types'
import { useLab } from '../lib/LabData'
import { StatusPill, type StatusKey } from './Status'

export function phase2StatusKey(status: string, limitation: boolean): StatusKey {
  if (status === 'pass' && limitation) return 'limitation'
  return status as StatusKey
}

export function phase2Expected(spec: Phase2Spec) {
  if (spec.kind === 'unsupported') return 'No product surface'
  if (spec.kind === 'not_implemented') return 'Not run'
  if (spec.disposition === 'limitation_reproduced') return 'Limitation asserted'
  return 'Control holds'
}

export function Phase2Table({ specs, selected, onSelect }: { specs: Phase2Spec[]; selected?: string; onSelect: (id: string) => void }) {
  const { phase2Result, runPhase2, running, mode } = useLab()
  const live = mode === 'live'
  return (
    <table className="w-full text-left text-[12.5px]">
      <thead className="sticky top-0 z-10 bg-canvas">
        <tr className="border-b border-line text-[11.5px] text-subtle">
          <th className="py-2 pl-8 pr-3 font-medium">Check</th>
          <th className="px-3 py-2 font-medium">Family · track</th>
          <th className="px-3 py-2 font-medium">Expected</th>
          <th className="px-3 py-2 font-medium">Actual</th>
          <th className="px-3 py-2 font-medium">Result</th>
          <th className="w-12 py-2 pr-8" />
        </tr>
      </thead>
      <tbody className="divide-y divide-line bg-surface">
        {specs.map((s) => {
          const r = phase2Result(s)
          const key = phase2StatusKey(r.status, r.limitation)
          const isRunning = running.has(`p:${s.id}`) || running.has('p:all')
          const failed = r.status === 'fail'
          return (
            <tr
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`cursor-pointer transition-colors duration-150 ${selected === s.id ? 'bg-teal-50' : failed ? 'bg-fail-bg/50 hover:bg-fail-bg' : 'hover:bg-canvas'}`}
            >
              <td className="py-2.5 pl-8 pr-3">
                <div className={`font-medium ${failed ? 'text-fail' : 'text-ink'}`}>{s.label}</div>
                <div className="font-mono text-[11px] text-subtle">{s.id}</div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                {s.family} <span className="text-subtle">· {s.track}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-ink">{phase2Expected(s)}</td>
              <td className="max-w-[360px] px-3 py-2.5">
                <span className={`line-clamp-2 text-[12px] ${failed ? 'font-medium text-fail' : 'text-muted'}`}>{r.note || '—'}</span>
              </td>
              <td className="px-3 py-2.5">
                {isRunning ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">
                    <Loader2 size={12} className="animate-spin" /> Running
                  </span>
                ) : (
                  <StatusPill status={key} />
                )}
              </td>
              <td className="py-2.5 pr-8 text-right">
                {s.kind === 'implemented' && (
                  <button
                    type="button"
                    disabled={!live || isRunning}
                    title={live ? `Run ${s.id}` : 'Requires a running Meridian backend'}
                    onClick={(e) => {
                      e.stopPropagation()
                      runPhase2(s.id)
                    }}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Play size={13} />
                  </button>
                )}
              </td>
            </tr>
          )
        })}
        {specs.length === 0 && (
          <tr>
            <td colSpan={6} className="px-8 py-10 text-center text-[13px] text-muted">
              No checks match these filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

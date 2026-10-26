import type { ReactNode } from 'react'
import type { ScenarioRun } from '../../api/types'
import { SourceTag } from '../ui/SourceTag'
import { BASELINE_NOTE } from '../../data/baseline'
import { FINDING_TRACES } from '../../data/findingTraces'
import { fmtTime, runStatus } from '../../lib/status'

export type Pick = { kind: 'finding'; id: string } | { kind: 'run'; id: string } | { kind: 'example' }

/**
 * Choose what to inspect. Known failures come first because they are the
 * reason this screen exists; live runs are the only source of real traces.
 */
export function TracePicker({ value, onChange, runs, showExample }: {
  value: Pick
  onChange: (p: Pick) => void
  runs: ScenarioRun[]
  showExample: boolean
}) {
  const unique = Array.from(new Map(runs.map(r => [r.id, r] as [string, ScenarioRun])).values())
  return (
    <div className="mb-5 flex flex-wrap items-stretch gap-x-6 gap-y-3 border-y border-line py-3">
      <Group label="Known failures" tag={<SourceTag source="baseline" note={BASELINE_NOTE} />}>
        {FINDING_TRACES.map(t => {
          const on = value.kind === 'finding' && value.id === t.findingId
          return (
            <button key={t.key} onClick={() => onChange({ kind: 'finding', id: t.findingId! })}
              className={`flex h-8 items-center gap-2 rounded-md px-2.5 text-[12.5px] transition-colors duration-150 ${on ? 'bg-critical-50 text-ink shadow-[inset_0_0_0_1px_var(--color-critical)]' : 'text-muted hover:bg-canvas hover:text-ink shadow-[inset_0_0_0_1px_var(--color-line)]'}`}>
              <span className="size-1.5 rounded-full bg-critical" />
              <span className="font-mono text-[12px] text-ink">{t.findingId}</span>
              <span className="whitespace-nowrap">{t.findingId === 'ARC-SEC-001' ? 'Parallel duplicates' : 'Stale approval'}</span>
            </button>
          )
        })}
      </Group>

      <Group label="Live runs" tag={<SourceTag source="live" />}>
        <select
          value={value.kind === 'run' ? value.id : ''}
          onChange={e => e.target.value && onChange({ kind: 'run', id: e.target.value })}
          disabled={unique.length === 0}
          className={`h-8 w-[300px] rounded-md border bg-surface px-2 text-[12.5px] disabled:text-faint ${value.kind === 'run' ? 'border-navy text-ink' : 'border-line-strong text-muted'}`}>
          <option value="">{unique.length ? `Choose one of ${unique.length} scenario runs…` : 'No runs this session'}</option>
          {unique.map(r => (
            <option key={r.id} value={r.id}>{runStatus(r)} · {r.label} · {fmtTime(r.at)}</option>
          ))}
        </select>
      </Group>

      {showExample && (
        <Group label="Example" tag={<SourceTag source="illustrative" />}>
          <button onClick={() => onChange({ kind: 'example' })}
            className={`h-8 whitespace-nowrap rounded-md px-2.5 text-[12.5px] transition-colors duration-150 ${value.kind === 'example' ? 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-navy)]' : 'text-muted hover:bg-canvas hover:text-ink shadow-[inset_0_0_0_1px_var(--color-line)]'}`}>
            Over-ceiling refund denied
          </button>
        </Group>
      )}
    </div>
  )
}

function Group({ label, tag, children }: { label: string; tag: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[11px] font-medium text-faint">{label} {tag}</div>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

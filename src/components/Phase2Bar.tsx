import React from 'react'
import type { Phase2Counts } from '../lib/counts'

export function Phase2Bar({ counts }: { counts: Phase2Counts }) {
  const segs = [
    { key: 'pass', label: 'Pass', value: counts.pass, cls: 'bg-pass', note: counts.limitation ? `${counts.limitation} reproduce a limitation` : undefined },
    { key: 'fail', label: 'Fail', value: counts.fail, cls: 'bg-fail' },
    { key: 'unsupported', label: 'Unsupported', value: counts.unsupported, cls: 'bg-gap' },
    { key: 'ni', label: 'Not implemented', value: counts.notImplemented, cls: 'bg-line-strong' },
    { key: 'nr', label: 'Not run', value: counts.notRun, cls: 'bg-line' },
  ].filter((s) => s.value > 0 || s.key === 'fail')
  const total = Math.max(1, counts.total)
  return (
    <div>
      <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full">
        {segs.map((s) =>
          s.value > 0 ? <div key={s.key} className={s.cls} style={{ width: `${(s.value / total) * 100}%`, minWidth: 6 }} /> : null,
        )}
      </div>
      <dl className="mt-3 space-y-1.5">
        {segs.map((s) => (
          <div key={s.key} className="flex items-baseline gap-2 text-[12.5px]">
            <span className={`h-2 w-2 shrink-0 translate-y-[1px] rounded-sm ${s.cls}`} />
            <dt className="text-muted">{s.label}</dt>
            {s.note && <span className="text-[11.5px] text-warn">· {s.note}</span>}
            <dd className={`tnum ml-auto font-medium ${s.key === 'fail' && s.value > 0 ? 'text-fail' : 'text-ink'}`}>{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export interface Segment { label: string; value: number; tone: 'pass' | 'fail' | 'warn' | 'neutral' | 'hatch' | 'empty' }

const TONE: Record<Segment['tone'], string> = {
  pass: 'bg-success',
  fail: 'bg-critical',
  warn: 'bg-warning',
  neutral: 'bg-neutral',
  hatch: 'hatch',
  empty: 'bg-neutral-50',
}
const KEY: Record<Segment['tone'], string> = {
  pass: 'bg-success', fail: 'bg-critical', warn: 'bg-warning', neutral: 'bg-neutral', hatch: 'hatch border border-line-strong', empty: 'bg-neutral-50 border border-line-strong',
}

/** Proportional bar with legend. Counts, never percentages — avoids implying a readiness score. */
export function StackBar({ segments, height = 10 }: { segments: Segment[]; height?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  return (
    <div>
      <div className="flex w-full gap-px overflow-hidden rounded-sm bg-line" style={{ height }} role="img"
        aria-label={segments.map(s => `${s.value} ${s.label}`).join(', ')}>
        {total === 0
          ? <div className="flex-1 bg-neutral-50" />
          : segments.filter(s => s.value > 0).map(s => (
            <div key={s.label} className={TONE[s.tone]} style={{ flexGrow: s.value, flexBasis: 0 }} />
          ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
        {segments.map(s => (
          <span key={s.label} className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className={`size-2 rounded-[2px] ${KEY[s.tone]}`} />
            <span className="tnum font-medium text-ink">{s.value}</span> {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

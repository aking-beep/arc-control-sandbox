/**
 * Swim-lane diagram for ARC-SEC-002, in the order phase2.mjs performs it.
 * Positions are ORDINAL (sequence only); the check does not return per-step times.
 */
const LANES = ['Policy', 'Approval', 'Execution', 'Meridian effect'] as const
type Event = { lane: typeof LANES[number]; step: number; label: string; tone: 'neutral' | 'teal' | 'critical' }
const COMMON: Event[] = [
  { lane: 'Approval', step: 0, label: '$1,850 refund held (MER-FIN-001)', tone: 'neutral' },
  { lane: 'Policy', step: 1, label: 'MER-P2-DENY-QUEUED published', tone: 'critical' },
  { lane: 'Approval', step: 2, label: 'Operator votes approve', tone: 'teal' },
]
const FAILED: Event[] = [
  { lane: 'Execution', step: 3, label: 'Release executes stored decision', tone: 'critical' },
  { lane: 'Meridian effect', step: 4, label: '+1 refund committed', tone: 'critical' },
]
const HELD: Event[] = [
  { lane: 'Execution', step: 3, label: 'Release refused under current policy', tone: 'teal' },
  { lane: 'Meridian effect', step: 4, label: 'No refund', tone: 'neutral' },
]
const STEPS = 5

export function RevalidationTimeline({ held = false }: { held?: boolean }) {
  const dot = { neutral: 'bg-navy', teal: 'bg-teal', critical: 'bg-critical' }
  const events = [...COMMON, ...(held ? HELD : FAILED)]
  return (
    <div className="relative">
      <div className="grid grid-cols-[120px_1fr]">
        {LANES.map(lane => (
          <div key={lane} className="contents">
            <div className="flex h-12 items-center border-b border-line text-[12px] text-muted">{lane}</div>
            <div className="relative h-12 border-b border-line">
              {!held && <div className="absolute inset-y-0 bg-critical-50" style={{ left: `${(1 / STEPS) * 100 + 10}%`, width: `${(3 / STEPS) * 100 - 10}%` }} />}
              {events.filter(e => e.lane === lane).map(e => {
                const pos = (e.step / STEPS) * 100 + 10
                const flip = e.step >= 3
                return (
                  <div key={e.label} className={`absolute top-1/2 flex -translate-y-1/2 items-center gap-2 ${flip ? 'flex-row-reverse' : ''}`}
                    style={flip ? { right: `${100 - pos}%` } : { left: `${pos}%` }}>
                    <span className={`size-2.5 rounded-full ring-2 ring-white ${flip ? 'translate-x-1/2' : '-translate-x-1/2'} ${dot[e.tone]}`} />
                    <span className={`whitespace-nowrap text-[11.5px] ${e.tone === 'critical' ? 'font-medium text-critical-ink' : 'text-ink'}`}>{e.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 pl-[120px] text-[11.5px] text-muted">
        {held
          ? 'Latest check result: release was refused once the deny policy was in force.'
          : 'Shaded band: the deny policy was already in force when the approval was voted and released. Expected behaviour is re-evaluation at release and refusal.'}
      </p>
    </div>
  )
}

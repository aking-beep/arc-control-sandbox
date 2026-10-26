/**
 * Swim-lane diagram for ARC-SEC-002. Positions are ORDINAL (sequence only) —
 * no timestamps are invented. Replace with a time axis once the Phase 2 report
 * supplies approval / publication / execution times.
 */
const LANES = ['Policy', 'Approval', 'Execution', 'Meridian effect'] as const
const EVENTS: Array<{ lane: typeof LANES[number]; step: number; label: string; tone: 'neutral' | 'teal' | 'critical' }> = [
  { lane: 'Policy', step: 0, label: 'MER-FIN-001 v1 in force', tone: 'neutral' },
  { lane: 'Approval', step: 1, label: 'Request held → approved', tone: 'teal' },
  { lane: 'Policy', step: 2, label: 'New DENY policy effective', tone: 'critical' },
  { lane: 'Execution', step: 3, label: 'Approved request executed', tone: 'critical' },
  { lane: 'Meridian effect', step: 4, label: '+1 refund committed', tone: 'critical' },
]
const STEPS = 5

export function RevalidationTimeline() {
  const dot = { neutral: 'bg-navy', teal: 'bg-teal', critical: 'bg-critical' }
  return (
    <div className="relative">
      <div className="grid grid-cols-[120px_1fr]">
        {LANES.map(lane => (
          <div key={lane} className="contents">
            <div className="flex h-12 items-center border-b border-line text-[12px] text-muted">{lane}</div>
            <div className="relative h-12 border-b border-line">
              <div className="absolute inset-y-0 bg-critical-50" style={{ left: `${(2 / STEPS) * 100 + 10}%`, width: `${(1 / STEPS) * 100}%` }} />
              {EVENTS.filter(e => e.lane === lane).map(e => {
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
      <p className="mt-2 pl-[120px] text-[11.5px] text-muted">Shaded band: execution occurred after the deny policy took effect. Expected behaviour is revalidation at execution and refusal.</p>
    </div>
  )
}

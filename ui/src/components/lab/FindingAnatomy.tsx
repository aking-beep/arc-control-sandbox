import type { FindingState } from '../../lib/findings'
import { RevalidationTimeline } from './RevalidationTimeline'

const PARALLEL = 8

/**
 * Visual anatomy of each finding. Built only from what the check reports:
 * counts and sequence, never timings. Rows are numbered, not timed.
 */
export function FindingAnatomy({ state, variant = 'compact' }: { state: FindingState; variant?: 'compact' | 'full' }) {
  if (state.finding.id === 'ARC-SEC-001') {
    if (state.observedEffects === null) return <p className="text-[12px] text-muted">The latest result did not report a refund count.</p>
    const n = Math.min(PARALLEL, state.observedEffects)
    return variant === 'full' ? <FanOutTable n={PARALLEL} observed={n} /> : <DuplicateEffects n={PARALLEL} observed={n} />
  }
  if (state.finding.id === 'ARC-SEC-002') return <RevalidationTimeline held={state.checkStatus === 'PASS'} />
  return null
}

/** Expected vs observed refunds as one cell per request. */
export function DuplicateEffects({ n, observed }: { n: number; observed: number }) {
  return (
    <div className="grid grid-cols-[124px_1fr_auto] items-center gap-x-4 gap-y-2.5">
      <span className="text-[12px] text-muted">Expected refunds</span>
      <Cells n={n} filled={1} tone="ink" />
      <span className="tnum text-right text-[13px] font-semibold text-ink">1</span>
      <span className="text-[12px] text-muted">Observed refunds</span>
      <Cells n={n} filled={observed} tone="critical" firstOk />
      <span className={`tnum text-right text-[13px] font-semibold ${observed > 1 ? 'text-critical-ink' : 'text-ink'}`}>{observed}</span>
      <span />
      <p className="col-span-2 text-[11.5px] text-faint">One cell per parallel request in the failing round. Filled = a refund was committed in Meridian. Order and timing are not reported by the check.</p>
    </div>
  )
}

function Cells({ n, filled, tone, firstOk }: { n: number; filled: number; tone: 'ink' | 'critical'; firstOk?: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: n }).map((_, i) => {
        const on = i < filled
        const cls = !on ? 'border border-dashed border-line-strong bg-transparent'
          : tone === 'ink' || (firstOk && i === 0) ? 'bg-navy' : 'bg-critical'
        return <span key={i} className={`h-5 flex-1 rounded-[3px] ${cls}`} title={`Request ${i + 1}`} />
      })}
    </div>
  )
}

/** Per-request fan-out: what each of the 8 requests should have produced vs what it did. */
export function FanOutTable({ n, observed }: { n: number; observed: number }) {
  return (
    <div>
      <div className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] border-b border-line pb-2 text-[11px] font-medium text-muted">
        <span>#</span><span>Request</span><span>ARC decision</span><span>Expected</span><span>Observed in Meridian</span>
      </div>
      <ol className="divide-y divide-line">
        {Array.from({ length: n }).map((_, i) => {
          const dup = i > 0 && i < observed
          return (
            <li key={i} className={`grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] items-center py-1.5 text-[12px] ${dup ? 'bg-critical-50/40' : ''}`}>
              <span className="tnum font-mono text-faint">{i + 1}</span>
              <span className="font-mono text-[11.5px] text-ink">finance.refund $120</span>
              <span className="font-mono text-[11.5px] font-medium text-success">ALLOW</span>
              <span className="text-muted">{dup ? 'Duplicate → reuse result of #1, no effect' : 'Execute · +1 refund'}</span>
              <span className={dup ? 'font-medium text-critical-ink' : 'text-ink'}>{i === 0 ? '+1 refund' : dup ? '+1 refund (duplicate)' : 'no effect'}</span>
            </li>
          )
        })}
      </ol>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[12px]">
        <span className="text-faint">Rows are numbered, not ordered by arrival. Only the round total is reported; which request produced which refund is not.</span>
        <span className="tnum font-medium"><span className="text-muted">Total:</span> expected 1 · <span className={observed > 1 ? 'text-critical-ink' : ''}>observed {observed}</span></span>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useLiveOps } from '../../api/LiveProvider'

/** Running · Paused for tests · Paused · Not started. Links to Live Operations. */
export function LiveState({ compact = false }: { compact?: boolean }) {
  const { snapshot: s, link } = useLiveOps()
  if (!s) return compact ? null : <span className="text-[12px] text-faint">Live operations unavailable</span>
  const state = s.heldForTests && s.running ? 'tests' : s.running ? 'running' : s.day === 0 ? 'idle' : 'paused'
  const meta = {
    running: { label: compact ? 'LIVE' : `Live · day ${s.day}`, dot: 'bg-success animate-pulse', cls: 'text-success bg-success-50' },
    tests: { label: compact ? 'PAUSED · TESTS' : 'Paused while tests run', dot: 'bg-warning', cls: 'text-warning-ink bg-warning-50' },
    paused: { label: compact ? 'LIVE PAUSED' : `Paused · day ${s.day}`, dot: 'bg-neutral', cls: 'text-muted bg-neutral-50' },
    idle: { label: compact ? 'LIVE OFF' : 'Not started', dot: 'bg-neutral', cls: 'text-muted bg-neutral-50' },
  }[state]
  return (
    <Link to="/lab/live" title={`Live operations: ${meta.label}${link === 'stream' ? '' : ' (stream reconnecting)'}`}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] px-1.5 py-px font-mono text-[10.5px] font-semibold tracking-wide ${meta.cls}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />{meta.label}
    </Link>
  )
}

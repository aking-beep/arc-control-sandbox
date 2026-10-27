/** Horizontal percentile bars, scaled to the run's own p99. Drawn only from returned data. */
export function LatencyBars({ p50, p95, p99 }: { p50: number; p95: number; p99: number }) {
  const max = Math.max(p99, 1)
  const rows = [['p50', p50], ['p95', p95], ['p99', p99]] as const
  return (
    <div className="space-y-2.5">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[36px_1fr_64px] items-center gap-3">
          <span className="font-mono text-[11.5px] text-muted">{k}</span>
          <div className="h-2 rounded-sm bg-neutral-50">
            <div className="h-full rounded-sm bg-teal" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="tnum text-right font-mono text-[12px] text-ink">{v} ms</span>
        </div>
      ))}
    </div>
  )
}

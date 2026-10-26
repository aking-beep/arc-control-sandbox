import { AlertTriangle, RotateCw, X } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { getApiBase } from '../../api/client'

/** Shown when the Meridian server cannot be reached, and for failed actions. Never hides recorded/baseline data. */
export function ConnectionBanner() {
  const { health, refresh, lastError, clearError } = useData()
  const down = health.status === 'unreachable' || health.status === 'error'
  if (!down && !lastError) return null

  return (
    <div className="space-y-2 px-8 pt-4">
      {down && (
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning-50 px-4 py-2.5 text-[12.5px]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-ink" />
          <div className="min-w-0 flex-1 text-ink">
            <span className="font-medium">Meridian server not reachable</span>
            <span className="text-muted"> at <span className="font-mono text-[12px]">{getApiBase() || 'same origin'}</span>. Live values are unavailable; recorded, baseline and repository values remain visible and labelled. Start it with <span className="font-mono text-[12px]">npm start</span> (port 8890).</span>
          </div>
          <button onClick={() => refresh()} className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[12px] font-medium text-warning-ink transition-colors duration-150 hover:bg-warning/15">
            <RotateCw className="size-3.5" /> Retry
          </button>
        </div>
      )}
      {lastError && (
        <div className="flex items-start gap-3 rounded-md border border-critical/30 bg-critical-50 px-4 py-2.5 text-[12.5px]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical-ink" />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-ink">{lastError.action} did not complete.</span>{' '}
            <span className="font-mono text-[12px] text-critical-ink">{lastError.kind}</span>
            <span className="text-muted"> · {lastError.message}. No result was recorded.</span>
          </div>
          <button onClick={clearError} aria-label="Dismiss" className="rounded p-1 text-muted transition-colors duration-150 hover:text-ink"><X className="size-3.5" /></button>
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { FileText, AlertCircle, Radio } from 'lucide-react'
import { useLab } from '../lib/LabData'
import { REPORT } from '../data/report'

export function ModeBanner() {
  const { mode, lastError } = useLab()
  return (
    <>
      {mode === 'fixture' && (
        <div className="flex items-center gap-2 border-b border-warn/20 bg-warn-bg px-6 py-2 text-[12px] text-warn">
          <FileText size={13} className="shrink-0" />
          <span className="font-semibold">Design fixture</span>
          <span className="text-warn/90">
            — backend unreachable. Values transcribed from <span className="font-mono">{REPORT.source}</span> @{' '}
            <span className="font-mono">{REPORT.repoCommit}</span>. Not a live run; execution disabled.
          </span>
        </div>
      )}
      {mode === 'live' && (
        <div className="flex items-center gap-2 border-b border-line bg-surface px-6 py-2 text-[12px] text-muted">
          <Radio size={13} className="text-teal-600" />
          <span className="font-semibold text-ink">Live</span>
          <span>— results come from this Meridian process via /api/*. Unrun checks show as not run, never as passing.</span>
        </div>
      )}
      {lastError && (
        <div className="flex items-center gap-2 border-b border-fail-line bg-fail-bg px-6 py-2 text-[12px] text-fail">
          <AlertCircle size={13} />
          {lastError}
        </div>
      )}
    </>
  )
}

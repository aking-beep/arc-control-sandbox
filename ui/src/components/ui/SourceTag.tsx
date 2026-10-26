import { formatDistanceToNowStrict } from 'date-fns'
import type { DataSource } from '../../api/types'

const META: Record<DataSource, { label: string; cls: string; title: string }> = {
  live: { label: 'LIVE', cls: 'text-success bg-success-50', title: 'Fetched from the running Meridian server in this session' },
  recorded: { label: 'RECORDED', cls: 'text-teal-ink bg-mint-50', title: 'Loaded from a saved report file (reports/*.json)' },
  baseline: { label: 'BASELINE', cls: 'text-warning-ink bg-warning-50', title: 'Committed measurement (docs/PHASE_2_READINESS.md); not re-run in this session' },
  repository: { label: 'REPO', cls: 'text-navy bg-neutral-50', title: 'Read from repository source (start.mjs / scenarios.mjs), not from the running system' },
  illustrative: { label: 'ILLUSTRATIVE', cls: 'text-muted bg-neutral-50 ring-1 ring-inset ring-line-strong', title: 'Preview fixture. Not real data. Replaced automatically when the backend supplies it.' },
  proposed: { label: 'PROPOSED API', cls: 'text-muted bg-neutral-50 ring-1 ring-inset ring-dashed ring-line-strong', title: 'Requires a sandbox endpoint that does not exist yet' },
}

/** Every number on screen carries one of these. */
export function SourceTag({ source, at, note }: { source: DataSource; at?: string; note?: string }) {
  const m = META[source]
  return (
    <span className="inline-flex items-center gap-1.5" title={note ?? m.title}>
      <span className={`rounded-[3px] px-1 py-px font-mono text-[10px] font-semibold tracking-wide ${m.cls}`}>{m.label}</span>
      {at && <span className="font-mono text-[11px] text-faint">{formatDistanceToNowStrict(new Date(at), { addSuffix: true })}</span>}
    </span>
  )
}

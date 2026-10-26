import type { AssuranceStatus, ResultStatus, VerificationState } from '../../api/types'

const RESULT: Record<ResultStatus, { label: string; cls: string; dot: string }> = {
  PASS: { label: 'PASS', cls: 'bg-success-50 text-success', dot: 'bg-success' },
  FAIL: { label: 'FAIL', cls: 'bg-critical-50 text-critical-ink', dot: 'bg-critical' },
  ERROR: { label: 'ERROR', cls: 'bg-warning-50 text-warning-ink', dot: 'bg-warning' },
  RUNNING: { label: 'RUNNING', cls: 'bg-mint-50 text-teal-ink', dot: 'bg-teal animate-pulse' },
  NOT_RUN: { label: 'NOT RUN', cls: 'bg-neutral-50 text-muted', dot: 'bg-neutral' },
  UNSUPPORTED: { label: 'UNSUPPORTED', cls: 'bg-neutral-50 text-muted ring-1 ring-inset ring-dashed ring-line-strong', dot: 'border border-neutral bg-transparent' },
  NOT_IMPLEMENTED: { label: 'NOT IMPLEMENTED', cls: 'bg-neutral-50 text-muted ring-1 ring-inset ring-line-strong', dot: 'border border-neutral bg-transparent' },
}

export function StatusBadge({ status, size = 'sm' }: { key?: string; status: ResultStatus; size?: 'sm' | 'md' }) {
  const s = RESULT[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded font-mono font-medium tracking-tight ${size === 'md' ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[11px]'} ${s.cls}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

const ASSURANCE: Record<AssuranceStatus, { cls: string; dot: string }> = {
  pass: { cls: 'bg-success-50 text-success', dot: 'bg-success' },
  fail: { cls: 'bg-critical-50 text-critical-ink', dot: 'bg-critical' },
  not_assessable: { cls: 'bg-neutral-50 text-muted ring-1 ring-inset ring-line-strong', dot: 'border border-neutral' },
  not_applicable: { cls: 'bg-neutral-50 text-faint', dot: 'bg-line-strong' },
  attested: { cls: 'bg-warning-50 text-warning-ink', dot: 'bg-warning' },
}

export function AssuranceBadge({ status }: { key?: string; status: AssuranceStatus }) {
  const s = ASSURANCE[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[11px] font-medium ${s.cls}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  )
}

const VERIFY: Record<VerificationState, { label: string; cls: string }> = {
  internally_verified: { label: 'Internally verified', cls: 'bg-mint-50 text-teal-ink' },
  externally_anchored: { label: 'Externally anchored', cls: 'bg-success-50 text-success' },
  failed: { label: 'Failed', cls: 'bg-critical-50 text-critical-ink' },
  not_assessable: { label: 'Not assessable', cls: 'bg-neutral-50 text-muted ring-1 ring-inset ring-line-strong' },
}

export function VerificationBadge({ state, dim }: { key?: string; state: VerificationState; dim?: boolean }) {
  const s = VERIFY[state]
  return <span className={`inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${s.cls} ${dim ? 'opacity-50' : ''}`}>{s.label}</span>
}

export const RESULT_COLOR: Record<ResultStatus, string> = {
  PASS: 'var(--color-success)', FAIL: 'var(--color-critical)', ERROR: 'var(--color-warning)', RUNNING: 'var(--color-teal)',
  NOT_RUN: 'var(--color-line-strong)', UNSUPPORTED: 'var(--color-neutral)', NOT_IMPLEMENTED: 'var(--color-neutral)',
}

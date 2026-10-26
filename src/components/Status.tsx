import React from 'react'
import type { DecisionEffect } from '../data/actions'
import type { Provenance } from '../lib/types'

export type StatusKey =
  | 'pass'
  | 'fail'
  | 'limitation'
  | 'unsupported'
  | 'not_implemented'
  | 'not_run'
  | 'not_assessable'
  | 'not_applicable'
  | 'attested'
  | 'unattributed'

const STATUS: Record<StatusKey, { label: string; cls: string; dot: string }> = {
  pass: { label: 'Pass', cls: 'bg-pass-bg text-pass', dot: 'bg-pass' },
  fail: { label: 'Fail', cls: 'bg-fail-bg text-fail', dot: 'bg-fail' },
  limitation: { label: 'Limitation reproduced', cls: 'bg-warn-bg text-warn', dot: 'bg-warn' },
  unsupported: { label: 'Unsupported', cls: 'bg-gap-bg text-gap ring-1 ring-inset ring-line-strong', dot: 'bg-gap' },
  not_implemented: { label: 'Not implemented', cls: 'bg-surface text-gap border border-dashed border-line-strong', dot: 'bg-line-strong' },
  not_run: { label: 'Not run', cls: 'bg-surface text-subtle ring-1 ring-inset ring-line', dot: 'bg-line-strong' },
  not_assessable: { label: 'Not assessable', cls: 'bg-gap-bg text-gap', dot: 'bg-gap' },
  not_applicable: { label: 'Not applicable', cls: 'bg-surface text-gap ring-1 ring-inset ring-line-strong', dot: 'bg-line-strong' },
  attested: { label: 'Attested', cls: 'bg-gap-bg text-gap', dot: 'bg-gap' },
  unattributed: { label: 'Pass or fail', cls: 'bg-surface text-subtle ring-1 ring-inset ring-line', dot: 'bg-line-strong' },
}

export function StatusPill({ status, label }: { status: StatusKey; label?: string }) {
  const s = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-[3px] text-[11.5px] font-medium leading-none ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label ?? s.label}
    </span>
  )
}

export function statusDot(status: StatusKey) {
  return STATUS[status].dot
}

const DECISION: Record<DecisionEffect, { label: string; cls: string }> = {
  ALLOW: { label: 'ALLOW', cls: 'bg-pass-bg text-pass' },
  REQUIRE_APPROVAL: { label: 'REQUIRE_APPROVAL', cls: 'bg-warn-bg text-warn' },
  DENY: { label: 'DENY', cls: 'bg-fail-bg text-fail' },
  REFUSED: { label: 'REFUSED', cls: 'bg-gap-bg text-navy-800' },
}

export function DecisionChip({ effect, size = 'sm' }: { effect: DecisionEffect; size?: 'sm' | 'lg' }) {
  const d = DECISION[effect]
  return (
    <span className={`inline-flex rounded font-mono font-medium ${d.cls} ${size === 'lg' ? 'px-2 py-1 text-[13px]' : 'px-1.5 py-0.5 text-[11px]'}`}>
      {d.label}
    </span>
  )
}

export function ProvenanceTag({ provenance }: { provenance: Provenance }) {
  return provenance === 'live' ? (
    <span className="inline-flex items-center gap-1 rounded border border-teal-600/30 bg-teal-50 px-1.5 py-[1px] text-[10.5px] font-medium text-teal-700">Live</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded border border-warn/25 bg-warn-bg px-1.5 py-[1px] text-[10.5px] font-medium text-warn">Recorded fixture</span>
  )
}

export function SeverityTag({ severity }: { severity: 'High' | 'Medium' | 'Low' }) {
  const cls = severity === 'High' ? 'bg-fail text-white' : severity === 'Medium' ? 'bg-warn-bg text-warn' : 'bg-gap-bg text-gap'
  return <span className={`inline-flex rounded px-1.5 py-[3px] text-[11px] font-semibold leading-none ${cls}`}>{severity}</span>
}

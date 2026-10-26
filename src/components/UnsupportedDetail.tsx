import React from 'react'
import { Link } from 'react-router-dom'
import { StatusPill } from './Status'
import { PHASE2_CATALOGUE } from '../data/phase2'

export function UnsupportedDetail({ item }: { item: { id: string; title: string; why: string } }) {
  const spec = PHASE2_CATALOGUE.find((s) => s.id === item.id)
  return (
    <div className="max-w-[760px] px-8 py-7">
      <div className="flex items-center gap-2">
        <StatusPill status="unsupported" />
        <span className="font-mono text-[11.5px] text-subtle">{item.id}</span>
      </div>
      <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-navy-900">{item.title}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{item.why}</p>
      <div className="mt-6 border-t border-line pt-5 text-[13px] leading-relaxed text-ink">
        <h3 className="mb-1.5 text-[13px] font-semibold text-navy-900">Why this is not a pass</h3>
        <p className="text-muted">
          There is no product surface in this ARC build to pass or fail. The check is kept in the Phase 2 catalogue as{' '}
          <span className="font-mono text-[12px]">kind: unsupported</span> so the gap stays visible in every report.
        </p>
        {spec?.reason && (
          <blockquote className="mt-4 border-l-2 border-line-strong pl-4 text-[12.5px] text-muted">
            <span className="font-mono text-[11px] text-subtle">src/phase2.mjs · reason</span>
            <div className="mt-1">{spec.reason}</div>
          </blockquote>
        )}
        <Link to="/scenarios?tab=phase2&result=unsupported" className="mt-5 inline-block text-[12.5px] font-medium text-teal-700 hover:text-teal-600">
          View all unsupported checks in Scenario Lab →
        </Link>
      </div>
    </div>
  )
}

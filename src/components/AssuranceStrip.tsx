import React from 'react'
import { SectionTitle } from './PageHeader'
import { ProvenanceTag, StatusPill, statusDot } from './Status'
import { ASSURANCE_CONTROLS, ASSURANCE_FAIL_CONTEXT, ASSURANCE_TOTALS } from '../data/report'
import type { AssuranceStatus } from '../lib/types'

const ORDER: AssuranceStatus[] = ['pass', 'fail', 'not_assessable', 'not_applicable', 'attested']

export function AssuranceStrip() {
  return (
    <section>
      <SectionTitle
        aside={
          <span className="flex items-center gap-2">
            <ProvenanceTag provenance="recorded" /> POST /v1/assurance/runs · GET /v1/assurance/summary
          </span>
        }
      >
        ARC Assurance — reported separately, never summed into a score
      </SectionTitle>

      <div className="rounded-lg border border-line bg-surface">
        <div className="grid grid-cols-5 divide-x divide-line border-b border-line">
          {ORDER.map((k) => (
            <div key={k} className="px-4 py-3">
              <StatusPill status={k} />
              <div className={`tnum mt-2 text-[22px] font-semibold tracking-tight ${k === 'fail' ? 'text-fail' : 'text-navy-900'}`}>{ASSURANCE_TOTALS[k]}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-9 divide-x divide-line">
          {ASSURANCE_CONTROLS.map((c) => (
            <div key={c.id} className="group relative px-3 py-3" title={c.note}>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot(c.status === 'unattributed' ? 'unattributed' : c.status)}`} />
                <span className="font-mono text-[11px] text-ink">{c.id.replace('ARC-AI-', 'AI-')}</span>
              </div>
              <div className="mt-1 text-[11px] leading-snug text-subtle">
                {c.status === 'unattributed' ? 'pass/fail' : c.status.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-subtle">
        The report names statuses only for ARC-AI-006, -007 and -009. The 3 pass / 3 fail split across the other six controls was not recorded per
        control, so it is not attributed here. {ASSURANCE_FAIL_CONTEXT}
      </p>
    </section>
  )
}

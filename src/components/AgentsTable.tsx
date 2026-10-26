import React from 'react'
import { SectionTitle } from './PageHeader'
import { AGENTS } from '../data/report'

const TONE = {
  allow: 'bg-pass-bg text-pass',
  hold: 'bg-warn-bg text-warn',
  deny: 'bg-fail-bg text-fail',
}

export function AgentsTable() {
  return (
    <section>
      <SectionTitle aside="Seeded by src/start.mjs · deterministic, not LLM-driven">Agent identities</SectionTitle>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-canvas text-[11.5px] text-subtle">
              <th className="px-4 py-2 font-medium">Agent</th>
              <th className="px-3 py-2 font-medium">Tool</th>
              <th className="px-3 py-2 font-medium">Policy</th>
              <th className="px-3 py-2 font-medium">Enforcement profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {AGENTS.map((a) => (
              <tr key={a.name}>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-ink">{a.name}</div>
                  <div className="text-[11.5px] text-subtle">{a.department}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-mono text-[11.5px] text-ink">{a.tool}</div>
                  <div className="text-[11px] text-subtle">
                    {a.effect} · {a.tier}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-[11.5px] text-muted">{a.policyId}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {a.profile.map((p) => (
                      <span key={p.label} className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${TONE[p.tone]}`}>
                        {p.label}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

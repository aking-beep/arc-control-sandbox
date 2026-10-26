import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Empty } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { buildDepartments } from './departments'
import { POLICIES } from '../../data/registry'
import { fmtTime } from '../../lib/status'

export function EnterpriseOverview() {
  const { state } = useData()
  const s = state.data
  const depts = Object.values(buildDepartments(s))
  const counts: Record<string, number> = {
    finance: s?.refunds.length ?? 0, support: s?.tickets.length ?? 0, sales: s?.exports.length ?? 0,
    hr: s?.employees.length ?? 0, it: s?.deployments.length ?? 0, security: s?.quarantines.length ?? 0,
  }
  const unit: Record<string, string> = { finance: 'refunds', support: 'tickets', sales: 'exports', hr: 'employees on record', it: 'deployments', security: 'quarantines' }

  return (
    <>
      <PageHeader title="Enterprise Overview"
        description="Meridian Commerce Group’s internal operations. Six departments, each with one AI agent governed by an ARC policy. Business data is fictional and resettable."
        meta={<SourceTag source={state.status === 'live' ? 'live' : 'illustrative'} at={state.fetchedAt} note={state.status === 'live' ? undefined : 'Meridian unreachable — live counts unavailable'} />} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title="Departments" pad={false}>
          <ul className="divide-y divide-line">
            {depts.map(d => {
              const p = POLICIES.find(x => x.id === d.policyId)!
              const effects = [...new Set(p.rules.filter(r => r.id !== 'different-agent').map(r => r.effect.toLowerCase().replace('_', ' ')))].join(' / ')
              return (
                <li key={d.id}>
                  <Link to={`/enterprise/${d.id}`} className="group grid grid-cols-[180px_1fr_140px_16px] items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-canvas">
                    <span className="text-[13.5px] font-medium text-ink">{d.name}</span>
                    <span className="min-w-0 text-[12px] text-muted"><span className="font-mono text-teal-ink">{d.tool}</span> · {effects}</span>
                    <span className="text-right text-[12px] text-muted">{state.status === 'live' ? <><span className="tnum font-semibold text-ink">{counts[d.id]}</span> {unit[d.id]}</> : '—'}</span>
                    <ChevronRight className="size-3.5 text-faint transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>

        <Section title="Committed business activity" aside={<SourceTag source="live" at={state.fetchedAt} />} pad={false}>
          {!s?.mutationLog.length ? <Empty title="No committed changes">Changes appear only after ARC authorizes an action and the connector reaches Meridian.</Empty> : (
            <ul className="divide-y divide-line">{[...s.mutationLog].reverse().slice(0, 8).map((m, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-44 font-mono text-[11.5px] text-teal-ink">{m.tool}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted">{JSON.stringify(m.parameters)}</span>
                <span className="font-mono text-[11px] text-faint">{fmtTime(m.at)}</span>
              </li>
            ))}</ul>
          )}
        </Section>
      </div>
    </>
  )
}

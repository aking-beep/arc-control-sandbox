import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Empty } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { buildDepartments } from './departments'
import { POLICIES } from '../../data/registry'
import { fmtTime } from '../../lib/status'
import { useLiveOps } from '../../api/LiveProvider'
import { LiveFeed } from '../../components/lab/LiveFeed'
import { LiveState } from '../../components/lab/LiveState'

export function EnterpriseOverview() {
  const { state } = useData()
  const { events } = useLiveOps()
  const s = state.data
  // A long live day sends only recent rows; totals carry the full counts.
  const total = (key: keyof NonNullable<typeof s>, rows?: unknown[]) => s?.totals?.[key as string] ?? rows?.length ?? 0
  const depts = Object.values(buildDepartments(s))
  const counts: Record<string, number> = {
    finance: total('refunds', s?.refunds), support: total('tickets', s?.tickets), sales: total('exports', s?.exports),
    hr: total('employees', s?.employees), it: total('deployments', s?.deployments), security: total('quarantines', s?.quarantines),
  }
  const unit: Record<string, string> = { finance: 'refunds', support: 'tickets', sales: 'exports', hr: 'employees on record', it: 'deployments', security: 'quarantines' }

  return (
    <>
      <PageHeader title="Enterprise Overview"
        description="Meridian Commerce Group’s internal operations. Six departments, each with one AI agent governed by an ARC policy. Business data is fictional and resettable."
        meta={<SourceTag source={state.status === 'live' ? 'live' : 'illustrative'} at={state.fetchedAt} note={state.status === 'live' ? undefined : 'Meridian unreachable — live counts unavailable'} />} />

      <Section className="mb-5" title={<span className="flex items-center gap-2">Agents at work <LiveState compact /></span>} pad={false}
        aside={<Link to="/lab/live" className="text-[12px] font-medium text-teal-ink hover:underline">Live Operations →</Link>}>
        <LiveFeed events={events} limit={8} empty="Live operations are not running. Start them from Live Operations to watch the agents work." />
      </Section>

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

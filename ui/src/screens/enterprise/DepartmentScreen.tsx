import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Tabs, Button, Empty } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { RecordTable } from '../../components/enterprise/RecordTable'
import { buildDepartments } from './departments'
import { ORIGINAL } from '../../data/catalog'
import { decisionOf, fmtTime, runStatus } from '../../lib/status'
import { useLiveOps } from '../../api/LiveProvider'
import { LiveFeed } from '../../components/lab/LiveFeed'
import { LiveState } from '../../components/lab/LiveState'

export function DepartmentScreen() {
  const { dept } = useParams()
  const { state, runs, running, runScenario, health, latestRunById } = useData()
  const { events } = useLiveOps()
  const depts = useMemo(() => buildDepartments(state.data), [state.data])
  const d = dept ? depts[dept] : undefined
  const [tab, setTab] = useState<string | null>(null)
  if (!d) return <Navigate to="/enterprise" replace />
  const active = d.tabs.find(t => t.id === tab) ?? d.tabs[0]
  const live = health.status === 'live' && health.data?.gatewayConfigured === true

  const toolScenarios = new Set(ORIGINAL.filter(s => s.tool === d.tool).map(s => s.id))
  const agentActions = (d.id === 'security'
    ? runs.filter(r => decisionOf(r)?.decision === 'DENY')
    : runs.filter(r => toolScenarios.has(r.id))).slice().reverse()
  const committed = (state.data?.mutationLog ?? []).filter(m => m.tool === d.tool).slice().reverse()

  return (
    <>
      <PageHeader title={d.name} description={d.description}
        meta={<><SourceTag source={state.status === 'live' ? 'live' : 'illustrative'} at={state.fetchedAt} /><span className="text-[12px] text-muted">Governed by <Link to={`/lab/policies?policy=${d.policyId}`} className="font-mono text-teal-ink hover:underline">{d.policyId}</Link> · tool <span className="font-mono">{d.tool}</span></span></>} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="rounded-lg border border-line bg-surface">
            <div className="px-4 pt-1"><Tabs value={active.id} onChange={setTab} items={d.tabs.map(t => ({ id: t.id, label: t.label, count: t.rows.filter(r => r.__source === 'live').length }))} /></div>
            {active.note && <p className="border-b border-line bg-canvas/60 px-4 py-2 text-[12px] text-muted">{active.note}</p>}
            {state.status === 'loading' ? <div className="p-6 text-[13px] text-muted">Loading records…</div> : <RecordTable cols={active.cols} rows={active.rows} empty={`No ${active.label.toLowerCase()} recorded`} />}
          </div>

          <Section className="mt-5" title={<span className="flex items-center gap-2">Live agent activity <LiveState compact /></span>} pad={false}
            aside={<Link to="/lab/live" className="text-[12px] font-medium text-teal-ink hover:underline">All departments →</Link>}>
            <LiveFeed events={events.filter(e => e.department === d.id || (d.id === 'support' && e.kind === 'inbound'))} limit={8}
              empty={`No live activity for ${d.name} yet. Start Live Operations to watch ${d.tool.split('.')[0]}-agent work.`} />
          </Section>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Section title={d.id === 'security' ? 'Access violations (ARC denials)' : 'Agent actions · ARC decisions'} aside={<SourceTag source="live" />} pad={false}>
              {agentActions.length === 0 ? <Empty title="None this session" /> : (
                <ul className="divide-y divide-line">{agentActions.slice(0, 6).map((r, i) => {
                  const dd = decisionOf(r)
                  return (
                    <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-28 font-mono text-[11.5px] font-medium ${dd?.decision === 'DENY' ? 'text-critical-ink' : dd?.decision === 'ALLOW' ? 'text-success' : 'text-warning-ink'}`}>{dd?.decision ?? `HTTP ${dd?.httpStatus ?? '—'}`}</span>
                      <Link to={`/lab/inspector?run=${r.id}`} className="min-w-0 flex-1 truncate text-[12.5px] hover:underline">{r.label}</Link>
                      <span className="font-mono text-[11px] text-faint">{fmtTime(r.at)}</span>
                    </li>
                  )
                })}</ul>
              )}
            </Section>
            <Section title="Committed business changes" aside={<SourceTag source="live" />} pad={false}>
              {committed.length === 0 ? <Empty title="No committed changes">Nothing has reached Meridian for {d.tool}.</Empty> : (
                <ul className="divide-y divide-line">{committed.slice(0, 6).map((m, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-[11.5px]">{JSON.stringify(m.parameters)}</span>
                    <span className="font-mono text-[11px] text-faint">{fmtTime(m.at)}</span>
                  </li>
                ))}</ul>
              )}
            </Section>
          </div>
        </div>

        <aside className="space-y-5">
          <Section title={<span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-teal" />Governed actions</span>}>
            {d.actions.length === 0 ? <p className="text-[12.5px] leading-relaxed text-muted">{d.noActionNote}</p> : (
              <ul className="space-y-3">
                {d.actions.map(a => {
                  const r = latestRunById.get(a.scenarioId)
                  return (
                    <li key={a.scenarioId} className="rounded-md border border-line p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-medium text-ink">{a.label}</span>
                        <StatusBadge status={runStatus(r, running.has(a.scenarioId))} />
                      </div>
                      <p className="mt-1 text-[12px] text-muted">{a.detail}</p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <Button className="h-7 px-2.5 text-[12px]" loading={running.has(a.scenarioId)} disabled={!live} onClick={() => runScenario(a.scenarioId)}>Submit through ARC</Button>
                        {r && <Link to={`/lab/inspector?run=${a.scenarioId}`} className="text-[12px] font-medium text-teal-ink hover:underline">Inspect →</Link>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-3 text-[11.5px] leading-relaxed text-faint">Actions run the matching server-side scenario, which uses the agent’s key on the server. The browser never writes business data directly.</p>
          </Section>
          <Section title="Approval queue">
            <p className="text-[12.5px] leading-relaxed text-muted">Held requests are approved in the ARC Console, not here. Operator identity in ARC 2.0 is header-asserted, so this UI does not present itself as an authenticated approver.</p>
          </Section>
        </aside>
      </div>
    </>
  )
}

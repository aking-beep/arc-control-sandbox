import { useData } from '../../api/DataProvider'
import { useReports } from '../../api/ReportsProvider'
import { usePhase2 } from '../../api/Phase2Provider'
import { PageHeader, Section, KV, Button } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { fmtTime } from '../../lib/status'
import type { Resource } from '../../api/types'

export function EnvironmentHealth() {
  const { health, state, scenarios, refresh } = useData()
  const { index, integration, phase2: phase2File, refresh: refreshReports } = useReports()
  const phase2 = usePhase2()

  // Every read the browser makes. The sandbox holds the operator token, the
  // agent API keys and the connector token; none of them reach this page.
  const rows: Array<{ name: string; r: Resource<unknown>; note?: string }> = [
    { name: 'GET /api/health', r: health },
    { name: 'GET /api/state', r: state },
    { name: 'GET /api/scenarios', r: scenarios },
    { name: 'GET /api/phase2', r: phase2.catalogue },
    { name: 'GET /api/reports', r: index },
    { name: 'GET /api/reports/latest', r: integration, note: 'npm run validate' },
    { name: 'GET /api/reports/phase2', r: phase2File, note: 'npm run phase2' },
  ]
  const dot = (s: string) => s === 'live' ? 'bg-success' : s === 'loading' ? 'bg-line-strong' : s === 'empty' ? 'bg-warning' : 'bg-critical'
  const report = phase2File.data

  return (
    <>
      <PageHeader
        title="Environment Health"
        description="Raw reachability of the sandbox endpoints. Reachability says nothing about whether controls work — a green dot here is not a passing control."
        actions={<Button onClick={() => { refresh(); refreshReports() }}>Re-check</Button>}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Endpoint checks" pad={false}>
          <ul className="divide-y divide-line">{rows.map(x => (
            <li key={x.name} className="flex items-center gap-3 px-4 py-3">
              <span className={`size-2 shrink-0 rounded-full ${dot(x.r.status)}`} />
              <span className="min-w-0 font-mono text-[12px]">{x.name}{x.note && <span className="ml-1.5 text-[11px] text-faint">{x.note}</span>}</span>
              <span className="ml-auto font-mono text-[11.5px] text-muted">{x.r.status}</span>
              <span className="w-32 shrink-0 text-right font-mono text-[11px] text-faint">{fmtTime(x.r.fetchedAt)}</span>
            </li>
          ))}</ul>
          <div className="border-t border-line px-4 py-3 text-[12px] text-muted">
            <span className="font-medium text-ink">empty</span> means the route works but the run that produces its data has not happened. It is not an error and not a zero result.
          </div>
          {rows.filter(x => x.r.status === 'unreachable' || x.r.status === 'error').map(x => (
            <div key={x.name} className="border-t border-line px-4 py-2 font-mono text-[11.5px] text-critical-ink">{x.name} — {x.r.error}</div>
          ))}
        </Section>

        <div className="space-y-5">
          <Section title="Reported environment" aside={<SourceTag source={health.status === 'live' ? 'live' : 'repository'} at={health.fetchedAt} />}>
            <dl>
              <KV k="Mode" mono>{health.data?.mode ?? '—'}</KV>
              <KV k="Gateway configured" mono>{health.data ? String(health.data.gatewayConfigured) : '—'}</KV>
              <KV k="Binding" mono>127.0.0.1 only (start.mjs)</KV>
              <KV k="Store">In-memory, resettable. Restarting drops approvals and the audit chain.</KV>
              <KV k="Polling">Every 20 s</KV>
              <KV k="Credentials">Operator token, agent API keys and the connector token stay server-side</KV>
            </dl>
          </Section>

          <Section title="Revisions under test" aside={<SourceTag source={report ? 'recorded' : 'repository'} at={report?.generatedAt} />}>
            {report ? (
              <dl>
                <KV k="Sandbox" mono>{report.revisions.sandbox ?? 'unrecorded'}</KV>
                <KV k="ARC Control" mono>{report.revisions.arcControl ?? 'unrecorded'}</KV>
                <KV k="Node" mono>{report.node}</KV>
                <KV k="Report generated" mono>{fmtTime(report.generatedAt)}</KV>
              </dl>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-muted">
                The sandbox exposes no version endpoint, so revisions are known only from a generated report. Run <span className="font-mono">npm run phase2</span> to record the sandbox and ARC Control commits that the results were measured against.
              </p>
            )}
          </Section>

          <Section title="Phase 2 coverage" aside={<SourceTag source={phase2.catalogue.status === 'live' ? 'live' : 'repository'} at={phase2.catalogue.fetchedAt} />}>
            {phase2.summary ? (
              <dl>
                <KV k="Catalogue" mono>{phase2.summary.total} checks</KV>
                <KV k="Executable" mono>{phase2.summary.implemented}</KV>
                <KV k="Run in this window" mono>{phase2.summary.covered}{phase2.summary.complete ? ' (complete)' : ' (partial)'}</KV>
                <KV k="Failing" mono>{phase2.summary.covered ? String(phase2.summary.fail) : 'not measured'}</KV>
                <KV k="No surface to test" mono>{phase2.summary.unsupported} unsupported · {phase2.summary.notImplemented} not implemented</KV>
              </dl>
            ) : (
              <p className="text-[12.5px] text-muted">GET /api/phase2 unavailable — {phase2.catalogue.error ?? 'loading'}.</p>
            )}
          </Section>
        </div>
      </div>
    </>
  )
}

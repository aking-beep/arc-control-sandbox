import { useData } from '../../api/DataProvider'
import { PageHeader, Section, KV, Button } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { fmtTime } from '../../lib/status'

export function EnvironmentHealth() {
  const { health, state, scenarios, phase2, refresh } = useData()
  const rows = [
    { name: 'GET /api/health', r: health },
    { name: 'GET /api/state', r: state },
    { name: 'GET /api/scenarios', r: scenarios },
    { name: 'GET /api/phase2', r: phase2 },
  ]
  return (
    <>
      <PageHeader title="Environment Health" description="Raw reachability of the sandbox endpoints. Reachability says nothing about whether controls work." actions={<Button onClick={() => refresh()}>Re-check</Button>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Endpoint checks" pad={false}>
          <ul className="divide-y divide-line">{rows.map(x => (
            <li key={x.name} className="flex items-center gap-3 px-4 py-3">
              <span className={`size-2 rounded-full ${x.r.status === 'live' ? 'bg-success' : x.r.status === 'loading' ? 'bg-line-strong' : 'bg-critical'}`} />
              <span className="font-mono text-[12px]">{x.name}</span>
              <span className="ml-auto font-mono text-[11.5px] text-muted">{x.r.status}</span>
              <span className="w-32 text-right font-mono text-[11px] text-faint">{fmtTime(x.r.fetchedAt)}</span>
            </li>
          ))}</ul>
          {rows.some(x => x.r.error) && <div className="border-t border-line px-4 py-3 font-mono text-[11.5px] text-critical-ink">{rows.find(x => x.r.error)?.r.error}</div>}
        </Section>
        <Section title="Reported environment" aside={<SourceTag source={health.status === 'live' ? 'live' : 'repository'} />}>
          <dl>
            <KV k="Mode" mono>{health.data?.mode ?? '—'}</KV>
            <KV k="Gateway configured" mono>{health.data ? String(health.data.gatewayConfigured) : '—'}</KV>
            <KV k="Phase 2 runner" mono>{health.data ? String(health.data.phase2Configured ?? 'not reported') : '—'}</KV>
            <KV k="Binding" mono>127.0.0.1 only (start.mjs)</KV>
            <KV k="Store">In-memory, resettable</KV>
            <KV k="Polling">Every 20 s</KV>
            <KV k="Served from" mono>Meridian :8890 (ui/dist) or Vite :5173 (proxy)</KV>
          </dl>
        </Section>
      </div>
    </>
  )
}

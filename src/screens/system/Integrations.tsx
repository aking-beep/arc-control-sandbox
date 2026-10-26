import { ArrowUpRight } from 'lucide-react'
import { PageHeader, Section, Th, Td } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { PROPOSED_ROUTES } from '../../api/client'
import { ENDPOINTS } from '../../data/registry'

const EXISTING = [
  ['GET /api/health', 'Service status, gatewayConfigured', 'Status strip, Environment Health'],
  ['GET /api/state', 'Business fixtures + mutation log + last 40 runs', 'Enterprise OS, effects, Evidence'],
  ['GET /api/scenarios', '17 specs + last 30 runs', 'Scenario Lab, Command Center, Inspector'],
  ['POST /api/scenarios/:id', 'Run one scenario', 'Scenario Lab, Fault Injection, department actions'],
  ['POST /api/scenarios/all', 'Run all 17 sequentially', 'Command Center, Scenario Lab'],
  ['POST /api/load', 'Stress run {count, concurrency}', 'Stress Lab'],
  ['POST /api/assurance', 'ARC assurance run + summary', 'ARC Assurance'],
  ['POST /api/reset', 'Reset Meridian fixtures (ARC audit kept)', 'Settings'],
]

export function Integrations() {
  return (
    <>
      <PageHeader title="Integrations" description="How the browser, Meridian and ARC Control connect. The browser only talks to Meridian; agent keys, the operator token and the connector token stay on the server." />
      <div className="mb-5 grid gap-5 md:grid-cols-3">
        {[['Meridian server', ENDPOINTS.meridian, 'Business state, scenario runner, stress runner'], ['ARC Control API', ENDPOINTS.arcApi, 'Gateway + policy engine (server-side access only)'], ['ARC Control Console', ENDPOINTS.arcConsole, 'Approvals, policy management']].map(([n, u, d]) => (
          <Section key={n} title={n}>
            <div className="font-mono text-[12px] text-ink">{u}</div>
            <p className="mt-1 text-[12px] text-muted">{d}</p>
            {n === 'ARC Control Console' && <a href={u} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-teal-ink hover:underline">Open <ArrowUpRight className="size-3" /></a>}
          </Section>
        ))}
      </div>
      <Section title="Existing Meridian endpoints" aside={<SourceTag source="repository" note="company.mjs @ c1e8c05" />} pad={false} className="mb-5">
        <table className="w-full border-collapse"><thead><tr><Th>Route</Th><Th>Returns</Th><Th>Used by</Th></tr></thead>
          <tbody>{EXISTING.map(([r, d, u]) => <tr key={r}><Td className="font-mono text-[11.5px]">{r}</Td><Td>{d}</Td><Td className="text-muted">{u}</Td></tr>)}</tbody></table>
      </Section>
      <Section title="Proposed read-only proxy routes" aside={<SourceTag source="proposed" />} pad={false}>
        <table className="w-full border-collapse"><thead><tr><Th>Route</Th><Th>Purpose</Th><Th>Upstream</Th></tr></thead>
          <tbody>{PROPOSED_ROUTES.map(p => <tr key={p.route}><Td className="font-mono text-[11.5px]">{p.route}</Td><Td>{p.purpose}</Td><Td className="font-mono text-[11px] text-muted">{p.arcSource}</Td></tr>)}</tbody></table>
      </Section>
    </>
  )
}

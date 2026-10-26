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
  ['GET /api/phase2', 'Phase 2 catalogue (39 checks) + last 80 run records', 'Findings, Scenario Lab, Command Center'],
  ['POST /api/phase2/:id', 'Run one Phase 2 check', 'Scenario Lab, Findings'],
  ['POST /api/phase2/all', 'Run the whole catalogue + summary', 'Command Center, Scenario Lab, Findings'],
  ['POST /api/load', 'Stress run {count, concurrency, seed}', 'Stress Lab'],
  ['POST /api/stress', 'Preset matrix {preset, seeds[]}', 'Stress Lab'],
  ['POST /api/assurance', 'ARC assurance run + summary', 'ARC Assurance'],
  ['GET /api/reports', 'Which report files exist on disk', 'Validation Reports, Environment Health'],
  ['GET /api/reports/latest', 'reports/latest.json, redacted (npm run validate)', 'Validation Reports, Command Center'],
  ['GET /api/reports/phase2', 'reports/phase2-latest.json, redacted (npm run phase2)', 'Validation Reports, Environment Health'],
  ['POST /api/reset', 'Reset Meridian fixtures (ARC audit kept)', 'Settings'],
  ['GET /ui/*', 'Built validation-lab UI (ui/dist)', 'This application, when served from :8890'],
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
      <Section title="Existing Meridian endpoints" aside={<SourceTag source="repository" note="src/company.mjs" />} pad={false} className="mb-5">
        <table className="w-full border-collapse"><thead><tr><Th>Route</Th><Th>Returns</Th><Th>Used by</Th></tr></thead>
          <tbody>{EXISTING.map(([r, d, u]) => <tr key={r}><Td className="font-mono text-[11.5px]">{r}</Td><Td>{d}</Td><Td className="text-muted">{u}</Td></tr>)}</tbody></table>
      </Section>
      <Section title="Not implemented — capabilities this UI cannot show" aside={<SourceTag source="proposed" />} pad={false}>
        <table className="w-full border-collapse"><thead><tr><Th>Route</Th><Th>Purpose</Th><Th>Upstream</Th></tr></thead>
          <tbody>{PROPOSED_ROUTES.map(p => <tr key={p.route}><Td className="font-mono text-[11.5px]">{p.route}</Td><Td>{p.purpose}</Td><Td className="font-mono text-[11px] text-muted">{p.arcSource}</Td></tr>)}</tbody></table>
        <p className="border-t border-line px-4 py-2.5 text-[12px] leading-relaxed text-muted">
          ARC Control's own registry — agents, tools, policy versions, approval queues and evidence bodies — is reachable only with the operator token, which stays on the server. Until these proxy routes exist, screens that would use them read agent, tool and policy inventory from <span className="font-mono">src/start.mjs</span> and label it REPOSITORY. They do not substitute a fixture for a live reading.
        </p>
      </Section>
    </>
  )
}

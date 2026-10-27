import { ArrowUpRight } from 'lucide-react'
import { PageHeader, Section, Th, Td } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { PROPOSED_ROUTES, SERVED_ROUTES } from '../../api/client'
import { ENDPOINTS } from '../../data/registry'

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
      <Section title="Meridian endpoints used by this UI" aside={<SourceTag source="repository" note="src/company.mjs" />} pad={false} className="mb-5">
        <table className="w-full border-collapse"><thead><tr><Th>Route</Th><Th>Returns</Th><Th>Backed by</Th></tr></thead>
          <tbody>{SERVED_ROUTES.map(p => <tr key={p.route}><Td className="font-mono text-[11.5px]">{p.route}</Td><Td>{p.purpose}</Td><Td className="font-mono text-[11px] text-muted">{p.source}</Td></tr>)}</tbody></table>
      </Section>
      <Section title="Not served yet" aside={<SourceTag source="proposed" />} pad={false}>
        <table className="w-full border-collapse"><thead><tr><Th>Route</Th><Th>Purpose</Th><Th>Upstream</Th></tr></thead>
          <tbody>{PROPOSED_ROUTES.map(p => <tr key={p.route}><Td className="font-mono text-[11.5px]">{p.route}</Td><Td>{p.purpose}</Td><Td className="font-mono text-[11px] text-muted">{p.arcSource}</Td></tr>)}</tbody></table>
      </Section>
    </>
  )
}

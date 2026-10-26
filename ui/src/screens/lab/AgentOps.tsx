import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Th, Td } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { AGENTS, REGISTRY_SOURCE, toolDef } from '../../data/registry'
import { ORIGINAL } from '../../data/catalog'
import { decisionOf, fmtTime } from '../../lib/status'

export function AgentOps() {
  const { runs } = useData()
  const nav = useNavigate()
  const registered = AGENTS.filter(a => a.registered)
  const planned = AGENTS.filter(a => !a.registered)

  const statsFor = (name: string) => {
    const ids = new Set(ORIGINAL.filter(s => s.agent === name).map(s => s.id))
    const mine = runs.filter(r => ids.has(r.id))
    const c = { ALLOW: 0, DENY: 0, REQUIRE_APPROVAL: 0, refused: 0 }
    for (const r of mine) { const d = decisionOf(r)?.decision; d ? c[d]++ : c.refused++ }
    return { c, last: mine.length ? mine[mine.length - 1].at : undefined, n: mine.length }
  }

  return (
    <>
      <PageHeader
        title="AI Agent Operations"
        description="Agent identities registered with ARC Control, the tools each may request and the policy that governs it. Planned agents are listed so the inventory can grow to twelve, but they are not registered and cannot act."
        meta={<><SourceTag source="repository" note={`Registration read from ${REGISTRY_SOURCE}`} /><span className="text-[12px] text-muted">Live inventory requires <span className="font-mono">GET /api/arc/agents</span> (proposed)</span></>}
      />

      <Section title={<>Registered agents <span className="ml-1 font-mono text-[11px] font-normal text-faint">{registered.length}</span></>} aside={<span className="text-[11.5px] text-faint">A·D·H·R = allow · deny · held · refused this session</span>} pad={false}>
        <table className="w-full border-collapse">
          <thead><tr><Th>Agent</Th><Th>Department</Th><Th>Owner</Th><Th>Status</Th><Th>Tool</Th><Th>Risk tier</Th><Th>Policy</Th><Th className="text-right">A · D · H · R</Th><Th>Last activity</Th></tr></thead>
          <tbody>
            {registered.map(a => {
              const s = statsFor(a.name)
              const tool = a.tool ? toolDef(a.tool) : undefined
              return (
                <tr key={a.name} onClick={() => nav(`/lab/agents/${a.name}`)} className="cursor-pointer transition-colors duration-100 hover:bg-canvas">
                  <Td><Link to={`/lab/agents/${a.name}`} className="font-mono text-[12px] font-medium text-ink hover:underline">{a.name}</Link></Td>
                  <Td>{a.department}</Td>
                  <Td className="font-mono text-[11.5px] text-muted">{a.owner}</Td>
                  <Td><span title="Registered at bootstrap. Suspension state is not readable without GET /api/arc/agents." className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-muted"><span className="size-1.5 rounded-full bg-neutral" />Registered</span></Td>
                  <Td className="font-mono text-[11.5px] text-teal-ink">{a.tool}</Td>
                  <Td><Tier tier={tool?.riskTier} /></Td>
                  <Td className="font-mono text-[11.5px]">{a.policyId}</Td>
                  <Td className="tnum text-right font-mono text-[11.5px] text-muted">{s.n ? `${s.c.ALLOW} · ${s.c.DENY} · ${s.c.REQUIRE_APPROVAL} · ${s.c.refused}` : '—'}</Td>
                  <Td className="whitespace-nowrap font-mono text-[11.5px] text-muted">{fmtTime(s.last)}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Section>

      <Section className="mt-5" title={<>Planned agents <span className="ml-1 font-mono text-[11px] font-normal text-faint">{planned.length}</span></>} aside={<span className="text-[11.5px] text-faint">MASTER_BUILD_PLAN.md · not registered</span>} pad={false}>
        <table className="w-full border-collapse">
          <thead><tr><Th>Planned role</Th><Th>Department</Th><Th>Status</Th><Th>Tool</Th><Th>Policy</Th></tr></thead>
          <tbody>
            {planned.map(a => (
              <tr key={a.name} className="text-faint">
                <Td className="text-muted">{a.plannedRole}</Td>
                <Td className="text-muted">{a.department}</Td>
                <Td><span className="rounded border border-dashed border-line-strong px-1.5 py-0.5 text-[11px] text-muted">Planned — not registered</span></Td>
                <Td>—</Td><Td>—</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  )
}

export function Tier({ tier }: { tier?: string }) {
  if (!tier) return <span className="text-faint">—</span>
  const cls = tier === 'critical' ? 'text-critical-ink' : tier === 'high' ? 'text-warning-ink' : 'text-muted'
  return <span className={`text-[12px] font-medium capitalize ${cls}`}>{tier}</span>
}

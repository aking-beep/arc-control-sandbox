import { Link, Navigate, useParams } from 'react-router-dom'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, KV, Empty, Th, Td } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AGENTS, REGISTRY_SOURCE, policyForTool, toolDef } from '../../data/registry'
import { ORIGINAL } from '../../data/catalog'
import { decisionOf, fmtTime, runStatus } from '../../lib/status'
import { Tier } from './AgentOps'

export function AgentDetail() {
  const { name } = useParams()
  const { runs } = useData()
  const a = AGENTS.find(x => x.name === name && x.registered)
  if (!a || !a.tool) return <Navigate to="/lab/agents" replace />
  const tool = toolDef(a.tool)!
  const policy = policyForTool(a.tool)!
  const ids = new Set(ORIGINAL.filter(s => s.agent === a.name).map(s => s.id))
  const mine = runs.filter(r => ids.has(r.id)).reverse()

  return (
    <>
      <PageHeader title={a.name} description={`${a.department} · governed by ${policy.id}`}
        meta={<SourceTag source="repository" note={`Registration from ${REGISTRY_SOURCE}`} />} />

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Section title="Identity">
            <dl>
              <KV k="Owner" mono>{a.owner}</KV>
              <KV k="Roles" mono>{a.roles.join(', ')}</KV>
              <KV k="Department">{a.department}</KV>
              <KV k="Criticality">{a.criticality}</KV>
              <KV k="Purpose">Operate {a.tool} under ARC policy</KV>
              <KV k="Data class" mono>synthetic</KV>
              <KV k="Deployment" mono>arc-control-sandbox</KV>
              <KV k="API key">Held server-side · never sent to browser</KV>
            </dl>
          </Section>
          <Section title="Registered tool">
            <dl>
              <KV k="Tool" mono>{tool.name}</KV>
              <KV k="Effect">{tool.effect}</KV>
              <KV k="Risk tier"><Tier tier={tool.riskTier} /></KV>
              <KV k="Parameters" mono>{tool.params.map(([n, t]) => `${n}: ${t}`).join(', ')}</KV>
              <KV k="Connector" mono>meridian-http</KV>
            </dl>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title={<>Governing policy · <span className="font-mono">{policy.id} v{policy.version}</span></>} aside={<Link to={`/lab/policies?policy=${policy.id}`} className="text-[12px] font-medium text-teal-ink hover:underline">Open in Policy Analysis →</Link>} pad={false}>
            <ol className="divide-y divide-line">
              {policy.rules.map((r, i) => (
                <li key={r.id} className="grid grid-cols-[24px_140px_1fr_140px] items-center gap-3 px-4 py-2.5 text-[12.5px]">
                  <span className="font-mono text-[11px] text-faint">{i + 1}</span>
                  <span className="font-mono text-[12px]">{r.id}</span>
                  <span className="text-muted">when {r.when}{r.approvers && <span className="block text-[11.5px] text-faint">{r.approvers}</span>}</span>
                  <span className={`text-right font-mono text-[12px] font-medium ${r.effect === 'DENY' ? 'text-critical-ink' : r.effect === 'ALLOW' ? 'text-success' : 'text-warning-ink'}`}>{r.effect}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Execution timeline" aside={<SourceTag source="live" />} pad={false}>
            {mine.length === 0 ? <Empty title="No actions by this agent in this session">Actions appear when scenarios using {a.name} are run.</Empty> : (
              <ol className="relative px-4 py-3">
                <div className="absolute bottom-4 left-[23px] top-4 w-px bg-line" />
                {mine.slice(0, 10).map((r, i) => {
                  const d = decisionOf(r)
                  return (
                    <li key={i} className="relative grid grid-cols-[16px_1fr_auto] items-start gap-3 py-2">
                      <span className={`mt-1 size-2.5 rounded-full ring-4 ring-white ${r.pass ? 'bg-success' : 'bg-critical'}`} />
                      <div>
                        <Link to={`/lab/inspector?run=${r.id}`} className="text-[13px] font-medium text-ink hover:underline">{r.label}</Link>
                        <div className="font-mono text-[11.5px] text-muted">{d?.decision ?? `HTTP ${d?.httpStatus ?? '—'}`} · {d?.policyId ?? 'no policy'} · {d?.evidenceId ?? 'no evidence id'}</div>
                      </div>
                      <div className="flex items-center gap-2"><StatusBadge status={runStatus(r)} /><span className="font-mono text-[11px] text-faint">{fmtTime(r.at)}</span></div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Section>

          <Section title="Scenarios exercising this agent" pad={false}>
            <table className="w-full border-collapse">
              <thead><tr><Th>Scenario</Th><Th>Expected</Th><Th>Status</Th></tr></thead>
              <tbody>
                {ORIGINAL.filter(s => s.agent === a.name).map(s => (
                  <tr key={s.id}><Td><Link to={`/lab/scenarios?focus=${s.id}`} className="hover:underline">{s.description}</Link></Td><Td className="font-mono text-[11.5px]">{s.expected}</Td><Td><StatusBadge status={runStatus(runs.filter(r => r.id === s.id).pop())} /></Td></tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      </div>
    </>
  )
}

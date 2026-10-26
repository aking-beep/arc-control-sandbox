import { useSearchParams, Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Th, Td, Empty, Tabs } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { RevalidationTimeline } from '../../components/lab/RevalidationTimeline'
import { POLICIES, ENDPOINTS, REGISTRY_SOURCE } from '../../data/registry'
import { decisionOf, fmtTime } from '../../lib/status'
import { useState } from 'react'

export function PolicyAnalysis() {
  const [params, setParams] = useSearchParams()
  const { runs } = useData()
  const selectedId = params.get('policy') ?? POLICIES[0].id
  const policy = POLICIES.find(p => p.id === selectedId) ?? POLICIES[0]
  const [tab, setTab] = useState<'approvals' | 'decisions'>('approvals')

  const approvals = runs.map(r => ({ r, d: decisionOf(r) })).filter(x => x.d?.approvalId)
  const decisions = runs.map(r => ({ r, d: decisionOf(r) })).filter(x => x.d?.policyId === policy.id)

  return (
    <>
      <PageHeader
        title="Policy & Approval Analysis"
        description="Investigate how ARC reached a decision and whether execution matched the authorization in force. Read-only: this screen never edits, publishes or overrides policy."
        actions={<a href={ENDPOINTS.arcConsole} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-canvas">Manage policy in ARC Console <ArrowUpRight className="size-3.5" /></a>}
      />

      <Section title="Authorization vs execution · ARC-SEC-002" aside={<><SourceTag source="baseline" /><Link to="/lab/findings/ARC-SEC-002" className="text-[12px] font-medium text-teal-ink hover:underline">Finding →</Link></>} className="mb-5">
        <RevalidationTimeline />
      </Section>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Section title="Policy inventory" aside={<SourceTag source="repository" note={REGISTRY_SOURCE} />} pad={false}>
          <ul className="p-1.5">
            {POLICIES.map(p => (
              <li key={p.id}>
                <button onClick={() => setParams({ policy: p.id })}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors duration-150 ${p.id === policy.id ? 'bg-canvas' : 'hover:bg-canvas/60'}`}>
                  <span>
                    <span className="block font-mono text-[12px] font-medium text-ink">{p.id}</span>
                    <span className="block font-mono text-[11px] text-muted">{p.tool}</span>
                  </span>
                  <span className="font-mono text-[11px] text-faint">v{p.version}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-3 py-2.5 text-[11.5px] text-faint">Published at bootstrap. Later versions require <span className="font-mono">GET /api/arc/policies</span> (proposed).</p>
        </Section>

        <div className="min-w-0 space-y-5">
          <Section title={<><span className="font-mono">{policy.id}</span> · version {policy.version} · enabled</>} pad={false}>
            <ol className="divide-y divide-line">
              {policy.rules.map((r, i) => (
                <li key={r.id} className="grid grid-cols-[24px_150px_minmax(0,1fr)_140px] items-start gap-3 px-4 py-2.5 text-[12.5px]">
                  <span className="font-mono text-[11px] text-faint">{i + 1}</span>
                  <span className="font-mono text-[12px] text-ink">{r.id}</span>
                  <span className="text-muted">when <span className="font-mono text-[12px] text-ink">{r.when}</span> — {r.reason}{r.approvers && <span className="block font-mono text-[11px] text-faint">{r.approvers}</span>}</span>
                  <span className={`text-right font-mono text-[12px] font-medium ${r.effect === 'DENY' ? 'text-critical-ink' : r.effect === 'ALLOW' ? 'text-success' : 'text-warning-ink'}`}>{r.effect}</span>
                </li>
              ))}
              <li className="grid grid-cols-[24px_150px_minmax(0,1fr)_140px] gap-3 px-4 py-2.5 text-[12.5px] text-muted"><span /><span className="font-mono text-[12px]">fallback</span><span>no authorized rule matched</span><span className="text-right font-mono text-[12px]">DENY</span></li>
            </ol>
          </Section>

          <div className="rounded-lg border border-line bg-surface">
            <div className="px-4 pt-1"><Tabs value={tab} onChange={setTab} items={[{ id: 'approvals', label: 'Approval requests', count: approvals.length }, { id: 'decisions', label: `Decisions under ${policy.id}`, count: decisions.length }]} /></div>
            {tab === 'approvals' ? (
              approvals.length === 0 ? <Empty title="No approval requests in this session">Approval ids appear when held scenarios (refund-pending, refund-approve, export-pending, approval-replay) run. The full approval list needs <span className="font-mono">GET /api/arc/approvals</span>.</Empty> : (
                <table className="w-full border-collapse">
                  <thead><tr><Th>Approval ID</Th><Th>Scenario</Th><Th>Status</Th><Th>Execution release</Th><Th>Approver</Th><Th>When</Th></tr></thead>
                  <tbody>{approvals.map(({ r, d }, i) => (
                    <tr key={i}>
                      <Td className="font-mono text-[11.5px]">{d!.approvalId}</Td>
                      <Td>{r.label}</Td>
                      <Td className="font-mono text-[11.5px]">{d!.outcome === 'executed' ? 'approved · consumed' : 'pending'}</Td>
                      <Td className="font-mono text-[11.5px]">{d!.outcome === 'executed' ? 'released' : 'held'}</Td>
                      <Td className="text-[12px] text-muted">{d!.approvedBy ? <>{d!.approvedBy} <span className="text-faint">(header-asserted)</span></> : '—'}</Td>
                      <Td className="font-mono text-[11.5px]">{fmtTime(r.at)}</Td>
                    </tr>
                  ))}</tbody>
                </table>
              )
            ) : (
              decisions.length === 0 ? <Empty title={`No decisions under ${policy.id} this session`} /> : (
                <table className="w-full border-collapse">
                  <thead><tr><Th>Scenario</Th><Th>Decision</Th><Th>Outcome</Th><Th>Evidence</Th><Th>When</Th></tr></thead>
                  <tbody>{decisions.map(({ r, d }, i) => (
                    <tr key={i}>
                      <Td><Link to={`/lab/inspector?run=${r.id}`} className="hover:underline">{r.label}</Link></Td>
                      <Td className="font-mono text-[11.5px]">{d!.decision}</Td>
                      <Td className="font-mono text-[11.5px]">{d!.outcome}</Td>
                      <Td className="font-mono text-[11.5px]">{d!.evidenceId ?? '—'}</Td>
                      <Td className="font-mono text-[11.5px]">{fmtTime(r.at)}</Td>
                    </tr>
                  ))}</tbody>
                </table>
              )
            )}
          </div>
        </div>
      </div>
    </>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Button, Th, Td, KV, Empty } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { AssuranceBadge } from '../../components/ui/StatusBadge'
import { Drawer } from '../../components/ui/Drawer'
import { assuranceBaseline, BASELINE_NOTE, FINDINGS, LIMITATIONS } from '../../data/baseline'
import type { AssuranceStatus } from '../../api/types'
import { fmtTime } from '../../lib/status'

/** Only constraints documented in the repository are attached; other control titles come from ARC at run time. */
const DOCUMENTED: Record<string, string> = {
  'ARC-AI-006': 'Audit-chain completeness. A pass requires an audit head anchored outside ARC credentials. Must remain not_assessable until an external trusted anchor exists.',
  'ARC-AI-007': 'MCP manifest integrity. Pinned manifest checks do not replace actual on-demand drift tests.',
  'ARC-AI-009': 'Execution path isolation. Application-token refusal does not prove there is no alternative network or credential route; requires an independent deployment-path inspection plus a dated attestation.',
}
const IDS = Array.from({ length: 9 }, (_, i) => `ARC-AI-00${i + 1}`)
const ORDER: AssuranceStatus[] = ['pass', 'fail', 'not_assessable', 'not_applicable', 'attested']

export function Assurance() {
  const { runAssurance, assuranceRuns, running, health } = useData()
  const [open, setOpen] = useState<string | null>(null)
  const latest = assuranceRuns[0]
  const liveTotals = latest?.result.summary?.totals
  const assessments = Array.isArray(latest?.result.run?.assessments) ? latest!.result.run!.assessments! : []
  const totals = liveTotals ?? assuranceBaseline
  const controlOf = (id: string) => assessments.find(c => c.controlId === id)

  return (
    <>
      <PageHeader
        title="ARC Assurance"
        description="ARC Control’s own assessment of the nine ARC-AI controls, invoked through POST /v1/assurance/runs. Five statuses are kept separate; not_assessable is never treated as pass, and control mappings are not certifications."
        actions={<Button variant="primary" icon={<Play className="size-3.5" />} loading={running.has('__assurance__')} disabled={health.status !== 'live'} onClick={runAssurance}>Run assessment</Button>}
      />

      <div className="mb-5 rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-[13px] font-semibold">Control status distribution</h2>
          {liveTotals ? <SourceTag source="live" at={latest.at} /> : <SourceTag source="baseline" note={BASELINE_NOTE} />}
        </div>
        <div className="grid grid-cols-5 divide-x divide-line">
          {ORDER.map(s => (
            <div key={s} className="px-4 py-4">
              <AssuranceBadge status={s} />
              <div className={`tnum mt-2 text-[28px] font-semibold leading-none ${s === 'fail' && (totals[s] ?? 0) > 0 ? 'text-critical-ink' : 'text-ink'}`}>{totals[s] ?? 0}</div>
            </div>
          ))}
        </div>
        <p className="border-t border-line px-4 py-2.5 text-[12px] text-muted">No overall percentage is calculated. {latest?.result.disclaimer ?? 'Operator identity is header-asserted in ARC 2.0.'}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Section title="Control inventory" aside={<span className="text-[11.5px] text-faint">Click a control for detail</span>} pad={false}>
          <table className="w-full border-collapse">
            <thead><tr><Th>Control</Th><Th>Assessment</Th><Th>Status</Th></tr></thead>
            <tbody>
              {IDS.map(id => {
                const c = controlOf(id)
                return (
                  <tr key={id} onClick={() => setOpen(id)} className="cursor-pointer transition-colors duration-100 hover:bg-canvas">
                    <Td className="font-mono text-[12px] font-medium">{id}</Td>
                    <Td className="text-[12.5px]">{c?.summary ?? <span className="text-faint">{DOCUMENTED[id] ? DOCUMENTED[id].split('.')[0] : 'Result supplied by ARC assessment'}</span>}</Td>
                    <Td>{c ? <AssuranceBadge status={c.status} /> : <span className="text-[12px] text-faint">Not loaded</span>}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-2.5 text-[11.5px] leading-relaxed text-faint">The baseline gives totals only; per-control statuses come from the assessments returned by POST /v1/assurance/runs. Totals reflect everything registered in this ARC process, including Phase 2 probe agents and tools.</p>
        </Section>

        <div className="space-y-5">
          <Section title="Assessment history" aside={<span className="text-[11.5px] text-faint">This session</span>} pad={false}>
            {assuranceRuns.length === 0 ? <Empty title="No assessments run this session" /> : (
              <ul className="divide-y divide-line">{assuranceRuns.map(a => (
                <li key={a.at} className="flex items-center justify-between px-4 py-2.5 text-[12.5px]">
                  <span className="font-mono text-[11.5px]">{fmtTime(a.at)}</span>
                  <span className={a.result.pass ? 'text-ink' : 'text-critical-ink'}>{a.result.pass ? 'Completed' : `Failed · ${a.result.error}`}</span>
                </li>
              ))}</ul>
            )}
          </Section>
          <Section title="Risk register" pad={false}>
            <table className="w-full border-collapse">
              <thead><tr><Th>Risk</Th><Th>Control</Th><Th>Rating</Th></tr></thead>
              <tbody>
                {FINDINGS.map(f => <tr key={f.id}><Td><Link to={`/lab/findings/${f.id}`} className="hover:underline">{f.title}</Link></Td><Td className="font-mono text-[11px] text-muted">{f.id}</Td><Td className={`text-[12px] font-medium capitalize ${f.severity === 'critical' ? 'text-critical-ink' : 'text-warning-ink'}`}>{f.severity}</Td></tr>)}
                {LIMITATIONS.filter(l => l.control).map(l => <tr key={l.title}><Td>{l.title}</Td><Td className="font-mono text-[11px] text-muted">{l.control}</Td><Td className="text-[12px] text-faint">Not rated</Td></tr>)}
              </tbody>
            </table>
          </Section>
        </div>
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open} subtitle="ARC-AI control detail">
        {open && (
          <div className="space-y-5">
            <dl>
              <KV k="Current status">{controlOf(open) ? <AssuranceBadge status={controlOf(open)!.status} /> : 'Not loaded — run an assessment'}</KV>
              <KV k="Evidence">{controlOf(open) ? 'See raw assessment below' : '—'}</KV>
              <KV k="Remediation">{FINDINGS.length && open === 'ARC-AI-006' ? 'External audit anchoring (planned)' : 'Not tracked'}</KV>
            </dl>
            {DOCUMENTED[open] && <div className="rounded-md bg-warning-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink"><div className="mb-0.5 text-[11.5px] font-medium text-warning-ink">Documented constraint</div>{DOCUMENTED[open]}</div>}
            {controlOf(open) && <pre className="max-h-80 overflow-auto rounded-md bg-canvas p-3 font-mono text-[11px]">{JSON.stringify(controlOf(open), null, 2)}</pre>}
            <p className="text-[12px] text-muted">Mapping a control to a framework does not mean ARC Control is certified against it.</p>
          </div>
        )}
      </Drawer>
    </>
  )
}

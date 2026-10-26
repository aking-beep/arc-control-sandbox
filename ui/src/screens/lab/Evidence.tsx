import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Th, Td, Empty, Button, KV } from '../../components/ui/primitives'
import { VerificationBadge } from '../../components/ui/StatusBadge'
import { SourceTag } from '../../components/ui/SourceTag'
import { Drawer } from '../../components/ui/Drawer'
import { ORIGINAL } from '../../data/catalog'
import { EvidenceRecord } from '../../components/lab/EvidenceRecord'
import { decisionOf, fmtTime } from '../../lib/status'
import type { VerificationState } from '../../api/types'

type Kind = 'all' | 'decision' | 'approval' | 'execution' | 'mutation'

interface Rec { id: string; kind: Exclude<Kind, 'all'>; at: string; agent: string; tool: string; summary: string; readable: boolean | null; raw: unknown }

export function Evidence() {
  const { runs, state, health } = useData()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [kind, setKind] = useState<Kind>('all')
  const [open, setOpen] = useState<Rec | null>(null)

  const records = useMemo<Rec[]>(() => {
    const out: Rec[] = []
    for (const r of runs) {
      const d = decisionOf(r)
      const spec = ORIGINAL.find(s => s.id === r.id)
      if (d?.evidenceId) out.push({ id: d.evidenceId, kind: d.outcome === 'executed' ? 'execution' : 'decision', at: r.at, agent: spec?.agent ?? '—', tool: spec?.tool ?? '—', summary: `${d.decision} · ${d.policyId} · ${d.outcome}${d.correlationId ? ` · ${d.correlationId}` : ''}`, readable: d.evidencePresent, raw: r })
      if (d?.approvalId) out.push({ id: d.approvalId, kind: 'approval', at: r.at, agent: spec?.agent ?? '—', tool: spec?.tool ?? '—', summary: `approval for ${r.id}`, readable: null, raw: { approvalId: d.approvalId, scenario: r.id } })
    }
    state.data?.mutationLog.forEach((m, i) => out.push({ id: `mut-${i + 1}`, kind: 'mutation', at: m.at, agent: '(connector)', tool: m.tool, summary: JSON.stringify(m.parameters), readable: null, raw: m }))
    return out.sort((a, b) => b.at.localeCompare(a.at))
  }, [runs, state.data])

  const rows = records.filter(r => (kind === 'all' || r.kind === kind) && (!q || `${r.id} ${r.tool} ${r.agent} ${r.summary}`.toLowerCase().includes(q.toLowerCase())))
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), scope: 'Meridian sandbox session (browser-visible records only)', verification: 'Not verified. Evidence readability only; no external anchor.', records: rows.map(r => r.raw) }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `meridian-evidence-${Date.now()}.json`; a.click()
  }

  return (
    <>
      <PageHeader
        title="Evidence Explorer"
        description="Evidence identifiers, approvals and Meridian mutation records observed in this session. An internally checked hash chain is not independent tamper-proofing; verification states are shown separately."
        actions={<Button icon={<Download className="size-3.5" />} onClick={exportJson} disabled={rows.length === 0}>Export JSON</Button>}
      />

      <div className="mb-5 grid grid-cols-4 divide-x divide-line rounded-lg border border-line bg-surface">
        {([['internally_verified', 'Not assessed from this UI. Phase 2 exercises verifyBundle / verifyChain server-side'], ['externally_anchored', '0 · No external anchor configured'], ['failed', 'None observed'], ['not_assessable', 'Current state for all records']] as Array<[VerificationState, string]>).map(([s, note]) => (
          <div key={s} className="px-4 py-3">
            <VerificationBadge state={s} dim={s === 'externally_anchored'} />
            <div className="mt-1.5 text-[11.5px] leading-snug text-muted">{note}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex h-8 w-80 items-center gap-2 rounded-md border border-line bg-surface px-2.5">
          <Search className="size-3.5 text-faint" />
          <input value={q} onChange={e => { const n = new URLSearchParams(params); e.target.value ? n.set('q', e.target.value) : n.delete('q'); setParams(n) }} placeholder="Evidence id, tool, agent" className="flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:font-sans placeholder:text-faint" />
        </div>
        {(['all', 'decision', 'execution', 'approval', 'mutation'] as Kind[]).map(k => (
          <button key={k} onClick={() => setKind(k)} className={`h-8 rounded-md px-3 text-[12.5px] capitalize transition-colors duration-150 ${kind === k ? 'bg-navy text-white' : 'text-muted hover:bg-surface hover:text-ink'}`}>{k === 'mutation' ? 'Meridian mutations' : k}</button>
        ))}
        <span className="ml-auto"><SourceTag source="live" at={state.fetchedAt} /></span>
      </div>

      <Section pad={false}>
        {rows.length === 0 ? <Empty title="No evidence records">Records appear after integration scenarios run on this server. Open one to load the ARC record through <span className="font-mono">GET /api/arc/evidence/:id</span>. Listing the whole evidence store or audit log is not exposed.</Empty> : (
          <table className="w-full border-collapse">
            <thead><tr><Th>Identifier</Th><Th>Type</Th><Th>Time</Th><Th>Agent</Th><Th>Tool</Th><Th>Summary</Th><Th>Readable</Th><Th>Verification</Th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={`${r.kind}-${r.id}`} onClick={() => setOpen(r)} className="cursor-pointer transition-colors duration-100 hover:bg-canvas">
                <Td className="font-mono text-[11.5px] text-teal-ink">{r.id}</Td>
                <Td className="text-[12px] capitalize">{r.kind}</Td>
                <Td className="whitespace-nowrap font-mono text-[11.5px]">{fmtTime(r.at)}</Td>
                <Td className="font-mono text-[11.5px]">{r.agent}</Td>
                <Td className="font-mono text-[11.5px]">{r.tool}</Td>
                <Td className="max-w-[260px] truncate font-mono text-[11.5px] text-muted">{r.summary}</Td>
                <Td className="text-[12px]">{r.readable === null ? '—' : r.readable ? 'yes' : 'no'}</Td>
                <Td><VerificationBadge state="not_assessable" /></Td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Section>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={<span className="font-mono">{open?.id}</span>} subtitle={open && `${open.kind} · ${fmtTime(open.at)}`}>
        {open && (
          <div className="space-y-5">
            <dl>
              <KV k="Type">{open.kind}</KV>
              <KV k="Agent" mono>{open.agent}</KV>
              <KV k="Tool" mono>{open.tool}</KV>
              <KV k="Readable">{open.readable === null ? 'n/a' : open.readable ? 'GET /v1/evidence returned 200' : 'No'}</KV>
              <KV k="Hash-chain position"><span className="text-faint">Not exposed to browser</span></KV>
            </dl>
            <div>
              <div className="mb-2 text-[12px] font-medium">Verification</div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-md border border-line p-2.5"><VerificationBadge state="internally_verified" dim /><div className="mt-1 text-muted">Not assessed</div></div>
                <div className="rounded-md border border-line p-2.5"><VerificationBadge state="externally_anchored" dim /><div className="mt-1 text-muted">No anchor configured</div></div>
                <div className="rounded-md border border-line p-2.5"><VerificationBadge state="failed" dim /><div className="mt-1 text-muted">No failure observed</div></div>
                <div className="rounded-md border border-teal p-2.5"><VerificationBadge state="not_assessable" /><div className="mt-1 text-muted">Current state</div></div>
              </div>
            </div>
            {(open.kind === 'decision' || open.kind === 'execution') && (
              <div>
                <div className="mb-2 text-[12px] font-medium">ARC evidence record</div>
                <EvidenceRecord id={open.id} enabled={health.status === 'live' && !!health.data?.gatewayConfigured} />
              </div>
            )}
            <div className="text-[12px] font-medium">Runner record</div>
            <pre className="max-h-80 overflow-auto rounded-md bg-canvas p-3 font-mono text-[11px]">{JSON.stringify(open.raw, null, 2)}</pre>
            {open.kind !== 'mutation' && <Link to={`/lab/inspector?run=${(open.raw as { id?: string; scenario?: string }).id ?? (open.raw as { scenario?: string }).scenario}`} className="text-[12.5px] font-medium text-teal-ink hover:underline">Open action in Inspector →</Link>}
          </div>
        )}
      </Drawer>
    </>
  )
}

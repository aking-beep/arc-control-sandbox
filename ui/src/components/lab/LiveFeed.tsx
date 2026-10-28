import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Bot, CircleAlert, CircleCheck, CircleHelp, Inbox, Mail, ShieldCheck } from 'lucide-react'
import type { LiveEvent, LiveOutcome } from '../../api/types'
import { meridianApi } from '../../api/client'
import { Drawer } from '../ui/Drawer'
// The feed is about today: the time of day is enough.
const fmtTime = (at?: string) => at ? new Date(at).toLocaleTimeString() : '—'

export const DEPT_LABEL: Record<string, string> = {
  finance: 'Finance', support: 'Support', it: 'IT', sales: 'Sales', hr: 'HR', security: 'Security', northwind: 'Northwind Bank'
}
const OUTCOME: Record<LiveOutcome, { label: string; cls: string }> = {
  executed: { label: 'Executed', cls: 'text-success bg-success-50' },
  pending_approval: { label: 'Held', cls: 'text-warning-ink bg-warning-50' },
  denied: { label: 'Denied', cls: 'text-critical-ink bg-critical-50' },
  refused: { label: 'Refused', cls: 'text-critical-ink bg-critical-50' },
  unknown: { label: 'Unknown', cls: 'text-muted bg-neutral-50' },
}

export function OutcomeChip({ outcome }: { outcome?: string }) {
  const m = OUTCOME[outcome as LiveOutcome]
  if (!m) return <span className="rounded-[3px] bg-neutral-50 px-1.5 py-px font-mono text-[10.5px] text-muted">{outcome ?? '—'}</span>
  return <span className={`rounded-[3px] px-1.5 py-px font-mono text-[10.5px] font-semibold ${m.cls}`}>{m.label}</span>
}

function Check({ e }: { e: LiveEvent }) {
  if (e.kind === 'anomaly') return <span title={e.why} className="flex items-center gap-1 text-[11.5px] font-medium text-critical-ink"><CircleAlert className="size-3.5" />Anomaly</span>
  if (e.ok === null) return <span title={e.why} className="flex items-center gap-1 text-[11.5px] text-muted"><CircleHelp className="size-3.5" />Unknown</span>
  if (e.kind === 'action' || e.kind === 'approval') return <span title="ARC's outcome matched policy, and Meridian recorded exactly the expected effect" className="flex items-center gap-1 text-[11.5px] text-success"><CircleCheck className="size-3.5" />As expected</span>
  return null
}

const JUDGMENT: Record<string, { label: string; cls: string; title: string }> = {
  declined: { label: 'Declined bait', cls: 'text-success bg-success-50', title: 'The agent did not make the request it was baited into' },
  contained: { label: 'ARC contained', cls: 'text-warning-ink bg-warning-50', title: 'The agent made the request; ARC held or denied it' },
  executed: { label: 'Took bait', cls: 'text-critical-ink bg-critical-50', title: 'The agent made the request and policy allowed it: an agent judgment finding, not an ARC anomaly' },
}

export function JudgmentChip({ judgment }: { judgment?: string | null }) {
  const m = judgment ? JUDGMENT[judgment] : undefined
  if (!m) return null
  return <span title={m.title} className={`rounded-[3px] px-1.5 py-px font-mono text-[10.5px] font-semibold ${m.cls}`}>{m.label}</span>
}

function Line({ e, onEvidence, onEpisode }: { e: LiveEvent; onEvidence: (id: string) => void; onEpisode: (e: LiveEvent) => void }) {
  if (e.kind === 'story') return (
    <li className="flex items-center gap-2 bg-mint-50/60 px-4 py-1.5 text-[12px] font-medium text-teal-ink">
      <BookOpen className="size-3.5" /> {e.summary}<span className="ml-auto font-mono text-[11px] font-normal text-faint">{fmtTime(e.at)}</span>
    </li>
  )
  if (e.kind === 'inbound') return (
    <li className="flex items-center gap-3 px-4 py-2 text-[12.5px] text-muted">
      <Inbox className="size-3.5 shrink-0 text-faint" /><span className="min-w-0 flex-1 truncate">{e.summary}</span>
      <span className="font-mono text-[11px] text-faint">{fmtTime(e.at)}</span>
    </li>
  )
  if (e.kind === 'inbox') return (
    <li className="flex items-center gap-3 px-4 py-2 text-[12.5px] text-muted">
      <Mail className="size-3.5 shrink-0 text-faint" />
      <span className="min-w-0 flex-1 truncate"><span className="font-mono text-[11px] text-faint">{e.itemId}</span> to {e.agent}: {e.summary}</span>
      {e.item?.kind === 'adversarial' && <span title={e.item.probe ?? undefined} className="rounded-[3px] bg-critical-50 px-1.5 py-px font-mono text-[10.5px] text-critical-ink">adversarial</span>}
      <span className="font-mono text-[11px] text-faint">{fmtTime(e.at)}</span>
    </li>
  )
  if (e.kind === 'agent') return (
    <li>
      <button onClick={() => onEpisode(e)} className="flex w-full items-center gap-3 bg-mint-50/40 px-4 py-2 text-left text-[12.5px] hover:bg-mint-50" title="Show the item, the model's reasoning and what it tried">
        <Bot className="size-3.5 shrink-0 text-teal" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-ink">{e.summary}</span>
          <span className="block truncate font-mono text-[11px] text-faint">{e.agent} · {e.itemId} · {e.calls ?? 0} call{e.calls === 1 ? '' : 's'}{e.ended && e.ended !== 'done' ? ` · ${e.ended.replace('_', ' ')}` : ''}</span>
        </span>
        <JudgmentChip judgment={e.judgment} />
        <span className="font-mono text-[11px] text-faint">{fmtTime(e.at)}</span>
      </button>
    </li>
  )
  if (e.kind === 'error') return <li className="px-4 py-2 text-[12px] text-muted">{e.summary}</li>
  // Approval events carry the approver's decision ('approve' / 'reject'); actions carry ARC's (ALLOW, DENY…).
  const approval = e.decision === 'approve' || e.decision === 'reject'
  return (
    <li className={`grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2 sm:grid-cols-[76px_120px_minmax(0,1fr)_84px_104px_auto] ${e.kind === 'anomaly' ? 'bg-critical-50/60' : ''}`}>
      <span className="font-mono text-[11px] text-faint">{fmtTime(e.at)}</span>
      <span className="hidden truncate text-[12px] text-muted sm:block">{DEPT_LABEL[e.department ?? ''] ?? e.department}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 truncate text-[12.5px] text-ink">
          {approval && <ShieldCheck className="size-3.5 shrink-0 text-teal" aria-label="Approval decision" />}
          <span className="truncate">{e.summary}</span>
        </span>
        <span className="block truncate font-mono text-[11px] text-faint">
          {approval ? `${e.decision === 'approve' ? 'approved' : e.decision === 'reject' ? 'rejected' : e.decision} by ${e.approvers?.join(', ') || (e.human ? 'a person in the ARC console' : '—')}` : `${e.agent} · ${e.tool}${e.itemId ? ` · AI, ${e.itemId}` : ''}`}
          {e.policyId ? ` · ${e.policyId}${e.ruleId ? `/${e.ruleId}` : ''}` : ''}
          {e.kind === 'anomaly' && e.why ? ` · ${e.why}` : ''}
        </span>
      </span>
      <span className="hidden sm:block"><OutcomeChip outcome={e.actual} /></span>
      <span className="hidden sm:block"><Check e={e} /></span>
      <span className="text-right">
        {e.evidenceId
          ? <button onClick={() => onEvidence(e.evidenceId!)} className="font-mono text-[11px] text-teal-ink hover:underline" title="Open ARC's evidence record">evidence</button>
          : <span className="font-mono text-[11px] text-faint">{e.effects ? `${e.effects.observed} effect${e.effects.observed === 1 ? '' : 's'}` : ''}</span>}
      </span>
    </li>
  )
}

/** Newest first. */
export function LiveFeed({ events, limit = 40, empty }: { events: LiveEvent[]; limit?: number; empty?: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const [record, setRecord] = useState<unknown>(null)
  const [err, setErr] = useState<string | null>(null)
  const [episode, setEpisode] = useState<LiveEvent | null>(null)
  const show = async (id: string) => {
    setOpen(id); setRecord(null); setErr(null)
    try { setRecord((await meridianApi.evidence(id)).record ?? null) } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
  }
  const rows = events.filter(e => e.kind !== 'status').slice(-limit).reverse()
  return (
    <>
      {rows.length === 0
        ? <p className="px-4 py-6 text-[12.5px] text-muted">{empty ?? 'No live activity yet.'}</p>
        : <ul className="divide-y divide-line">{rows.map(e => <Line key={e.seq} e={e} onEvidence={show} onEpisode={setEpisode} />)}</ul>}
      <Drawer open={!!open} onClose={() => setOpen(null)} title="ARC evidence record" subtitle={<span className="font-mono">{open}</span>}>
        {err ? <p className="text-[12.5px] text-critical-ink">{err}</p>
          : record === null ? <p className="text-[12.5px] text-muted">Loading…</p>
            : <pre className="overflow-x-auto rounded-md bg-canvas p-3 font-mono text-[11.5px] leading-relaxed text-ink">{JSON.stringify(record, null, 2)}</pre>}
        <p className="mt-3 text-[11.5px] text-faint">Fetched from ARC by the Meridian server with its operator token and redacted; the browser never holds ARC credentials. <Link to="/lab/evidence" className="text-teal-ink hover:underline">Evidence Explorer →</Link></p>
      </Drawer>
      <Drawer open={!!episode} onClose={() => setEpisode(null)} title={`${episode?.agent ?? ''} · ${episode?.itemId ?? ''}`} subtitle={episode?.model ? <span className="font-mono">{episode.model}</span> : undefined}>
        {episode && <Episode e={episode} />}
      </Drawer>
    </>
  )
}

function Episode({ e }: { e: LiveEvent }) {
  const h = 'mb-1 mt-4 text-[11.5px] font-semibold uppercase tracking-wide text-muted first:mt-0'
  return (
    <div className="text-[12.5px] text-ink">
      <h3 className={h}>Inbox item</h3>
      {e.item ? (
        <div className="rounded-md border border-line bg-canvas p-3">
          <div className="font-mono text-[11px] text-faint">{e.item.channel} · from {e.item.from}</div>
          <div className="font-medium">{e.item.subject}</div>
          <p className="mt-1 whitespace-pre-wrap">{e.item.body}</p>
          {e.item.kind === 'adversarial' && <p className="mt-2 text-[11.5px] text-critical-ink">Adversarial: {e.item.probe}</p>}
        </div>
      ) : <p className="text-muted">Not available.</p>}
      <h3 className={h}>What the agent tried</h3>
      {!e.attempts?.length ? <p className="text-muted">No tool calls.</p> : (
        <ul className="space-y-1">{e.attempts.map((a, i) => (
          <li key={i} className="flex items-center gap-2"><OutcomeChip outcome={a.actual} /><span className="font-mono text-[11.5px]">{a.tool} {JSON.stringify(a.parameters)}</span></li>
        ))}</ul>
      )}
      {e.judgment && <p className="mt-2 flex items-center gap-2"><JudgmentChip judgment={e.judgment} /><span className="text-[11.5px] text-muted">{e.why ?? JUDGMENT[e.judgment]?.title}</span></p>}
      <h3 className={h}>Agent's note</h3>
      <p>{e.summary}</p>
      <h3 className={h}>Reasoning summary</h3>
      {e.reasoning ? <p className="whitespace-pre-wrap text-muted">{e.reasoning}</p> : <p className="text-muted">None returned.</p>}
      {e.usage && <p className="mt-4 font-mono text-[11px] text-faint">{e.usage.input + e.usage.cacheRead + e.usage.cacheWrite} input tokens ({e.usage.cacheRead} from cache) · {e.usage.output} output</p>}
      <p className="mt-3 text-[11.5px] text-faint">Each tool call went through ARC Control with this agent's own key. The model never held a credential; it saw only ARC's decision.</p>
    </div>
  )
}

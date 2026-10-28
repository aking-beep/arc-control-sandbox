import { useMemo, useState } from 'react'
import { ArrowUpRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useLiveOps } from '../../api/LiveProvider'
import { PageHeader, Section, Button, Empty } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { LiveFeed, DEPT_LABEL } from '../../components/lab/LiveFeed'
import type { LiveMode } from '../../api/types'
import { LiveState } from '../../components/lab/LiveState'
import { ENDPOINTS } from '../../data/registry'
import { fmtTime } from '../../lib/status'

const RATES = [6, 20, 60, 120]

export function LiveOps() {
  const { snapshot: s, events, busy, error, start, pause, newDay, setMode, link } = useLiveOps()
  const [seed, setSeed] = useState<string>('')
  const [rate, setRate] = useState<number | null>(null)
  const mode: LiveMode = s?.mode ?? 'scripted'
  const ai = s?.ai
  const c = s?.counts
  const byDept = useMemo(() => {
    const out: Record<string, { actions: number; executed: number; held: number; stopped: number }> = {}
    for (const e of events) {
      if (e.kind !== 'action' || !e.department) continue
      const d = (out[e.department] ||= { actions: 0, executed: 0, held: 0, stopped: 0 })
      d.actions += 1
      if (e.actual === 'executed') d.executed += 1
      else if (e.actual === 'pending_approval') d.held += 1
      else if (e.actual === 'denied' || e.actual === 'refused') d.stopped += 1
    }
    return Object.entries(out).sort((a, b) => b[1].actions - a[1].actions)
  }, [events])
  const stories = events.filter(e => e.kind === 'story').slice(-6).reverse()
  const seedValue = seed.trim() === '' ? undefined : Number(seed)

  return (
    <>
      <PageHeader
        title="Live Operations"
        description="Meridian's and Northwind's agents working through a seeded day: scripted, or with AI agents deciding what to do from an inbox. Every request goes through ARC Control. Each outcome is checked against what the policies predict, and against what Meridian actually recorded."
        meta={<><LiveState /><SourceTag source="live" note="Streamed from the running Meridian server" /></>}
        actions={<>
          <a href={ENDPOINTS.arcConsole} target="_blank" rel="noreferrer"><Button variant="ghost" icon={<ArrowUpRight className="size-3.5" />}>ARC Console</Button></a>
          <Button icon={<RotateCcw className="size-3.5" />} loading={busy === 'new-day'} onClick={() => newDay(seedValue)}
            title="Reset Meridian's business records and start day N+1 (ARC's audit history is kept)">New day</Button>
          {s?.running
            ? <Button icon={<Pause className="size-3.5" />} loading={busy === 'pause'} onClick={pause}>Pause</Button>
            : <Button variant="primary" icon={<Play className="size-3.5" />} loading={busy === 'start'} disabled={!s}
                onClick={() => start({ ...(seedValue !== undefined && s?.day === 0 ? { seed: seedValue } : {}), ...(rate ? { rate } : {}) })}>Start</Button>}
        </>}
      />
      {error && <p className="mb-4 rounded-md border border-critical/30 bg-critical-50 px-3 py-2 text-[12.5px] text-critical-ink">{error}</p>}

      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3 text-[12.5px] text-muted">
        <span>Day <span className="tnum font-semibold text-ink">{s?.day ?? '—'}</span></span>
        <span>Seed <span className="font-mono text-ink">{s?.seed ?? '—'}</span></span>
        <span>Step <span className="tnum text-ink">{s?.tick ?? 0}</span></span>
        <span>Pace <span className="tnum text-ink">{s?.rate ?? '—'}</span> actions/min</span>
        <span>Day started <span className="font-mono text-ink">{fmtTime(s?.dayStartedAt ?? undefined)}</span></span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5" title={ai?.available ? undefined : `AI mode unavailable: ${ai?.reason ?? 'not configured'}`}>Mode
            <select value={mode} onChange={e => setMode(e.target.value as LiveMode)} disabled={!s || busy !== null}
              className="h-7 rounded-md border border-line bg-canvas px-1.5 text-[12px] text-ink" aria-label="Scripted or AI-driven agents">
              <option value="scripted">Scripted</option>
              <option value="ai" disabled={!ai?.available}>AI agents{ai?.available ? '' : ' (unavailable)'}</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5">Seed
            <input value={seed} onChange={e => setSeed(e.target.value.replace(/[^0-9]/g, ''))} placeholder={String(s?.seed ?? 1)} inputMode="numeric"
              className="h-7 w-20 rounded-md border border-line bg-canvas px-2 font-mono text-[12px] text-ink" aria-label="Seed for the next day" />
          </label>
          <label className="flex items-center gap-1.5">Pace
            <select value={rate ?? s?.rate ?? 20} onChange={e => { const r = Number(e.target.value); setRate(r); if (s?.running) start({ rate: r }) }}
              className="h-7 rounded-md border border-line bg-canvas px-1.5 text-[12px] text-ink" aria-label="Actions per minute">
              {RATES.map(r => <option key={r} value={r}>{r}/min</option>)}
            </select>
          </label>
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Agent actions" value={c?.actions} />
        <Kpi label="Executed" value={c?.executed} tone="text-success" />
        <Kpi label="Held for approval" value={c?.pending_approval} tone="text-warning-ink" />
        <Kpi label="Denied" value={c?.denied} tone="text-critical-ink" />
        <Kpi label="Refused" value={c?.refused} tone="text-critical-ink" sub="before policy" />
        <Kpi label="Approvals" value={c ? `${c.approved} / ${c.rejected}` : undefined} sub="released / rejected" />
        <Kpi label="Unknown outcome" value={c?.unknown} sub="never counted as failed" />
        <Kpi label="Anomalies" value={c?.anomalies} tone={c?.anomalies ? 'text-critical-ink' : 'text-success'} sub={c?.anomalies ? 'see below' : 'none so far'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Section title="Live activity" aside={<span className="text-[11.5px] text-faint">{link === 'stream' ? 'Streaming' : link === 'polling' ? 'Polling every 10 s' : link === 'offline' ? 'Server unreachable' : 'Connecting…'} · newest first</span>} pad={false}>
          <LiveFeed events={events} limit={60} empty={s?.running ? 'Waiting for the first action…' : 'Live operations are paused. Press Start to begin the working day.'} />
        </Section>

        <aside className="space-y-5">
          <Section title="Anomalies" pad={false}>
            {!s?.anomalies.length
              ? <p className="px-4 py-3 text-[12.5px] text-muted">None. Every outcome matched policy, and Meridian recorded exactly the effects ARC's decisions imply.</p>
              : <LiveFeed events={s.anomalies} limit={20} />}
          </Section>
          <Section title="AI agents" aside={<span className="text-[11.5px] text-faint">{mode === 'ai' ? 'on' : 'off'}</span>} pad={false}>
            {!ai?.available ? (
              <p className="px-4 py-3 text-[12.5px] text-muted">Unavailable: {ai?.reason ?? 'not configured'}. Set <span className="font-mono">ANTHROPIC_API_KEY</span> on the server (never in the browser) and restart.</p>
            ) : (
              <div className="space-y-2 px-4 py-3 text-[12.5px]">
                {ai.reason && <p className="text-critical-ink">{ai.reason}</p>}
                <p className="text-muted">Model <span className="font-mono text-ink">{ai.model}</span>{ai.effort ? <> · effort <span className="font-mono text-ink">{ai.effort}</span></> : null} · an inbox item every {ai.every} steps</p>
                <p className="text-muted">Today <span className="tnum text-ink">{ai.episodes}</span> / {ai.maxEpisodes} items · <span className="tnum text-ink">{Math.round(ai.tokens / 1000)}k</span> / {Math.round(ai.maxTokens / 1000)}k tokens{c?.ai_errors ? <> · <span className="text-critical-ink">{c.ai_errors} model errors</span></> : null}</p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Kpi label="Declined bait" value={c?.bait_declined ?? 0} tone="text-success" />
                  <Kpi label="ARC contained" value={c?.bait_contained ?? 0} tone="text-warning-ink" />
                  <Kpi label="Took bait" value={c?.bait_executed ?? 0} tone={c?.bait_executed ? 'text-critical-ink' : 'text-ink'} sub="allowed by policy" />
                </div>
                <p className="text-[11px] text-faint">Agent judgment on adversarial inbox items. Taking bait that policy allows is a finding about the agent or the policy, not an ARC anomaly.</p>
              </div>
            )}
          </Section>
          <Section title="Approval queue" aside={<span className="text-[11.5px] text-faint">{s?.pendingApprovals.length ?? 0} waiting · decide in the ARC console too</span>} pad={false}>
            {!s?.pendingApprovals.length ? <p className="px-4 py-3 text-[12.5px] text-muted">Nothing waiting.</p> : (
              <ul className="divide-y divide-line">{s.pendingApprovals.slice(0, 8).map(p => (
                <li key={p.approvalId} className="px-4 py-2">
                  <div className="truncate text-[12.5px] text-ink">{p.summary}</div>
                  <div className="font-mono text-[11px] text-faint">{DEPT_LABEL[p.department] ?? p.department} · approver decides in ~{Math.max(0, p.dueTick - (s.tick ?? 0))} steps</div>
                </li>
              ))}</ul>
            )}
          </Section>
          <Section title="By department" pad={false}>
            {byDept.length === 0 ? <Empty title="No actions yet" /> : (
              <ul className="divide-y divide-line">{byDept.map(([d, v]) => (
                <li key={d} className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-2">
                  <span className="text-[12.5px] text-ink">{DEPT_LABEL[d] ?? d}</span>
                  <span className="font-mono text-[11.5px] text-muted"><span className="text-success">{v.executed}</span> · <span className="text-warning-ink">{v.held}</span> · <span className="text-critical-ink">{v.stopped}</span></span>
                </li>
              ))}</ul>
            )}
            <p className="border-t border-line px-4 py-2 text-[11px] text-faint">Executed · held · denied or refused, over the recent feed.</p>
          </Section>
          <Section title="Story beats" pad={false}>
            {stories.length === 0 ? <p className="px-4 py-3 text-[12.5px] text-muted">The day's scripted events will appear here: a refund surge, a compromised sales agent, a duplicate request, a hotfix to production, a request around ARC, and malformed or out-of-role requests.</p> : (
              <ul className="divide-y divide-line">{stories.map(e => (
                <li key={e.seq} className="flex items-center gap-2 px-4 py-2 text-[12.5px] text-ink"><span className="min-w-0 flex-1 truncate">{e.summary}</span><span className="font-mono text-[11px] text-faint">{fmtTime(e.at)}</span></li>
              ))}</ul>
            )}
          </Section>
        </aside>
      </div>

      <p className="mt-5 text-[11.5px] leading-relaxed text-faint">
        All companies, people and transactions are fictional. The same seed produces the same requests and approver decisions; only Northwind's wire cut-off follows the real UTC clock. In AI mode the same seed gives the same inbox, but what the agents do with it is the model's decision. Live operations pause while any test or suite runs, so test results are never mixed with live traffic. They never change ARC's policies, agents or tools.
      </p>
    </>
  )
}

function Kpi({ label, value, tone = 'text-ink', sub }: { label: string; value?: number | string; tone?: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className={`tnum text-[20px] font-semibold leading-tight ${tone}`}>{value ?? '—'}</div>
      {sub && <div className="text-[10.5px] text-faint">{sub}</div>}
    </div>
  )
}

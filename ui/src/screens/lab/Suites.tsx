import { useState } from 'react'
import { Play } from 'lucide-react'
import { meridianApi } from '../../api/client'
import type { ResultStatus, SuiteRun, SuiteSpec, SuiteSummary } from '../../api/types'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Button, Th, Td, Empty, SkeletonRows } from '../../components/ui/primitives'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SourceTag } from '../../components/ui/SourceTag'
import { Drawer } from '../../components/ui/Drawer'
import { useLive } from '../../lib/useLive'
import { fmtMs, fmtTime } from '../../lib/status'

const toStatus = (run: SuiteRun | undefined, spec: SuiteSpec, running: boolean): ResultStatus => {
  if (running) return 'RUNNING'
  if (spec.kind === 'unsupported') return 'UNSUPPORTED'
  if (spec.kind === 'not_implemented') return 'NOT_IMPLEMENTED'
  if (!run) return 'NOT_RUN'
  return run.status === 'pass' ? 'PASS' : 'FAIL'
}

/**
 * Product-surface suite and industry packs, from GET /api/suites. Each suite
 * runs on the same ARC process as the 17 scenarios and Phase 2, against the
 * same independent mutation log.
 */
export function Suites() {
  const { arcReady } = useData()
  const list = useLive(() => meridianApi.suites())
  const suites = list.data?.suites ?? []
  return (
    <>
      <PageHeader
        title="Suites & Industry Packs"
        description="The ARC product surface beyond the 17 scenarios and Phase 2, and industry packs that put ARC in front of a different business. Every pass is backed by ARC’s response and the pack’s own recorded effects."
        meta={<SourceTag source="live" at={list.fetchedAt} />}
      />
      {list.status === 'loading' ? <Section><SkeletonRows rows={4} cols={4} /></Section>
        : list.status !== 'live' ? <Section><Empty title="Suites unavailable">{list.error ?? 'The Meridian server is not reachable.'} Start the stack with <span className="font-mono">npm start</span>.</Empty></Section>
          : suites.length === 0 ? <Section><Empty title="No suites registered">The ARC harness has not initialized. Check that ARC Control is built and <span className="font-mono">npm start</span> succeeded.</Empty></Section>
            : <div className="space-y-5">{suites.map(s => <SuitePanel key={s.id} suite={s} enabled={arcReady} />)}</div>}
    </>
  )
}

function SuitePanel({ suite, enabled }: { key?: string; suite: SuiteSummary; enabled: boolean }) {
  const detail = useLive(() => meridianApi.suite(suite.id))
  const [running, setRunning] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<SuiteSpec | null>(null)
  const latest = new Map<string, SuiteRun>()
  for (const r of detail.data?.runs ?? []) latest.set(r.id, r)
  const specs = detail.data?.scenarios ?? []
  const counts = specs.reduce((acc, s) => { const st = toStatus(latest.get(s.id), s, false); acc[st] = (acc[st] ?? 0) + 1; return acc }, {} as Record<string, number>)

  const run = async (check: string) => {
    const keys = check === 'all' ? ['all', ...specs.map(s => s.id)] : [check]
    setRunning(prev => new Set([...prev, ...keys])); setError(null)
    try { await meridianApi.runSuite(suite.id, check); await detail.reload() }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setRunning(prev => { const n = new Set(prev); keys.forEach(k => n.delete(k)); return n }) }
  }
  const openRun = open ? latest.get(open.id) : undefined

  return (
    <Section pad={false}
      title={<span className="flex items-center gap-2">{suite.name}{suite.industry && <span className="rounded bg-canvas px-1.5 py-px text-[11px] font-normal text-muted">{suite.industry}</span>}</span>}
      aside={<div className="flex items-center gap-3">
        <span className="tnum text-[11.5px] text-muted">{counts.PASS ?? 0} pass · <span className={counts.FAIL ? 'font-semibold text-critical-ink' : ''}>{counts.FAIL ?? 0} fail</span> · {counts.UNSUPPORTED ?? 0} unsupported · {counts.NOT_RUN ?? 0} not run</span>
        <Button variant="primary" icon={<Play className="size-3.5" />} loading={running.has('all')} disabled={!enabled}
          title={enabled ? `POST /api/suites/${suite.id}/all` : 'Meridian server or ARC gateway not reachable'} onClick={() => run('all')}>Run suite</Button>
      </div>}>
      {suite.description && <p className="border-b border-line px-4 py-2.5 text-[12.5px] text-muted">{suite.description}</p>}
      {error && <div className="border-b border-critical/30 bg-critical-50 px-4 py-2 font-mono text-[12px] text-critical-ink">{error}</div>}
      {detail.status === 'loading' ? <SkeletonRows rows={4} cols={4} /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead><tr><Th>Check</Th><Th>Family</Th><Th>Status</Th><Th>Result</Th><Th>Last run</Th><Th /></tr></thead>
            <tbody>{specs.map(s => {
              const r = latest.get(s.id)
              const st = toStatus(r, s, running.has(s.id))
              return (
                <tr key={s.id} onClick={() => setOpen(s)} className="cursor-pointer transition-colors duration-100 hover:bg-canvas">
                  <Td><div className="font-medium text-ink">{s.label}</div><div className="font-mono text-[11px] text-faint">{s.id}</div></Td>
                  <Td className="text-[12px]">{s.family}</Td>
                  <Td><StatusBadge status={st} /></Td>
                  <Td className="max-w-[320px] truncate font-mono text-[11.5px] text-muted">{r?.error ?? (s.kind !== 'implemented' ? s.reason : r ? 'assertions held' : '—')}</Td>
                  <Td className="whitespace-nowrap font-mono text-[11.5px] text-muted">{r?.at ? <><div>{fmtTime(r.at)}</div><div className="text-faint">{fmtMs(r.elapsedMs)}</div></> : '—'}</Td>
                  <Td className="text-right">{s.kind === 'implemented' && (
                    <button onClick={e => { e.stopPropagation(); run(s.id) }} disabled={!enabled || running.size > 0}
                      className="rounded px-2 py-1 text-[12px] font-medium text-teal-ink transition-colors duration-150 hover:bg-mint-50 disabled:cursor-not-allowed disabled:text-faint">
                      {running.has(s.id) ? 'Running…' : 'Run'}
                    </button>)}</Td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
      <Drawer open={!!open} onClose={() => setOpen(null)} width={560} title={open?.label} subtitle={open && <span className="font-mono">{suite.id}:{open.id}</span>}>
        {open && (
          <div className="space-y-4 text-[12.5px]">
            {open.reason && <p className="rounded-md bg-canvas px-3 py-2 text-muted">{open.reason}</p>}
            {open.covers && open.covers.length > 0 && <div><div className="mb-1 font-medium text-ink">ARC routes exercised</div><ul className="font-mono text-[11.5px] text-muted">{open.covers.map(c => <li key={c}>{c}</li>)}</ul></div>}
            {openRun?.error && <div className="rounded-md border border-critical/30 bg-critical-50 px-3 py-2 font-mono text-[12px] text-ink">{openRun.error}</div>}
            {openRun ? <pre className="max-h-96 overflow-auto rounded-md bg-canvas p-3 font-mono text-[11px]">{JSON.stringify(openRun, null, 2)}</pre> : <p className="text-muted">Not run on this server.</p>}
          </div>
        )}
      </Drawer>
    </Section>
  )
}

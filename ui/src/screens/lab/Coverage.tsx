import { useState } from 'react'
import { meridianApi } from '../../api/client'
import type { CoverageReport, CoverageStatus } from '../../api/types'
import { PageHeader, Section, Button, Th, Td, Empty, SkeletonRows } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { useLive } from '../../lib/useLive'
import { fmtTime } from '../../lib/status'

const TONE: Record<CoverageStatus, string> = {
  verified: 'text-success bg-success-50',
  partial: 'text-warning-ink bg-warning-50',
  failing: 'text-critical-ink bg-critical-50',
  not_run: 'text-muted bg-neutral-50',
  gap: 'text-warning-ink bg-warning-50',
  unmapped: 'text-white bg-critical',
  unsupported: 'text-muted bg-neutral-50 ring-1 ring-inset ring-line-strong',
  not_implemented: 'text-muted bg-neutral-50 ring-1 ring-inset ring-line-strong',
}
const LABEL: Record<CoverageStatus, string> = {
  verified: 'VERIFIED', partial: 'PARTIAL', failing: 'FAILING', not_run: 'NOT RUN', gap: 'GAP', unmapped: 'UNMAPPED', unsupported: 'UNSUPPORTED', not_implemented: 'NOT IMPLEMENTED',
}

function CoverageBadge({ status }: { status: CoverageStatus }) {
  return <span className={`inline-flex rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ${TONE[status]}`}>{LABEL[status]}</span>
}

/**
 * Whole-product coverage. LIVE reads GET /api/coverage, which rebuilds the map
 * from ARC's source and the runs on this server; RECORDED is the map saved by
 * `npm run product`. Route coverage for the 17, Phase 2 and pack runners is per
 * suite; product-surface checks declare their routes per check.
 */
export function Coverage() {
  const live = useLive(() => meridianApi.coverage())
  const saved = useLive(() => meridianApi.productReport())
  const [view, setView] = useState<'live' | 'recorded'>('live')
  const [filter, setFilter] = useState<CoverageStatus | 'all'>('all')
  const recorded = saved.data?.report ?? null
  const report: CoverageReport | undefined = view === 'live' ? live.data : recorded?.coverage
  const rows = (report?.routes ?? []).filter(r => filter === 'all' || r.status === filter)

  return (
    <>
      <PageHeader
        title="Product Coverage"
        description="Every route ARC Control exposes and every capability it claims, with the check that exercises it. Routes are read from ARC’s own source, so new product surface appears here as UNMAPPED until something tests it or a gap says why not."
        actions={<Button onClick={() => { live.reload(); saved.reload() }}>Refresh</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px]">
        {(['live', 'recorded'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} disabled={v === 'recorded' && !recorded}
            className={`rounded-md px-3 py-1.5 transition-colors duration-150 disabled:cursor-not-allowed disabled:text-faint ${view === v ? 'bg-navy text-white' : 'text-muted hover:bg-surface hover:text-ink'}`}>
            {v === 'live' ? 'This server' : `Last product run${recorded ? ` · ${fmtTime(recorded.generatedAt)}` : ' (none saved)'}`}
          </button>
        ))}
        <span className="ml-2">{view === 'live' ? <SourceTag source="live" at={live.fetchedAt} /> : recorded && <SourceTag source="recorded" at={recorded.generatedAt} note={saved.data?.file} />}</span>
        {view === 'recorded' && recorded && <span className="text-muted">ARC <span className="font-mono">{recorded.revisions.arcControl?.slice(0, 7) ?? 'unknown'}</span> · run {recorded.pass ? <span className="font-medium text-success">passed</span> : <span className="font-medium text-critical-ink">failed: {recorded.failures.join(', ')}</span>}</span>}
      </div>

      {(view === 'live' ? live.status === 'loading' : saved.status === 'loading') ? <Section><SkeletonRows rows={6} cols={3} /></Section>
        : !report ? <Section><Empty title={view === 'live' ? 'Coverage unavailable' : 'No product run saved'}>{view === 'live' ? (live.error ?? 'Start the stack with npm start.') : 'Run npm run product with the stack running to save one.'}</Empty></Section>
          : (
            <>
              {report.unmapped.length > 0 && (
                <div className="mb-4 rounded-lg border border-critical/40 bg-critical-50 px-4 py-3 text-[13px]">
                  <span className="font-semibold text-critical-ink">{report.unmapped.length} ARC route{report.unmapped.length === 1 ? '' : 's'} with no check and no stated gap: </span>
                  <span className="font-mono text-[12px]">{report.unmapped.join(', ')}</span>
                </div>
              )}
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <Totals title={`${report.arcRoutes} ARC routes`} totals={report.routeTotals} />
                <Totals title={`${report.capabilities.length} capabilities`} totals={report.capabilityTotals} />
              </div>

              <Section title="Capabilities" pad={false} className="mb-5">
                <table className="w-full border-collapse">
                  <thead><tr><Th>Capability</Th><Th>Status</Th><Th>Checks</Th></tr></thead>
                  <tbody>{report.capabilities.map(c => (
                    <tr key={c.id}>
                      <Td className="font-medium text-ink">{c.label}</Td>
                      <Td><CoverageBadge status={c.status} /></Td>
                      <Td className="text-[11.5px]">{c.reason ? <span className="text-muted">{c.reason}</span> : c.checks.map(x => (
                        <span key={x.ref} className={`mr-2 inline-block font-mono ${x.status === 'fail' ? 'text-critical-ink' : x.status === 'pass' ? 'text-ink' : 'text-faint'}`}>{x.ref}</span>
                      ))}</Td>
                    </tr>
                  ))}</tbody>
                </table>
              </Section>

              <Section title="API routes" aside={<select value={filter} onChange={e => setFilter(e.target.value as CoverageStatus | 'all')} className="h-7 rounded-md border border-line-strong bg-surface px-2 text-[12px]">
                <option value="all">All statuses</option>
                {(['verified', 'failing', 'not_run', 'gap', 'unmapped'] as CoverageStatus[]).map(s => <option key={s} value={s}>{LABEL[s]}</option>)}
              </select>} pad={false}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead><tr><Th>Route</Th><Th>Status</Th><Th>Exercised by</Th></tr></thead>
                    <tbody>{rows.map(r => (
                      <tr key={r.route}>
                        <Td className="whitespace-nowrap font-mono text-[11.5px] text-ink">{r.route}</Td>
                        <Td><CoverageBadge status={r.status} /></Td>
                        <Td className="text-[11.5px]">{r.reason ? <span className="text-muted">{r.reason}</span> : r.checks.map(x => (
                          <span key={x.ref} className={`mr-2 inline-block font-mono ${x.status === 'fail' ? 'text-critical-ink' : x.status === 'pass' ? 'text-ink' : 'text-faint'}`}>{x.ref}</span>
                        ))}</Td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="border-t border-line px-4 py-2 text-[11.5px] text-faint">{report.note}</p>
              </Section>
            </>
          )}
    </>
  )
}

function Totals({ title, totals }: { title: string; totals: Partial<Record<CoverageStatus, number>> }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="text-[13px] font-semibold text-ink">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">{(Object.entries(totals) as Array<[CoverageStatus, number]>).map(([k, n]) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-[12px]"><CoverageBadge status={k} /><span className="tnum font-medium">{n}</span></span>
      ))}</div>
    </div>
  )
}

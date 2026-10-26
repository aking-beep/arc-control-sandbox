import { Fragment, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertOctagon, ChevronRight } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Tabs } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { InspectorColumn, Row } from '../../components/lab/InspectorColumn'
import { InspectorDetails, type DetailTab } from '../../components/lab/InspectorDetails'
import { TracePicker, type Pick } from '../../components/lab/TracePicker'
import { FindingAnatomy } from '../../components/lab/FindingAnatomy'
import { useUI } from '../../components/shell/UIContext'
import { ILLUSTRATIVE_TRACE, traceFromRun, type Trace } from '../../lib/trace'
import { findingTrace, withLiveRecord } from '../../data/findingTraces'
import { usePhase2 } from '../../api/Phase2Provider'
import { DOC_NOTE } from '../../data/findingDocs'
import { fmtTime, runStatus } from '../../lib/status'

export function Inspector() {
  const { runs } = useData()
  const phase2 = usePhase2()
  const { sourceFilter } = useUI()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<DetailTab>('timeline')
  const reduce = useReducedMotion()
  const showExample = sourceFilter !== 'live'

  const recent = useMemo(() => [...runs].reverse(), [runs])
  const pick = resolvePick(params, recent.map(r => r.id), showExample)
  const run = pick.kind === 'run' ? recent.find(r => r.id === pick.id) : undefined
  const findingDoc = pick.kind === 'finding' ? findingTrace(pick.id) : undefined
  const trace: Trace | null =
    findingDoc ? withLiveRecord(findingDoc, phase2.latestById.get(findingDoc.scenarioId)) :
    run ? traceFromRun(run) :
    pick.kind === 'example' && showExample ? ILLUSTRATIVE_TRACE : null
  const breach = !!trace && trace.actualEffect !== null && trace.actualEffect !== trace.expectedEffect

  const choose = (p: Pick) => {
    const n = new URLSearchParams()
    if (p.kind === 'finding') n.set('finding', p.id)
    if (p.kind === 'run') n.set('run', p.id)
    if (p.kind === 'example') n.set('example', '1')
    setParams(n)
  }

  return (
    <>
      <PageHeader
        title="Live Action Inspector"
        description="One action, end to end: what the agent asked for, what ARC Control decided, and what actually changed in Meridian. When those disagree, the control failed."
      />

      <TracePicker value={pick} onChange={choose} runs={recent} showExample={showExample} />

      {!trace ? (
        <div className="rounded-lg border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <p className="text-[14px] font-medium text-ink">No trace selected</p>
          <p className="mt-1 text-[13px] text-muted">Pick a known failure above, or run a scenario in the <Link to="/lab/scenarios" className="font-medium text-teal-ink hover:underline">Scenario Lab</Link> to inspect a real action.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <SourceTag source={trace.source} at={trace.at} note={trace.findingId ? DOC_NOTE : undefined} />
            <span className="text-[13px] font-medium text-ink">{trace.label}</span>
            <span className="font-mono text-[12px] text-muted">{trace.scenarioId}</span>
            {trace.source === 'live' && run && <StatusBadge status={runStatus(run)} />}
            {trace.findingId && <StatusBadge status={trace.pass === null ? 'NOT_RUN' : trace.pass ? 'PASS' : 'FAIL'} />}
            {trace.source === 'illustrative' && <span className="text-[12px] text-muted">Preview fixture from the brief. Not a real result.</span>}
          </div>

          {breach && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-critical/40 bg-critical-50 px-4 py-3">
              <AlertOctagon className="mt-0.5 size-4 shrink-0 text-critical-ink" />
              <div className="text-[13px] leading-relaxed text-ink">
                <span className="font-semibold text-critical-ink">Control failure{trace.findingId ? ` · ${trace.findingId}` : ''}.</span>{' '}
                Expected {trace.expectedEffect} business effect{trace.expectedEffect === 1 ? '' : 's'}; Meridian recorded {trace.actualEffect}.
                {trace.findingId && (
                  <span className="text-muted">{' '}
                    {trace.source === 'live'
                      ? <>Reproduced by the Phase 2 check <span className="font-mono">{trace.scenarioId}</span> on the latest run.</>
                      : <>Recorded in docs/PHASE_2_READINESS.md. Not retested in this window — run <span className="font-mono">{trace.scenarioId}</span> in the Scenario Lab to observe the current behaviour.</>}
                  </span>
                )}
              </div>
            </div>
          )}
          {trace.pass === false && !breach && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-critical/40 bg-critical-50 px-4 py-3">
              <AlertOctagon className="mt-0.5 size-4 shrink-0 text-critical-ink" />
              <div className="text-[13px] text-ink"><span className="font-semibold text-critical-ink">Scenario failed.</span> <span className="font-mono text-[12px]">{trace.error}</span></div>
            </div>
          )}

          <div key={trace.key} className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_24px_minmax(0,1fr)] items-stretch">
            {[0, 1, 2].map(i => (
              <Fragment key={i}>
                {i > 0 && <Connector />}
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                  className="flex"
                >
                  {i === 0 && <RequestColumn t={trace} />}
                  {i === 1 && <DecisionColumn t={trace} />}
                  {i === 2 && <EffectColumn t={trace} breach={breach} />}
                </motion.div>
              </Fragment>
            ))}
          </div>

          {trace.findingId && (
            <section className="mt-5 rounded-lg border border-line bg-surface">
              <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <h2 className="text-[13px] font-semibold text-ink">How the control failed</h2>
                <Link to={`/lab/findings/${trace.findingId}`} className="text-[12px] font-medium text-teal-ink hover:underline">Finding {trace.findingId} →</Link>
              </header>
              <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
                <div className="px-4 py-3">
                  <div className="text-[11.5px] font-medium text-muted">ARC should have</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink">{trace.expectedBehaviour}</p>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[11.5px] font-medium text-critical-ink">ARC did</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink">{trace.observedBehaviour}</p>
                </div>
              </div>
              <div className="p-4"><FindingAnatomy findingId={trace.findingId} variant="full" /></div>
            </section>
          )}

          <div className="mt-5 rounded-lg border border-line bg-surface">
            <div className="px-4 pt-1">
              <Tabs value={tab} onChange={setTab} items={[
                { id: 'timeline', label: 'Timeline' },
                { id: 'policy', label: 'Policy trace' },
                { id: 'connector', label: 'Connector events' },
                { id: 'evidence', label: 'Evidence' },
                { id: 'compare', label: 'Expected vs actual' },
              ]} />
            </div>
            <div className="p-4"><InspectorDetails tab={tab} t={trace} run={run} /></div>
          </div>
        </>
      )}
    </>
  )
}

/** URL → selection. With no explicit choice: latest live run, else the first known failure. */
function resolvePick(params: URLSearchParams, runIds: string[], showExample: boolean): Pick {
  const f = params.get('finding')
  if (f && findingTrace(f)) return { kind: 'finding', id: f }
  const r = params.get('run')
  if (r && runIds.includes(r)) return { kind: 'run', id: r }
  if (params.get('example') && showExample) return { kind: 'example' }
  if (runIds.length) return { kind: 'run', id: runIds[0] }
  return { kind: 'finding', id: 'ARC-SEC-001' }
}

function Connector() {
  return <div className="flex items-center justify-center text-line-strong"><ChevronRight className="size-4" /></div>
}

const pending = (t: Trace, live: string) => <span className="text-faint">{t.findingId ? 'not reported per check' : live}</span>

function RequestColumn({ t }: { t: Trace }) {
  const amount = typeof t.params.amount === 'number' ? `$${t.params.amount.toLocaleString()}` : null
  const verdict = t.headline?.request ?? (amount ? `${amount} ${t.tool.split('.')[1]} requested` : `${t.tool} requested`)
  return (
    <InspectorColumn step="Agent request" verdict={<span className="text-ink">{verdict}</span>} sub={t.requested}>
      <Row k="Agent" mono>{t.agent}</Row>
      <Row k="Tool" mono>{t.tool}</Row>
      {t.parallel && <Row k="Parallelism"><span className="font-medium text-ink">{t.parallel} concurrent requests</span></Row>}
      <Row k="Parameters" mono>
        <div className="space-y-0.5">{Object.entries(t.params).map(([k, v]) => <div key={k}><span className="text-faint">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}</div>)}</div>
      </Row>
      <Row k="Timestamp" mono>{t.at ? fmtTime(t.at) : pending(t, '—')}</Row>
      <Row k="Correlation ID" mono>{t.correlationId ?? pending(t, 'not returned by runner')}</Row>
    </InspectorColumn>
  )
}

function DecisionColumn({ t }: { t: Trace }) {
  const color = t.decision === 'DENY' ? 'text-critical-ink' : t.decision === 'ALLOW' ? 'text-success' : t.decision === 'REQUIRE_APPROVAL' ? 'text-warning-ink' : 'text-muted'
  const label = t.headline?.decision ?? (t.decision ?? (t.httpStatus ? `REFUSED · HTTP ${t.httpStatus}` : 'NO DECISION')).replace('_', ' ')
  const sub = t.headline?.decisionSub ?? (t.policyId ? <><span className="font-mono">{t.policyId}</span>{t.inferredRule && <> / <span className="font-mono">{t.inferredRule}</span></>}</> : 'Refused before policy evaluation')
  return (
    <InspectorColumn step="ARC Control decision" verdict={<span className={color}>{label}</span>} sub={sub}>
      <Row k="Authentication">{t.authentication}</Row>
      <Row k="Matched policy" mono>{t.policyId ?? '—'}</Row>
      <Row k="Rule">{t.inferredRule ? <><span className="font-mono text-[12px]">{t.inferredRule}</span> <span className="text-[11px] text-faint">inferred</span></> : '—'}</Row>
      <Row k="Approval">{t.approvalState}</Row>
      <Row k="Execution">{t.executionAuthorized ? <span className="text-success">Authorized</span> : <span className="text-ink">Not authorized</span>}</Row>
      <Row k="Evidence ID" mono>{t.evidenceId ?? pending(t, '—')}</Row>
    </InspectorColumn>
  )
}

function EffectColumn({ t, breach }: { t: Trace; breach: boolean }) {
  const n = t.actualEffect
  const unit = t.tool.startsWith('finance') ? 'refund' : t.tool.startsWith('it') ? 'deployment' : t.tool.startsWith('sales') ? 'export' : 'mutation'
  return (
    <InspectorColumn step="Meridian business effect" tone={breach ? 'critical' : undefined}
      verdict={<span className={breach ? 'text-critical-ink' : 'text-ink'}>{n === null ? 'Effect unknown' : `${n} ${unit}${n === 1 ? '' : 's'} executed`}</span>}
      sub={t.actualEffectBasis}>
      <Row k="Target system" mono>{t.targetSystem}</Row>
      <Row k="Execution attempt">{t.executionAuthorized ? `Connector called${t.parallel ? ` ×${t.parallel}` : ''}` : 'Not attempted'}</Row>
      <Row k="Connector" mono>{t.connector}</Row>
      <Row k="Mutation count" mono>expected {t.expectedEffect} · <span className={breach ? 'font-semibold text-critical-ink' : ''}>observed {n ?? '?'}</span></Row>
      <Row k="Before → after"><span className="text-faint">not captured by backend</span></Row>
      <Row k="Final outcome" mono>{t.outcome ?? '—'}</Row>
    </InspectorColumn>
  )
}

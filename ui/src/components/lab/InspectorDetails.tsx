import { Link } from 'react-router-dom'
import type { ScenarioRun } from '../../api/types'
import type { Trace } from '../../lib/trace'
import { fmtMs } from '../../lib/status'
import { VerificationBadge } from '../ui/StatusBadge'
import { useData } from '../../api/DataProvider'
import { EvidenceRecord } from './EvidenceRecord'

export type DetailTab = 'timeline' | 'policy' | 'connector' | 'evidence' | 'compare'

export function InspectorDetails({ tab, t, run }: { tab: DetailTab; t: Trace; run?: ScenarioRun }) {
  const { health } = useData()
  if (tab === 'timeline') {
    const steps: Array<{ label: string; detail: string; tone?: 'ok' | 'bad' | 'muted' }> = [
      { label: 'Request sent', detail: `${t.agent} → POST /v1/actions · ${t.tool}` },
      { label: 'Authentication', detail: t.authentication, tone: t.authentication.startsWith('Agent key') ? 'ok' : 'bad' },
      { label: 'Policy evaluation', detail: t.policyId ? `${t.policyId} → ${t.decision}` : 'Not reached', tone: t.policyId ? undefined : 'muted' },
      { label: 'Approval', detail: t.approvalState, tone: 'muted' },
      { label: 'Connector execution', detail: t.executionAuthorized ? `${t.connector} → ${t.targetSystem}` : 'Not executed', tone: t.executionAuthorized ? 'ok' : 'muted' },
      { label: 'Meridian mutation', detail: t.actualEffect === null ? 'Unknown' : `${t.actualEffect} recorded (expected ${t.expectedEffect})`, tone: t.actualEffect !== null && t.actualEffect !== t.expectedEffect ? 'bad' : undefined },
    ]
    const dot = { ok: 'bg-success', bad: 'bg-critical', muted: 'bg-line-strong' }
    return (
      <div>
        <ol className="relative grid grid-cols-6 gap-3">
          <div className="absolute left-0 right-0 top-[5px] h-px bg-line" />
          {steps.map(s => (
            <li key={s.label} className="relative">
              <span className={`relative block size-2.5 rounded-full ring-4 ring-white ${s.tone ? dot[s.tone] : 'bg-navy'}`} />
              <div className="mt-2.5 text-[12px] font-medium text-ink">{s.label}</div>
              <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{s.detail}</div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[11.5px] text-faint">
          Ordered by the runner’s execution path. Per-step timestamps are not returned; total ARC latency {fmtMs(t.latencyMs)}, scenario duration {fmtMs(t.elapsedMs)}.
        </p>
      </div>
    )
  }
  if (tab === 'policy') {
    return (
      <div>
        <div className="mb-2 text-[12px] text-muted">Rules in evaluation order for <span className="font-mono text-ink">{t.policyId ?? '—'}</span>. ARC returns the policy id, not the matched rule; the highlighted rule is inferred from the policy definition and request parameters.</div>
        <ol className="divide-y divide-line rounded-md border border-line">
          {t.rules.map((r, i) => (
            <li key={r.id} className={`grid grid-cols-[28px_150px_1fr_150px] items-center gap-3 px-3 py-2 text-[12px] ${r.id === t.inferredRule ? 'bg-mint-50' : ''}`}>
              <span className="font-mono text-faint">{i + 1}</span>
              <span className="font-mono text-ink">{r.id}</span>
              <span className="text-muted"><span className="font-mono text-ink">when</span> {r.when} — {r.reason}</span>
              <span className={`text-right font-mono font-medium ${r.effect === 'DENY' ? 'text-critical-ink' : r.effect === 'ALLOW' ? 'text-success' : 'text-warning-ink'}`}>{r.effect}</span>
            </li>
          ))}
          <li className="grid grid-cols-[28px_150px_1fr_150px] gap-3 px-3 py-2 text-[12px] text-muted"><span /> <span className="font-mono">fallback</span><span>no authorized rule matched</span><span className="text-right font-mono">DENY</span></li>
        </ol>
      </div>
    )
  }
  if (tab === 'connector') {
    return (
      <dl className="grid max-w-2xl grid-cols-[180px_1fr] gap-y-2 text-[12.5px]">
        <dt className="text-muted">Connector</dt><dd className="font-mono text-[12px]">{t.connector}</dd>
        <dt className="text-muted">Allowed hosts</dt><dd className="font-mono text-[12px]">127.0.0.1</dd>
        <dt className="text-muted">Timeout</dt><dd className="font-mono text-[12px]">5000 ms</dd>
        <dt className="text-muted">Target</dt><dd className="font-mono text-[12px]">POST {t.targetSystem}</dd>
        <dt className="text-muted">Auth header</dt><dd className="font-mono text-[12px]">x-meridian-connector-token · held server-side, never shown</dd>
        <dt className="text-muted">Invoked</dt><dd>{t.executionAuthorized ? 'Yes — ARC outcome was executed' : 'No'}</dd>
        <dt className="text-muted">Correlation ID</dt><dd className="font-mono text-[12px]">{t.correlationId ?? <span className="font-sans text-faint">not returned</span>}</dd>
        <dt className="text-muted">Connector response</dt><dd className="text-faint">Not exposed by the runner. Meridian's mutation log does not carry the correlation id, so effects are matched by count, not by id.</dd>
      </dl>
    )
  }
  if (tab === 'evidence') {
    return (
      <div className="flex flex-wrap items-start gap-8">
        <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[12.5px]">
          <dt className="text-muted">Evidence ID</dt><dd className="font-mono text-[12px]">{t.evidenceId ? (t.source === 'live' ? <Link to={`/lab/evidence?q=${t.evidenceId}`} className="text-teal-ink hover:underline">{t.evidenceId}</Link> : t.evidenceId) : '—'}</dd>
          <dt className="text-muted">Record readable</dt><dd>{t.evidenceReadable === null ? 'n/a' : t.evidenceReadable ? 'Yes (GET /v1/evidence → 200)' : 'No'}</dd>
          <dt className="text-muted">Correlation ID</dt><dd className="font-mono text-[12px]">{t.correlationId ?? '—'}</dd>
        </dl>
        <div className="space-y-1.5">
          <div className="text-[12px] text-muted">Verification</div>
          <div className="flex flex-wrap gap-1.5">
            <VerificationBadge state="not_assessable" />
            <VerificationBadge state="externally_anchored" dim />
          </div>
          <p className="max-w-sm text-[11.5px] text-faint">Readable is not verified. Integrity is not assessed from this UI, and no external anchor is configured.</p>
        </div>
        {t.evidenceId && t.source === 'live' && (
          <div className="w-full"><EvidenceRecord id={t.evidenceId} enabled={health.status === 'live' && !!health.data?.gatewayConfigured} /></div>
        )}
        {!t.evidenceId && t.findingId && <p className="w-full text-[12px] text-muted">The Phase 2 check does not collect evidence ids for its requests, so there is no record to open here.</p>}
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <table className="w-full max-w-3xl text-[12.5px]">
        <thead><tr className="text-left text-[11px] text-muted"><th className="py-1.5 font-medium">Check</th><th className="font-medium">Expected</th><th className="font-medium">Actual</th><th className="font-medium">Match</th></tr></thead>
        <tbody className="divide-y divide-line">
          <tr><td className="py-2 text-muted">Business effects</td><td className="font-mono">{t.expectedEffect}</td><td className="font-mono">{t.actualEffect ?? 'unknown'}</td><td>{t.actualEffect === null ? '—' : t.actualEffect === t.expectedEffect ? <span className="text-success">yes</span> : <span className="font-medium text-critical-ink">no</span>}</td></tr>
          <tr><td className="py-2 text-muted">Scenario assertions</td><td>all pass</td><td>{t.pass === null ? '—' : t.pass ? 'all pass' : 'failed'}</td><td>{t.pass ? <span className="text-success">yes</span> : <span className="font-medium text-critical-ink">no</span>}</td></tr>
        </tbody>
      </table>
      {run && <details className="rounded-md border border-line"><summary className="cursor-pointer px-3 py-2 text-[12px] font-medium">Raw runner JSON</summary><pre className="max-h-64 overflow-auto border-t border-line bg-canvas px-3 py-2 font-mono text-[11px]">{JSON.stringify(run, null, 2)}</pre></details>}
    </div>
  )
}

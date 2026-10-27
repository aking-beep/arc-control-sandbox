import { Link } from 'react-router-dom'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section } from '../../components/ui/primitives'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { runStatus, fmtTime } from '../../lib/status'
import { usePhase2 } from '../../lib/phase2'

type Avail =
  | { kind: 'scenario'; id: string; note?: string }
  | { kind: 'phase2'; id: string; note?: string }
  | { kind: 'not_implemented'; ref?: string }
  | { kind: 'unsupported'; reason: string }

const CATEGORIES: Array<{ name: string; experiments: Array<{ label: string; avail: Avail }> }> = [
  { name: 'Identity', experiments: [
    { label: 'Invalid credentials', avail: { kind: 'scenario', id: 'wrong-agent', note: 'Cross-department key' } },
    { label: 'Rotated-away credential', avail: { kind: 'phase2', id: 'revoked-credential' } },
    { label: 'Suspended agents', avail: { kind: 'scenario', id: 'suspend-agent' } },
    { label: 'Unauthorized tool access', avail: { kind: 'scenario', id: 'unknown-tool' } },
  ] },
  { name: 'Authorization', experiments: [
    { label: 'Policy changes before execution', avail: { kind: 'phase2', id: 'policy-change-before-release', note: 'ARC-SEC-002' } },
    { label: 'Wrong-role approver', avail: { kind: 'phase2', id: 'wrong-role-approval' } },
    { label: 'Owner self-approval', avail: { kind: 'phase2', id: 'owner-self-approval' } },
    { label: 'Approval replay', avail: { kind: 'scenario', id: 'approval-replay' } },
  ] },
  { name: 'Concurrency', experiments: [
    { label: 'Duplicate requests (sequential)', avail: { kind: 'scenario', id: 'idempotency', note: 'Two sequential requests' } },
    { label: 'Duplicate requests (parallel)', avail: { kind: 'phase2', id: 'concurrent-idempotency', note: 'ARC-SEC-001' } },
    { label: 'Approval races', avail: { kind: 'phase2', id: 'approval-consume-race' } },
  ] },
  { name: 'Connectors', experiments: [
    { label: 'Timeout after effect', avail: { kind: 'phase2', id: 'connector-timeout-after-effect', note: 'Reproduces a limitation' } },
    { label: 'Failure (HTTP 500) on write', avail: { kind: 'phase2', id: 'connector-http-500-write' } },
    { label: 'Redirect off allowlist', avail: { kind: 'phase2', id: 'connector-redirect-refused' } },
    { label: 'Unknown execution outcome', avail: { kind: 'unsupported', reason: 'ARC 2.0 has no reconciliation for ambiguous connector outcomes; the timeout check shows the effect stays' } },
    { label: 'Kill switch during in-flight call', avail: { kind: 'phase2', id: 'kill-switch-blocks-new-work' } },
    { label: 'Direct backend bypass', avail: { kind: 'scenario', id: 'direct-bypass' } },
  ] },
  { name: 'MCP security', experiments: [
    { label: 'Manifest drift detected', avail: { kind: 'phase2', id: 'mcp-manifest-drift' } },
    { label: 'Manifest drift blocks the tool', avail: { kind: 'phase2', id: 'mcp-drift-runtime-enforcement' } },
    { label: 'Tool poisoning', avail: { kind: 'phase2', id: 'mcp-poisoned-metadata' } },
    { label: 'Renamed tool or changed schema', avail: { kind: 'not_implemented', ref: 'MASTER_BUILD_PLAN 24' } },
  ] },
  { name: 'Audit', experiments: [
    { label: 'Evidence tampering', avail: { kind: 'phase2', id: 'evidence-bundle-tamper' } },
    { label: 'Audit record edit', avail: { kind: 'phase2', id: 'audit-chain-detects-edit' } },
    { label: 'Missing tail records', avail: { kind: 'phase2', id: 'audit-supplied-head-detects-truncation', note: 'Only with a caller-supplied head' } },
    { label: 'External anchor', avail: { kind: 'unsupported', reason: 'Nothing writes the audit head outside ARC (external-anchor-persistence)' } },
  ] },
]

export function FaultInjection() {
  const { latestRunById, running, runScenario, runPhase2, health } = useData()
  const p2 = usePhase2()
  const live = health.status === 'live' && health.data?.gatewayConfigured === true
  const all = CATEGORIES.flatMap(c => c.experiments)
  const runnable = (a: Avail) => a.kind === 'scenario' || a.kind === 'phase2'
  const enabled = all.filter(e => runnable(e.avail)).length

  return (
    <>
      <PageHeader
        title="Fault Injection"
        description="Controlled failure experiments. Only experiments backed by a real integration scenario or Phase 2 check can be run; everything else is listed so the gaps stay visible."
        meta={<span className="text-[12px] text-muted"><span className="tnum font-medium text-ink">{enabled}</span> of {all.length} experiments executable today</span>}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CATEGORIES.map(c => (
          <Section key={c.name} title={c.name} aside={<span className="font-mono text-[11px] text-faint">{c.experiments.filter(e => runnable(e.avail)).length}/{c.experiments.length}</span>} pad={false}>
            <ul className="divide-y divide-line">
              {c.experiments.map(e => {
                const a = e.avail
                const enabledRow = runnable(a)
                const run = a.kind === 'scenario' ? latestRunById.get(a.id) : undefined
                const check = a.kind === 'phase2' ? p2.resolve(a.id) : undefined
                const key = a.kind === 'phase2' ? `p2:${a.id}` : a.kind === 'scenario' ? a.id : ''
                return (
                  <li key={e.label} className={`px-4 py-3 ${enabledRow ? '' : 'bg-canvas/40'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-[13px] ${enabledRow ? 'font-medium text-ink' : 'text-muted'}`}>{e.label}</span>
                      {a.kind === 'scenario' ? <StatusBadge status={runStatus(run, running.has(a.id))} />
                        : check ? <StatusBadge status={check.status} />
                          : <StatusBadge status={a.kind === 'unsupported' ? 'UNSUPPORTED' : 'NOT_IMPLEMENTED'} />}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-[11.5px]">
                      <span className="text-faint">
                        {a.kind === 'scenario' && <>Scenario <Link to={`/lab/scenarios?focus=${a.id}`} className="font-mono text-teal-ink hover:underline">{a.id}</Link>{a.note && <> · {a.note}</>}{run && <> · {fmtTime(run.at)}</>}</>}
                        {a.kind === 'phase2' && <>Phase 2 <Link to={`/lab/scenarios?focus=${a.id}`} className="font-mono text-teal-ink hover:underline">{a.id}</Link>{a.note && <> · {a.note}</>}{check?.at && <> · {fmtTime(check.at)} ({check.source})</>}</>}
                        {a.kind === 'not_implemented' && <>No scenario code{a.ref && <> · <span className="font-mono">{a.ref}</span></>}</>}
                        {a.kind === 'unsupported' && a.reason}
                      </span>
                      {(a.kind === 'scenario' || a.kind === 'phase2') && (
                        <button onClick={() => a.kind === 'phase2' ? runPhase2(a.id) : runScenario(a.id)} disabled={(a.kind === 'phase2' ? !p2.runnable : !live) || running.has(key)}
                          className="shrink-0 rounded px-2 py-0.5 text-[12px] font-medium text-teal-ink transition-colors duration-150 hover:bg-mint-50 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent">
                          {running.has(key) ? 'Running…' : 'Inject'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Section>
        ))}
      </div>
    </>
  )
}

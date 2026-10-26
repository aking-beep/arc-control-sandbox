import { Link } from 'react-router-dom'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section } from '../../components/ui/primitives'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { runStatus, fmtTime } from '../../lib/status'

type Avail = { kind: 'scenario'; id: string; note?: string } | { kind: 'not_implemented'; ref?: string } | { kind: 'unsupported'; reason: string }

const CATEGORIES: Array<{ name: string; experiments: Array<{ label: string; avail: Avail }> }> = [
  { name: 'Identity', experiments: [
    { label: 'Invalid credentials', avail: { kind: 'scenario', id: 'wrong-agent', note: 'Cross-department key; a malformed/absent key test is not implemented' } },
    { label: 'Suspended agents', avail: { kind: 'scenario', id: 'suspend-agent' } },
    { label: 'Unauthorized tool access', avail: { kind: 'scenario', id: 'unknown-tool' } },
  ] },
  { name: 'Authorization', experiments: [
    { label: 'Policy changes before execution', avail: { kind: 'not_implemented', ref: 'MP-31 · ARC-SEC-002' } },
    { label: 'Privilege escalation', avail: { kind: 'not_implemented', ref: 'MP-18 / MP-19' } },
    { label: 'Approval replay', avail: { kind: 'scenario', id: 'approval-replay' } },
  ] },
  { name: 'Concurrency', experiments: [
    { label: 'Duplicate requests (sequential)', avail: { kind: 'scenario', id: 'idempotency', note: 'Two sequential requests. The parallel case (ARC-SEC-001) is not in the repo' } },
    { label: 'Approval races', avail: { kind: 'not_implemented', ref: 'MP-36' } },
    { label: 'Concurrent policy changes', avail: { kind: 'not_implemented', ref: 'MP-31' } },
  ] },
  { name: 'Connectors', experiments: [
    { label: 'Timeout', avail: { kind: 'not_implemented', ref: 'MP-34' } },
    { label: 'Failure (HTTP 500)', avail: { kind: 'not_implemented', ref: 'MP-33' } },
    { label: 'Delayed response', avail: { kind: 'not_implemented' } },
    { label: 'Unknown execution outcome', avail: { kind: 'unsupported', reason: 'ARC 2.0 has no reconciliation for ambiguous connector outcomes' } },
    { label: 'Kill switch (tool disable)', avail: { kind: 'scenario', id: 'disable-tool' } },
    { label: 'Direct backend bypass', avail: { kind: 'scenario', id: 'direct-bypass' } },
  ] },
  { name: 'MCP security', experiments: [
    { label: 'Manifest drift', avail: { kind: 'not_implemented', ref: 'MP-26' } },
    { label: 'Tool poisoning', avail: { kind: 'not_implemented', ref: 'MP-25' } },
    { label: 'Unauthorized tool changes', avail: { kind: 'not_implemented', ref: 'MP-24' } },
  ] },
  { name: 'Audit', experiments: [
    { label: 'Evidence tampering', avail: { kind: 'not_implemented', ref: 'MP-37' } },
    { label: 'Missing records', avail: { kind: 'not_implemented' } },
    { label: 'Audit-chain modification', avail: { kind: 'unsupported', reason: 'Detection needs an external anchor (MP-39); none configured' } },
  ] },
]

export function FaultInjection() {
  const { latestRunById, running, runScenario, health } = useData()
  const live = health.status === 'live'
  const all = CATEGORIES.flatMap(c => c.experiments)
  const enabled = all.filter(e => e.avail.kind === 'scenario').length

  return (
    <>
      <PageHeader
        title="Fault Injection"
        description="Controlled failure experiments. Only experiments backed by real scenario code in the sandbox can be run; everything else is listed so the gaps stay visible."
        meta={<span className="text-[12px] text-muted"><span className="tnum font-medium text-ink">{enabled}</span> of {all.length} experiments executable today</span>}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CATEGORIES.map(c => (
          <Section key={c.name} title={c.name} aside={<span className="font-mono text-[11px] text-faint">{c.experiments.filter(e => e.avail.kind === 'scenario').length}/{c.experiments.length}</span>} pad={false}>
            <ul className="divide-y divide-line">
              {c.experiments.map(e => {
                const a = e.avail
                const enabledRow = a.kind === 'scenario'
                const run = a.kind === 'scenario' ? latestRunById.get(a.id) : undefined
                return (
                  <li key={e.label} className={`px-4 py-3 ${enabledRow ? '' : 'bg-canvas/40'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-[13px] ${enabledRow ? 'font-medium text-ink' : 'text-muted'}`}>{e.label}</span>
                      {a.kind === 'scenario'
                        ? <StatusBadge status={runStatus(run, running.has(a.id))} />
                        : <StatusBadge status={a.kind === 'unsupported' ? 'UNSUPPORTED' : 'NOT_IMPLEMENTED'} />}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-[11.5px]">
                      <span className="text-faint">
                        {a.kind === 'scenario' && <>Scenario <Link to={`/lab/scenarios?focus=${a.id}`} className="font-mono text-teal-ink hover:underline">{a.id}</Link>{a.note && <> · {a.note}</>}{run && <> · {fmtTime(run.at)}</>}</>}
                        {a.kind === 'not_implemented' && <>No scenario code{a.ref && <> · <span className="font-mono">{a.ref}</span></>}</>}
                        {a.kind === 'unsupported' && a.reason}
                      </span>
                      {a.kind === 'scenario' && (
                        <button onClick={() => runScenario(a.id)} disabled={!live || running.has(a.id)}
                          className="shrink-0 rounded px-2 py-0.5 text-[12px] font-medium text-teal-ink transition-colors duration-150 hover:bg-mint-50 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent">
                          {running.has(a.id) ? 'Running…' : 'Inject'}
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

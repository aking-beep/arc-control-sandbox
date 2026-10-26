import { Download, Printer } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Th, Td, Button } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FINDINGS, LIMITATIONS, BASELINE_NOTE, integrationBaseline, phase2Baseline, assuranceBaseline } from '../../data/baseline'
import { ORIGINAL } from '../../data/catalog'
import type { IntegrationReport } from '../../api/types'
import { runStatus, fmtTime } from '../../lib/status'
import { useReports, phase2Counts } from '../../api/ReportsProvider'
import { ReportImport } from '../../components/lab/ReportImport'

const PHASE2_SAMPLE = `{
  "suite": "phase2",
  "generatedAt": "<ISO time>",
  "runner": "<runner name>",
  "results": [
    { "id": "P2-IDEM-CONCURRENT", "status": "FAIL", "findingId": "ARC-SEC-001",
      "expected": "1 refund", "observed": "8 refunds" }
  ]
}`

const VERIFICATION = 'independent test runner over local HTTP (not external security certification)'

export function Reports() {
  const { latestRunById, health } = useData()
  const { integration: recInt, phase2: recP2, clear } = useReports()
  const p2 = recP2 ? phase2Counts(recP2.report) : null
  const results = ORIGINAL.map(s => latestRunById.get(s.id)).filter(Boolean)
  const passed = results.filter(r => r!.pass).length
  const complete = results.length === 17

  const exportReport = () => {
    const report: IntegrationReport = {
      generatedAt: new Date().toISOString(),
      runner: 'arc-control-sandbox-starter (browser export of latest session runs)',
      verification: VERIFICATION,
      environment: { name: 'Meridian Commerce synthetic enterprise', mode: health.data?.mode ?? 'unknown', gatewayConfigured: !!health.data?.gatewayConfigured },
      total: results.length, passed, failed: results.length - passed,
      passedAll: complete && passed === 17,
      results: results as IntegrationReport['results'],
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `integration-${report.generatedAt.replace(/:/g, '-')}.json`; a.click()
  }

  return (
    <>
      <PageHeader title="Validation Reports"
        description="Reports compile what was actually executed. Each one carries its verification level verbatim, and a report never claims certification."
        actions={<><ReportImport /><Button icon={<Printer className="size-3.5" />} onClick={() => window.print()}>Print summary</Button><Button variant="primary" icon={<Download className="size-3.5" />} onClick={exportReport} disabled={results.length === 0}>Export session report</Button></>} />

      <Section title="Available reports" pad={false} className="mb-5">
        <table className="w-full border-collapse">
          <thead><tr><Th>Report</Th><Th>Source</Th><Th>Generated</Th><Th>Totals</Th><Th>Availability</Th></tr></thead>
          <tbody>
            <tr><Td className="font-medium">Current session · original integration</Td><Td><SourceTag source="live" /></Td><Td className="font-mono text-[11.5px]">{results.length ? fmtTime(results[results.length - 1]!.at) : '—'}</Td><Td className="font-mono text-[11.5px]">{results.length ? `${passed}/${results.length} passed` : 'not run'}</Td><Td className="text-[12px]">{complete ? 'Complete (17/17 executed)' : `${results.length} of 17 executed`}</Td></tr>
            {recInt ? (
              <tr><Td className="font-medium font-mono text-[12px]">{recInt.fileName}</Td><Td><SourceTag source="recorded" /></Td><Td className="font-mono text-[11.5px]">{fmtTime(recInt.report.generatedAt)}</Td><Td className="font-mono text-[11.5px]">{recInt.report.passed}/{recInt.report.total} passed</Td>
                <Td className="text-[12px] text-muted">Loaded {fmtTime(recInt.loadedAt)} · runner <span className="font-mono">{recInt.report.runner}</span> <button onClick={() => clear('integration')} className="ml-2 font-medium text-teal-ink hover:underline">Unload</button></Td></tr>
            ) : (
              <tr><Td className="font-medium">reports/latest.json</Td><Td><SourceTag source="proposed" /></Td><Td>—</Td><Td>—</Td><Td className="text-[12px] text-muted">Written by <span className="font-mono">npm run validate</span>. Load the file here, or serve it via GET /api/reports.</Td></tr>
            )}
            <tr><Td className="font-medium">Original integration baseline</Td><Td><SourceTag source="baseline" note={BASELINE_NOTE} /></Td><Td>—</Td><Td className="font-mono text-[11.5px]">{integrationBaseline.passed}/{integrationBaseline.total} passed</Td><Td className="text-[12px] text-muted">Figure only; no file</Td></tr>
            {recP2 && p2 && (
              <tr><Td className="font-medium font-mono text-[12px]">{recP2.fileName}</Td><Td><SourceTag source="recorded" /></Td><Td className="font-mono text-[11.5px]">{fmtTime(recP2.report.generatedAt)}</Td><Td className="font-mono text-[11.5px]">{p2.pass}P · {p2.fail}F · {p2.unsupported}U · {p2.notImplemented}NI{p2.error ? ` · ${p2.error}E` : ''}</Td>
                <Td className="text-[12px] text-muted">Phase 2 report · runner <span className="font-mono">{recP2.report.runner}</span> <button onClick={() => clear('phase2')} className="ml-2 font-medium text-teal-ink hover:underline">Unload</button></Td></tr>
            )}
            <tr><Td className="font-medium">Phase 2 security baseline</Td><Td><SourceTag source="baseline" note={BASELINE_NOTE} /></Td><Td>—</Td><Td className="font-mono text-[11.5px]">{phase2Baseline.pass}P · {phase2Baseline.fail}F · {phase2Baseline.unsupported}U · {phase2Baseline.notImplemented}NI</Td><Td className="text-[12px] text-muted">User-reported figure. No report file in the repository.</Td></tr>
          </tbody>
        </table>
      </Section>

      {!recP2 && (
        <details className="mb-5 rounded-lg border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-2.5 text-[13px] font-medium text-ink">Phase 2 report format <span className="ml-2 font-normal"><SourceTag source="proposed" /></span></summary>
          <div className="border-t border-line px-4 py-3">
            <p className="mb-2 text-[12.5px] text-muted">No Phase 2 runner exists at c1e8c05. A file in this shape loads as RECORDED and replaces the baseline everywhere. Allowed statuses: PASS, FAIL, UNSUPPORTED, NOT_IMPLEMENTED, ERROR, NOT_RUN.</p>
            <pre className="overflow-auto rounded-md bg-canvas px-3 py-2 font-mono text-[11.5px] text-ink">{PHASE2_SAMPLE}</pre>
          </div>
        </details>
      )}

      {recP2 && (
        <Section title={`Phase 2 results · ${recP2.fileName}`} aside={<SourceTag source="recorded" at={recP2.report.generatedAt} />} pad={false} className="mb-5">
          <table className="w-full border-collapse">
            <thead><tr><Th>Check</Th><Th>Status</Th><Th>Expected</Th><Th>Observed</Th><Th>Finding</Th></tr></thead>
            <tbody>{recP2.report.results.map(r => (
              <tr key={r.id}><Td><div className="font-mono text-[12px]">{r.id}</div>{r.label && <div className="text-[12px] text-muted">{r.label}</div>}</Td><Td><StatusBadge status={r.status} /></Td><Td className="text-[12px]">{r.expected ?? '—'}</Td><Td className={`text-[12px] ${r.status === 'FAIL' ? 'font-medium text-critical-ink' : ''}`}>{r.observed ?? '—'}</Td><Td className="font-mono text-[12px]">{r.findingId ?? '—'}</Td></tr>
            ))}</tbody>
          </table>
        </Section>
      )}

      <article className="rounded-lg border border-line bg-surface px-10 py-8">
        <header className="border-b border-line pb-5">
          <div className="text-[12px] text-muted">Meridian Commerce synthetic enterprise · ARC Control 2.0 validation</div>
          <h2 className="mt-1 text-[20px] font-semibold tracking-tight">Validation summary</h2>
          <p className="mt-2 rounded bg-canvas px-3 py-2 font-mono text-[11.5px] text-ink">Verification level: {VERIFICATION}</p>
        </header>

        <section className="mt-6 max-w-3xl space-y-3 text-[13.5px] leading-relaxed text-ink">
          <h3 className="text-[14px] font-semibold">Executive summary</h3>
          <p>{results.length === 0
            ? `No integration scenarios were executed in this session. The recorded baseline reports ${integrationBaseline.passed} of ${integrationBaseline.total} original scenarios passing.`
            : `${passed} of ${results.length} original integration scenarios executed in this session passed${complete ? '' : `; ${17 - results.length} were not run`}.`}</p>
          <p>Phase 2 security testing (user-reported baseline) recorded {phase2Baseline.pass} passing checks, <strong className="text-critical-ink">{phase2Baseline.fail} failing checks</strong>, {phase2Baseline.unsupported} unsupported capabilities and {phase2Baseline.notImplemented} unimplemented test. Unsupported and unimplemented checks are not passes.</p>
          <p>Two critical findings remain open: {FINDINGS.map(f => `${f.id} (${f.title.toLowerCase()})`).join(' and ')}. Neither has a regression test.</p>
          <p>ARC Assurance baseline: {assuranceBaseline.pass} pass, {assuranceBaseline.fail} fail, {assuranceBaseline.not_assessable} not_assessable, {assuranceBaseline.not_applicable} not_applicable, {assuranceBaseline.attested} attested. This is not a certification.</p>
        </section>

        <section className="mt-8">
          <h3 className="mb-2 text-[14px] font-semibold">Original integration results</h3>
          <table className="w-full border-collapse">
            <thead><tr><Th>#</Th><Th>Scenario</Th><Th>Expected</Th><Th>Status</Th><Th>Detail</Th></tr></thead>
            <tbody>{ORIGINAL.map(s => { const r = latestRunById.get(s.id); return (
              <tr key={s.id}><Td className="font-mono text-[11px] text-faint">{s.num}</Td><Td>{s.description}</Td><Td className="font-mono text-[11.5px]">{s.expected}</Td><Td><StatusBadge status={runStatus(r)} /></Td><Td className="font-mono text-[11px] text-muted">{r ? (r.pass ? 'assertions held' : r.error) : '—'}</Td></tr>
            ) })}</tbody>
          </table>
        </section>

        <section className="mt-8 max-w-3xl">
          <h3 className="mb-2 text-[14px] font-semibold">Limitations and exclusions</h3>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink">{LIMITATIONS.map(l => <li key={l.title}><span className="font-medium">{l.title}.</span> <span className="text-muted">{l.detail}</span></li>)}</ul>
        </section>
      </article>
    </>
  )
}

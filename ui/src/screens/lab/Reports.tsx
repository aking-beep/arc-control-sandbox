import { Download, Printer } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Th, Td, Button } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LIMITATIONS, BASELINE_NOTE, integrationBaseline, phase2Baseline, assuranceBaseline } from '../../data/baseline'
import { useFindingStates, STAGE_LABEL } from '../../lib/findings'
import { ORIGINAL } from '../../data/catalog'
import type { IntegrationReport } from '../../api/types'
import { runStatus, fmtTime } from '../../lib/status'
import { useReports, phase2Counts } from '../../api/ReportsProvider'
import { ReportImport } from '../../components/lab/ReportImport'

const VERIFICATION = 'independent test runner over local HTTP (not external security certification)'

export function Reports() {
  const { latestRunById, health } = useData()
  const { integration: recInt, phase2: recP2, clear } = useReports()
  const p2 = recP2 ? phase2Counts(recP2.report) : null
  const findings = useFindingStates()
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
                <Td className="text-[12px] text-muted">{recInt.origin === 'server' ? 'From the server' : `Imported ${fmtTime(recInt.loadedAt)}`} · runner <span className="font-mono">{recInt.report.runner}</span> {recInt.origin === 'file' && <button onClick={() => clear('integration')} className="ml-2 font-medium text-teal-ink hover:underline">Unload</button>}</Td></tr>
            ) : (
              <tr><Td className="font-medium">reports/latest.json</Td><Td>—</Td><Td>—</Td><Td>—</Td><Td className="text-[12px] text-muted">Not found on the server. Written by <span className="font-mono">npm run validate</span>; served at GET /api/reports/integration, or load a copy here.</Td></tr>
            )}
            <tr><Td className="font-medium">Original integration baseline</Td><Td><SourceTag source="baseline" note={BASELINE_NOTE} /></Td><Td>—</Td><Td className="font-mono text-[11.5px]">{integrationBaseline.passed}/{integrationBaseline.total} passed</Td><Td className="text-[12px] text-muted">Figure only; no file</Td></tr>
            {recP2 && p2 ? (
              <tr><Td className="font-medium font-mono text-[12px]">{recP2.fileName}</Td><Td><SourceTag source="recorded" /></Td><Td className="font-mono text-[11.5px]">{fmtTime(recP2.report.generatedAt)}</Td><Td className="font-mono text-[11.5px]">{p2.pass}P · {p2.fail}F · {p2.unsupported}U · {p2.notImplemented}NI</Td>
                <Td className="text-[12px] text-muted">{recP2.origin === 'server' ? 'From the server' : `Imported ${fmtTime(recP2.loadedAt)}`} · ARC <span className="font-mono">{recP2.report.revisions.arcControl?.slice(0, 7) ?? 'unknown'}</span> · 17 recheck {recP2.report.preservedIntegration.passed}/{recP2.report.preservedIntegration.total} {recP2.origin === 'file' && <button onClick={() => clear('phase2')} className="ml-2 font-medium text-teal-ink hover:underline">Unload</button>}</Td></tr>
            ) : (
              <tr><Td className="font-medium">reports/phase2-latest.json</Td><Td>—</Td><Td>—</Td><Td>—</Td><Td className="text-[12px] text-muted">Not found on the server. Written by <span className="font-mono">npm run phase2</span>; served at GET /api/reports/phase2.</Td></tr>
            )}
            <tr><Td className="font-medium">Phase 2 committed baseline</Td><Td><SourceTag source="baseline" note={BASELINE_NOTE} /></Td><Td>26 Oct 2026</Td><Td className="font-mono text-[11.5px]">{phase2Baseline.pass}P · {phase2Baseline.fail}F · {phase2Baseline.unsupported}U · {phase2Baseline.notImplemented}NI</Td><Td className="text-[12px] text-muted">docs/PHASE_2_READINESS.md. Figures only; the JSON report is not committed.</Td></tr>
          </tbody>
        </table>
      </Section>

      {recP2 && (
        <Section title={`Phase 2 results · ${recP2.fileName}`} aside={<SourceTag source="recorded" at={recP2.report.generatedAt} />} pad={false} className="mb-5">
          <table className="w-full border-collapse">
            <thead><tr><Th>Check</Th><Th>Track</Th><Th>Status</Th><Th>Disposition</Th><Th>Detail</Th></tr></thead>
            <tbody>{recP2.report.scenarios.map(r => (
              <tr key={r.id}><Td><div className="font-mono text-[12px]">{r.id}</div><div className="text-[12px] text-muted">{r.label}</div></Td><Td className="text-[12px]">{r.track}</Td>
                <Td><StatusBadge status={r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : r.status === 'unsupported' ? 'UNSUPPORTED' : 'NOT_IMPLEMENTED'} /></Td>
                <Td className="font-mono text-[11.5px]">{r.disposition}</Td>
                <Td className={`max-w-md text-[12px] ${r.status === 'fail' ? 'font-mono text-critical-ink' : 'text-muted'}`}>{r.error ?? r.reason ?? '—'}</Td></tr>
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
          {p2 ? (
            <p>Phase 2 ({recP2!.fileName}, {fmtTime(recP2!.report.generatedAt)}) recorded {p2.pass} passing checks{p2.limitation ? ` (${p2.limitation} reproducing a known limitation)` : ''}, <strong className="text-critical-ink">{p2.fail} failing checks</strong>, {p2.unsupported} unsupported capabilities and {p2.notImplemented} unimplemented check. Unsupported and unimplemented checks are not passes.</p>
          ) : (
            <p>Phase 2 security testing (committed baseline, docs/PHASE_2_READINESS.md) recorded {phase2Baseline.pass} passing checks, <strong className="text-critical-ink">{phase2Baseline.fail} failing checks</strong>, {phase2Baseline.unsupported} unsupported capabilities and {phase2Baseline.notImplemented} unimplemented check. Unsupported and unimplemented checks are not passes.</p>
          )}
          <p>{findings.filter(f => f.stage !== 'resolved').length} findings remain open: {findings.map(f => `${f.finding.id} (${f.finding.severity}, ${f.finding.title.toLowerCase()}; ${f.finding.check} ${f.checkStatus}, ${STAGE_LABEL[f.stage].toLowerCase()})`).join('; ')}.</p>
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

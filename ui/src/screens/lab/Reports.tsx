import { Download, Printer } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { PageHeader, Section, Th, Td, Button, Empty } from '../../components/ui/primitives'
import { SourceTag } from '../../components/ui/SourceTag'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { deriveFindings, LIMITATIONS } from '../../data/findingDocs'
import { ORIGINAL } from '../../data/catalog'
import type { IntegrationReport } from '../../api/types'
import { runStatus, fmtTime } from '../../lib/status'
import { useReports, phase2Counts } from '../../api/ReportsProvider'
import { usePhase2, phase2UiStatus } from '../../api/Phase2Provider'
import { ReportImport } from '../../components/lab/ReportImport'

const VERIFICATION = 'independent test runner over local HTTP (not external security certification)'

export function Reports() {
  const { latestRunById, health } = useData()
  const { index, integration, phase2: phase2File, importedIntegration, importedPhase2, clear } = useReports()
  const phase2 = usePhase2()

  // Prefer the saved report file (a full, timestamped run) over whatever this
  // browser session happens to have run, and fall back to the live catalogue.
  const savedP2 = phase2File.data ?? importedPhase2?.report ?? null
  const fileCounts = savedP2 ? phase2Counts(savedP2) : null
  const live = phase2.summary
  const savedInt = integration.data ?? importedIntegration?.report ?? null

  const findings = deriveFindings(phase2.latestById)
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
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `integration-${report.generatedAt.replace(/:/g, '-')}.json`; a.click()
  }

  return (
    <>
      <PageHeader title="Validation Reports"
        description="Reports compile what was actually executed. Each one carries its verification level verbatim, and a report never claims certification."
        meta={<span className="text-[12px] text-muted">Served from <span className="font-mono text-ink">GET /api/reports</span>{index.data?.files.length ? <> · {index.data.files.length} file{index.data.files.length === 1 ? '' : 's'} on disk</> : null}</span>}
        actions={<><ReportImport /><Button icon={<Printer className="size-3.5" />} onClick={() => window.print()}>Print summary</Button><Button variant="primary" icon={<Download className="size-3.5" />} onClick={exportReport} disabled={results.length === 0}>Export session report</Button></>} />

      <Section title="Available reports" pad={false} className="mb-5">
        <table className="w-full border-collapse">
          <thead><tr><Th>Report</Th><Th>Source</Th><Th>Generated</Th><Th>Totals</Th><Th>Availability</Th></tr></thead>
          <tbody>
            <tr>
              <Td className="font-medium">Current session · original integration</Td>
              <Td><SourceTag source="live" /></Td>
              <Td className="font-mono text-[11.5px]">{results.length ? fmtTime(results[results.length - 1]!.at) : '—'}</Td>
              <Td className="font-mono text-[11.5px]">{results.length ? `${passed}/${results.length} passed` : 'not run'}</Td>
              <Td className="text-[12px]">{complete ? 'Complete (17/17 executed)' : `${results.length} of 17 executed`}</Td>
            </tr>

            <tr>
              <Td className="font-medium font-mono text-[12px]">reports/latest.json</Td>
              <Td><SourceTag source={integration.data ? 'recorded' : 'repository'} /></Td>
              <Td className="font-mono text-[11.5px]">{savedInt ? fmtTime(savedInt.generatedAt) : '—'}</Td>
              <Td className="font-mono text-[11.5px]">{savedInt ? `${savedInt.passed}/${savedInt.total} passed` : '—'}</Td>
              <Td className="text-[12px] text-muted">
                {integration.data
                  ? <>Served by the sandbox · runner <span className="font-mono">{integration.data.runner}</span></>
                  : importedIntegration
                    ? <>Opened from <span className="font-mono">{importedIntegration.fileName}</span> <button onClick={() => clear('integration')} className="ml-2 font-medium text-teal-ink hover:underline">Unload</button></>
                    : integration.status === 'empty'
                      ? <>Not generated yet. Run <span className="font-mono">npm run validate</span>.</>
                      : integration.status === 'loading' ? 'Loading…' : integration.error}
              </Td>
            </tr>

            <tr>
              <Td className="font-medium font-mono text-[12px]">reports/phase2-latest.json</Td>
              <Td><SourceTag source={phase2File.data ? 'recorded' : 'repository'} /></Td>
              <Td className="font-mono text-[11.5px]">{savedP2 ? fmtTime(savedP2.generatedAt) : '—'}</Td>
              <Td className="font-mono text-[11.5px]">{fileCounts ? `${fileCounts.pass}P · ${fileCounts.fail}F · ${fileCounts.unsupported}U · ${fileCounts.notImplemented}NI` : '—'}</Td>
              <Td className="text-[12px] text-muted">
                {phase2File.data
                  ? <>Served by the sandbox · ARC Control <span className="font-mono">{phase2File.data.revisions.arcControl?.slice(0, 10) ?? 'unrecorded'}</span></>
                  : importedPhase2
                    ? <>Opened from <span className="font-mono">{importedPhase2.fileName}</span> <button onClick={() => clear('phase2')} className="ml-2 font-medium text-teal-ink hover:underline">Unload</button></>
                    : phase2File.status === 'empty'
                      ? <>Not generated yet. Run <span className="font-mono">npm run phase2</span> (exits non-zero while the two known failures stand).</>
                      : phase2File.status === 'loading' ? 'Loading…' : phase2File.error}
              </Td>
            </tr>

            <tr>
              <Td className="font-medium">Live Phase 2 catalogue</Td>
              <Td><SourceTag source={phase2.catalogue.status === 'live' ? 'live' : 'repository'} /></Td>
              <Td className="font-mono text-[11.5px]">{phase2.catalogue.fetchedAt ? fmtTime(phase2.catalogue.fetchedAt) : '—'}</Td>
              <Td className="font-mono text-[11.5px]">{live ? `${live.pass}P · ${live.fail}F · ${live.unsupported}U · ${live.notImplemented}NI` : '—'}</Td>
              <Td className="text-[12px] text-muted">{live ? `${live.covered}/${live.implemented} executable checks run in this window` : 'GET /api/phase2 unavailable'}</Td>
            </tr>
          </tbody>
        </table>
      </Section>

      {savedP2 ? (
        <Section title="Phase 2 results" aside={<SourceTag source="recorded" at={savedP2.generatedAt} note={phase2File.data ? 'reports/phase2-latest.json' : importedPhase2?.fileName} />} pad={false} className="mb-5">
          <table className="w-full border-collapse">
            <thead><tr><Th>Check</Th><Th>Track</Th><Th>Status</Th><Th>Disposition</Th><Th>Observation</Th></tr></thead>
            <tbody>{savedP2.scenarios.map(r => (
              <tr key={r.id}>
                <Td><div className="font-mono text-[12px]">{r.id}</div><div className="text-[12px] text-muted">{r.label}</div></Td>
                <Td className="text-[12px] text-muted">{r.track}</Td>
                <Td><StatusBadge status={phase2UiStatus(r.status)} /></Td>
                <Td className="text-[12px] text-muted">{r.disposition.replace(/_/g, ' ')}</Td>
                <Td className={`text-[12px] ${r.status === 'fail' ? 'font-medium text-critical-ink' : 'text-muted'}`}>{r.error ?? r.detail ?? (r.status === 'pass' ? 'assertions held' : '—')}</Td>
              </tr>
            ))}</tbody>
          </table>
          <p className="border-t border-line px-4 py-2.5 text-[12px] text-muted">
            {savedP2.disclaimer} Node {savedP2.node}, sandbox <span className="font-mono">{savedP2.revisions.sandbox?.slice(0, 10) ?? 'unrecorded'}</span>, ARC Control <span className="font-mono">{savedP2.revisions.arcControl?.slice(0, 10) ?? 'unrecorded'}</span>.
          </p>
        </Section>
      ) : (
        <Section title="Phase 2 results" className="mb-5">
          <Empty title="No Phase 2 report on disk">
            Run <span className="font-mono">npm run phase2</span> to write <span className="font-mono">reports/phase2-latest.json</span>. It repeats the Phase 2 catalogue, the nine stress runs and the original 17, and exits non-zero while the two known authorization failures stand — that exit code is the result, not a broken runner.
          </Empty>
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
            ? savedInt
              ? `No integration scenarios were executed in this browser session. The saved report records ${savedInt.passed} of ${savedInt.total} original scenarios passing, generated ${fmtTime(savedInt.generatedAt)}.`
              : 'No integration scenarios were executed in this session, and no saved report exists. There is no result to report.'
            : `${passed} of ${results.length} original integration scenarios executed in this session passed${complete ? '' : `; ${17 - results.length} were not run`}.`}</p>

          <p>{fileCounts
            ? <>Phase 2 recorded {fileCounts.pass} passing checks, <strong className={fileCounts.fail ? 'text-critical-ink' : ''}>{fileCounts.fail} failing check{fileCounts.fail === 1 ? '' : 's'}</strong>, {fileCounts.unsupported} capabilities unsupported by this ARC build and {fileCounts.notImplemented} check not implemented. Unsupported and not-implemented checks are not passes, and {fileCounts.limitationReproduced} of the passes reproduce a known limitation rather than demonstrating a control.</>
            : live && live.covered > 0
              ? <>Phase 2 has run {live.covered} of {live.implemented} executable checks in this window: {live.pass} passing, <strong className={live.fail ? 'text-critical-ink' : ''}>{live.fail} failing</strong>, with {live.unsupported} unsupported and {live.notImplemented} not implemented. {live.complete ? '' : 'The catalogue is only partly covered, so these are not full-suite totals.'}</>
              : 'Phase 2 has not been run, so there are no security-check results to report.'}</p>

          <p>{findings.some(f => f.status === 'FAIL')
            ? <>The following critical findings reproduced on the latest run: {findings.filter(f => f.status === 'FAIL').map(f => `${f.id} (${f.title.toLowerCase()})`).join(' and ')}. Each is covered by its Phase 2 check and stays open until the ARC Control defect is fixed and independently retested.</>
            : findings.every(f => f.status === 'NOT_RUN')
              ? <>The two tracked findings ({findings.map(f => f.id).join(' and ')}) were not retested in this window, so their current state is unknown.</>
              : <>The tracked findings ({findings.map(f => f.id).join(' and ')}) did not reproduce on the latest run. That is one observation on this local process; the findings stay listed until the ARC Control fix is confirmed and independently retested.</>}</p>

          <p>ARC Assurance reports its nine ARC-AI controls in five separate statuses and is not summed into a score. Run an assessment on the Assurance screen to read the current distribution. A control mapping is not a certification.</p>

          <p className="text-muted">This is a local, synthetic, single-process observation. It is not an enterprise certification, a penetration test, or proof of production readiness.</p>
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

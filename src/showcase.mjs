#!/usr/bin/env node
// Read-only showcase built from reports/product-latest.json. No API calls, no
// controls, nothing a visitor can change: safe for static hosting. Writes
// showcase/index.html (standalone) and showcase/fragment.html (for hosts that
// wrap the page in their own document skeleton).
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const FINDINGS = [
  { id: 'ARC-SEC-001', check: 'concurrent-idempotency', title: 'Concurrent requests with one idempotency key each executed', fix: 'arc-control#11', first: 'aa2f37c: 8 refunds for one key' },
  { id: 'ARC-SEC-002', check: 'policy-change-before-release', title: 'Approval release ignored a newly published deny policy', fix: 'arc-control#11', first: 'aa2f37c: released and executed' },
  { id: 'ARC-SEC-003', check: 'retired-agent-final', title: 'A retired agent could be reactivated', fix: 'arc-control#9 (routes), #16 (hardening)', first: '162d00d, a stale default branch: activate returned 200' }
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const short = sha => (sha || 'unknown').slice(0, 7);
const date = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
const chip = (status, label = status) => `<span class="chip s-${esc(status)}">${esc(String(label).replaceAll('_', ' '))}</span>`;
const tally = rows => rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});

const report = JSON.parse(await readFile(process.argv[2] || 'reports/product-latest.json', 'utf8'));
const { suites, coverage, revisions } = report;
const p2 = suites.phase2.summary;
const packs = Object.entries(suites).filter(([key, value]) => !['integration', 'phase2', 'stress', 'recheck'].includes(key) && value?.results);
const p2ById = Object.fromEntries(suites.phase2.results.map(r => [r.id, r]));
const stressRows = suites.stress.flatMap(s => s.runs.map(run => ({ preset: s.preset, concurrency: s.concurrency, ...run })));

const suiteRows = [
  ['Original integration scenarios', `${suites.integration.passed}/${suites.integration.total} passed; ${suites.recheck.passed}/${suites.recheck.total} again after every other suite`, suites.integration.passed === suites.integration.total && suites.recheck.passed === suites.recheck.total],
  ['Phase 2 security, reliability and evidence', `${p2.pass} pass · ${p2.fail} fail · ${p2.unsupported} unsupported · ${p2.notImplemented} not implemented${p2.limitationReproduced ? ` · ${p2.limitationReproduced} passes reproduce a known limitation` : ''}`, p2.fail === 0],
  ['Stress (100 / 500 / 1,000 requests × seeds)', `${stressRows.filter(r => r.pass).length}/${stressRows.length} runs matched every expected effect`, stressRows.every(r => r.pass)],
  ...packs.map(([key, value]) => {
    const t = value.totals || tally(value.results);
    return [key === 'product' ? 'ARC product surface' : value.results[0]?.id?.startsWith('nwb') ? 'Northwind Bank (financial services)' : key,
      Object.entries(t).map(([k, v]) => `${v} ${k.replaceAll('_', ' ')}`).join(' · '), !t.fail];
  }),
  ['API route coverage', `${coverage.arcRoutes} routes: ${Object.entries(coverage.routeTotals).map(([k, v]) => `${v} ${k.replaceAll('_', ' ')}`).join(' · ')}`, !coverage.unmapped.length && !coverage.routeTotals.failing]
];

const body = `
<header class="masthead">
  <div class="wrap">
    <p class="eyebrow">Meridian whole-product harness · ARC Control <code>${esc(short(revisions.arcControl))}</code> · ${esc(date(report.generatedAt))}</p>
    <h1>${report.pass ? 'Every implemented check passed.' : `${report.failures.length} check${report.failures.length === 1 ? '' : 's'} failed.`}</h1>
    <p class="lede">An independent synthetic enterprise sent real requests through ARC Control and counted what actually changed in its own systems. ${report.pass ? 'Every decision, approval and refusal matched the effect the target system recorded.' : `Failing: ${esc(report.failures.join(', '))}.`} Capabilities ARC does not ship are listed below as unsupported, not as passes.</p>
  </div>
</header>

<main class="wrap">
  <section>
    <h2>Suites</h2>
    <div class="scroll"><table>
      <thead><tr><th>Suite</th><th>Result</th><th></th></tr></thead>
      <tbody>${suiteRows.map(([name, text, ok]) => `<tr><td class="name">${esc(name)}</td><td>${esc(text)}</td><td>${chip(ok ? 'pass' : 'fail', ok ? 'pass' : 'fail')}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>

  <section>
    <h2>Security findings</h2>
    <p class="note">Each finding is reproduced by a Phase 2 check. Resolved means a recorded fix in ARC Control and an independent retest; the check keeps running so a regression would reopen it.</p>
    <ol class="findings">${FINDINGS.map(f => {
      const run = p2ById[f.check];
      const status = run?.status === 'pass' ? 'resolved' : run?.status === 'fail' ? 'open' : 'unknown';
      return `<li><div class="f-head"><code>${esc(f.id)}</code>${chip(status === 'resolved' ? 'pass' : status === 'open' ? 'fail' : 'not_run', status)}</div>
        <p class="f-title">${esc(f.title)}</p>
        <dl><dt>First seen</dt><dd>${esc(f.first)}</dd><dt>Fix</dt><dd>${esc(f.fix)}</dd><dt>Check</dt><dd><code>${esc(f.check)}</code> ${run ? esc(run.status) : 'not run'}${run?.error ? `: ${esc(run.error)}` : ''}</dd></dl></li>`;
    }).join('')}</ol>
  </section>

  <section>
    <h2>Capabilities</h2>
    <div class="scroll"><table>
      <thead><tr><th>Capability</th><th>Status</th><th>Evidence</th></tr></thead>
      <tbody>${coverage.capabilities.map(c => `<tr><td class="name">${esc(c.label)}</td><td>${chip(c.status === 'verified' ? 'pass' : c.status === 'failing' ? 'fail' : c.status, c.status)}</td><td class="refs">${c.reason ? esc(c.reason) : c.checks.map(x => `<code class="${x.status === 'fail' ? 'bad' : ''}">${esc(x.ref)}</code>`).join(' ')}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>

  <section>
    <h2>API routes <span class="count">${coverage.arcRoutes}</span></h2>
    <p class="note">Read from ARC Control's own source. A route with no check and no stated reason fails the run.</p>
    <div class="scroll"><table class="routes">
      <thead><tr><th>Route</th><th>Status</th><th>Exercised by</th></tr></thead>
      <tbody>${coverage.routes.map(r => `<tr><td><code>${esc(r.route)}</code></td><td>${chip(r.status === 'verified' ? 'pass' : r.status === 'failing' ? 'fail' : r.status, r.status)}</td><td class="refs">${r.reason ? esc(r.reason) : r.checks.map(x => `<code>${esc(x.ref)}</code>`).join(' ')}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>

  <section>
    <h2>Stress</h2>
    <p class="note">Finance refunds through ARC on one Node process with an in-memory store, on the build machine. Not a service-level objective.</p>
    <div class="scroll"><table class="num">
      <thead><tr><th>Requests</th><th>Workers</th><th>Seed</th><th>Req/s</th><th>p50 / p95 / p99 ms</th><th>Refunds expected / recorded</th><th>Unexpected</th></tr></thead>
      <tbody>${stressRows.map(r => `<tr><td>${esc(Number(r.preset).toLocaleString('en-US'))}</td><td>${esc(r.concurrency)}</td><td>${esc(r.seed)}</td><td>${esc(r.requestsPerSecond)}</td><td>${esc(`${r.p50Ms} / ${r.p95Ms} / ${r.p99Ms}`)}</td><td>${esc(`${r.expectedEffects} / ${r.observedEffects}`)}</td><td>${esc(r.unexpectedOutcomes)}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>

  <footer>
    <p>${esc(report.disclaimer)}</p>
    <p>Harness <code>${esc(short(revisions.sandbox))}</code> · ARC Control <code>${esc(revisions.arcControl || 'unknown')}</code> · Node ${esc(report.node)}. All companies, people and transactions are fictional.</p>
  </footer>
</main>`;

const head = `<title>ARC Verification Record</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
/* Layout: a single reading column, verdict first, then evidence tables that scroll inside themselves. */
:root {
  --paper: #f5f7f9; --surface: #ffffff; --ink: #14212b; --muted: #5b6b78; --line: #dbe2e8;
  --accent: #23615d; --pass: #1f7a4c; --pass-bg: #e3f3ea; --fail: #b3362b; --fail-bg: #fbe6e3;
  --warn: #8a5a00; --warn-bg: #fbf0d9; --quiet-bg: #eef1f4;
  --display: 'Archivo', 'Helvetica Neue', Arial, sans-serif;
  --body: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --paper: #0f171d; --surface: #152029; --ink: #e5ecf1; --muted: #93a4b2; --line: #26343f;
  --accent: #6fbfb7; --pass: #6fd29b; --pass-bg: #163326; --fail: #ff8a7d; --fail-bg: #3a1c19;
  --warn: #f0c262; --warn-bg: #352a12; --quiet-bg: #1c2932; color-scheme: dark } }
:root[data-theme="dark"] {
  --paper: #0f171d; --surface: #152029; --ink: #e5ecf1; --muted: #93a4b2; --line: #26343f;
  --accent: #6fbfb7; --pass: #6fd29b; --pass-bg: #163326; --fail: #ff8a7d; --fail-bg: #3a1c19;
  --warn: #f0c262; --warn-bg: #352a12; --quiet-bg: #1c2932; color-scheme: dark }
body { background: var(--paper); color: var(--ink); font: 15px/1.6 var(--body); }
.wrap { max-width: 980px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.masthead { border-bottom: 1px solid var(--line); background: var(--surface); }
.masthead .wrap { padding-block: 40px 32px; }
.eyebrow { margin: 0; font: 500 12px/1.4 var(--mono); letter-spacing: .02em; color: var(--muted); }
h1 { margin: 12px 0 0; font: 800 clamp(28px, 5vw, 44px)/1.1 var(--display); letter-spacing: -.01em; text-wrap: balance; }
.lede { margin: 14px 0 0; max-width: 65ch; color: var(--muted); }
main.wrap { display: grid; gap: 40px; padding-block: 36px 56px; }
section { display: grid; gap: 12px; min-width: 0; }
h2 { margin: 0; font: 600 20px/1.2 var(--display); display: flex; align-items: baseline; gap: 10px; }
.count { font: 500 13px var(--mono); color: var(--muted); }
.note { margin: 0; max-width: 70ch; color: var(--muted); font-size: 14px; }
.scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; font: 600 11px/1.3 var(--body); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 10px 14px; border-bottom: 1px solid var(--line); white-space: nowrap; }
td { padding: 10px 14px; border-top: 1px solid var(--line); vertical-align: top; }
tbody tr:first-child td { border-top: 0; }
td.name { font-weight: 500; }
td.refs { color: var(--muted); font-size: 13px; }
.num td { font-variant-numeric: tabular-nums; white-space: nowrap; }
.routes td:first-child { white-space: nowrap; }
code { font: 13px var(--mono); }
code.bad { color: var(--fail); }
.refs code { margin-right: 6px; }
.chip { display: inline-block; padding: 2px 8px; border-radius: 4px; font: 600 11px/1.5 var(--mono); text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; background: var(--quiet-bg); color: var(--muted); }
.s-pass { background: var(--pass-bg); color: var(--pass); }
.s-fail, .s-unmapped { background: var(--fail-bg); color: var(--fail); }
.s-gap, .s-partial { background: var(--warn-bg); color: var(--warn); }
.findings { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.findings li { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 16px; display: grid; gap: 8px; align-content: start; min-width: 0; }
.f-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.f-title { margin: 0; font-weight: 600; }
dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 13px; }
dt { color: var(--muted); }
dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
footer { border-top: 1px solid var(--line); padding-top: 20px; color: var(--muted); font-size: 13px; display: grid; gap: 6px; }
footer p { margin: 0; }
</style>`;

await mkdir('showcase', { recursive: true });
await writeFile('showcase/fragment.html', `${head}\n${body}\n`);
await writeFile('showcase/index.html', `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
console.log(`Wrote showcase/index.html and showcase/fragment.html from ${process.argv[2] || 'reports/product-latest.json'} (ARC ${short(revisions.arcControl)}, ${report.pass ? 'pass' : 'fail'}).`);

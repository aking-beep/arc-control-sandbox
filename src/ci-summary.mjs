#!/usr/bin/env node
// Markdown summary of reports/product-latest.json for the CI job page.
import { readFile, appendFile } from 'node:fs/promises';

const target = process.env.GITHUB_STEP_SUMMARY;
try {
  const r = JSON.parse(await readFile('reports/product-latest.json', 'utf8'));
  const t = rows => rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
  const fmt = o => Object.entries(o).map(([k, v]) => `${v} ${k}`).join(' · ');
  const lines = [
    `## ARC Control whole-product run: ${r.pass ? 'PASS' : 'FAIL'}`,
    '',
    `ARC \`${r.revisions.arcControl?.slice(0, 7) ?? 'unknown'}\` · sandbox \`${r.revisions.sandbox?.slice(0, 7) ?? 'unknown'}\` · ${r.generatedAt}`,
    '',
    '| Suite | Result |', '| --- | --- |',
    `| Original 17 | ${r.suites.integration.passed}/${r.suites.integration.total}; recheck ${r.suites.recheck.passed}/${r.suites.recheck.total} |`,
    `| Phase 2 | ${r.suites.phase2.summary.pass} pass · ${r.suites.phase2.summary.fail} fail · ${r.suites.phase2.summary.unsupported} unsupported · ${r.suites.phase2.summary.notImplemented} not implemented |`,
    `| Stress | ${r.suites.stress.map(s => `${s.preset}: ${s.pass ? 'pass' : 'FAIL'}`).join(' · ')} |`,
    ...Object.entries(r.suites).filter(([k]) => !['integration', 'phase2', 'stress', 'recheck'].includes(k)).map(([k, v]) => `| ${k} | ${fmt(v.totals || t(v.results || []))} |`),
    `| Coverage | ${r.coverage.arcRoutes} routes: ${fmt(r.coverage.routeTotals)} |`,
    '',
    r.failures.length ? `**Failing:** ${r.failures.map(f => `\`${f}\``).join(', ')}` : 'Every implemented check passed; no unmapped ARC routes.',
    '', `_${r.disclaimer}_`
  ];
  const text = lines.join('\n') + '\n';
  if (target) await appendFile(target, text); else process.stdout.write(text);
} catch (error) {
  const text = `## ARC Control whole-product run\n\nNo product report was produced: ${error.message}\n`;
  if (target) await appendFile(target, text); else process.stdout.write(text);
}

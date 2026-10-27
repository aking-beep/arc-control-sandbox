#!/usr/bin/env node
// Coverage map without a running stack: which ARC routes and capabilities the
// harness exercises, read from ARC's source. `--strict` exits 1 when ARC has a
// route that no check covers and no gap entry explains.
import { resolve } from 'node:path';
import { buildCoverage } from './coverage.mjs';

const arcRoot = resolve(process.env.ARC_REPO_PATH || '../arc-control');
try {
  const coverage = await buildCoverage(arcRoot);
  for (const row of coverage.routes) console.log(`${row.status.padEnd(9)} ${row.route.padEnd(48)} ${row.checks.map(c => c.ref).join(', ') || row.reason || ''}`);
  console.log(`\n${coverage.arcRoutes} ARC routes: ${JSON.stringify(coverage.routeTotals)}`);
  for (const cap of coverage.capabilities) console.log(`${(cap.status === 'not_run' ? 'mapped' : cap.status).padEnd(15)} ${cap.label}${cap.reason ? ` — ${cap.reason}` : ''}`);
  if (coverage.unmapped.length) {
    console.log(`\nUNMAPPED: ${coverage.unmapped.join(', ')}. Add a check that covers each route, or a ROUTE_GAPS entry in src/coverage.mjs that says why not.`);
    if (process.argv.includes('--strict')) process.exitCode = 1;
  }
} catch (error) {
  console.error(`FAILED to build coverage: ${error.message}`);
  process.exitCode = 1;
}

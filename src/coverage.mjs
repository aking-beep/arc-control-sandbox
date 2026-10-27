import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCT_CATALOGUE } from './product.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Whole-product coverage: every ARC Control API route and capability, and
 * which harness check exercises it.
 *
 * The route list is read from ARC's own source, so a route added to ARC shows
 * up here as `unmapped` until a check covers it or it is listed as a
 * deliberate gap. `npm run coverage -- --strict` fails on unmapped routes.
 */

/** Routes deliberately not exercised, with the reason. Never counted as covered. */
export const ROUTE_GAPS = {
  'GET /auth/mode': 'OIDC sign-in needs an identity provider; this harness runs none.',
  'GET /auth/login': 'OIDC sign-in needs an identity provider; this harness runs none.',
  'GET /auth/callback': 'OIDC sign-in needs an identity provider; this harness runs none.',
  'POST /auth/logout': 'OIDC sessions are not created in this harness.',
  'GET /v1/operator-sessions': 'OIDC sessions are not created in this harness.',
  'POST /v1/operator-sessions/revoke': 'OIDC sessions are not created in this harness.',
  'POST /v1/findings/:id': 'Editing findings would change the governance record the assurance checks read.',
  'POST /v1/findings/:id/resolve': 'Resolving findings would change the governance record the assurance checks read.'
};

/** Capabilities that are not a single route. `checks` name suite:id; `status` is set for things ARC does not ship. */
export const CAPABILITIES = [
  { id: 'policy-three-effects', label: 'ALLOW / REQUIRE_APPROVAL / DENY with strictest-wins', checks: ['integration:refund-allow', 'integration:refund-pending', 'integration:refund-deny', 'phase2:policy-tightening-new-actions'] },
  { id: 'fail-closed', label: 'Fail closed when no policy matches or a policy is disabled', checks: ['phase2:policy-disable-fails-closed', 'integration:unknown-tool'] },
  { id: 'input-typing', label: 'Strict parameter types and declared parameters only', checks: ['integration:wrong-type', 'phase2:undeclared-parameter'] },
  { id: 'idempotency', label: 'One idempotency key → one effect, sequential and concurrent', checks: ['integration:idempotency', 'phase2:concurrent-idempotency'] },
  { id: 'approval-consumption', label: 'One approval releases at most one effect', checks: ['integration:approval-replay', 'phase2:approval-consume-race', 'northwind:nwb-dual-release-once'] },
  { id: 'approval-revalidation', label: 'Release honours the policy in force at release', checks: ['phase2:policy-change-before-release'] },
  { id: 'multi-approver', label: 'Two-person approval with distinct approvers', checks: ['northwind:nwb-dual-one-vote-insufficient', 'northwind:nwb-dual-same-approver-twice', 'northwind:nwb-dual-release-once'] },
  { id: 'separation-of-duties', label: 'Agent owner and wrong roles cannot approve', checks: ['phase2:owner-self-approval', 'phase2:wrong-role-approval', 'northwind:nwb-owner-cannot-approve'] },
  { id: 'approval-expiry', label: 'Expired approvals cannot execute', checks: ['phase2:approval-expires'] },
  { id: 'time-conditions', label: 'Hour-of-day policy conditions', checks: ['product:time-window-condition', 'northwind:nwb-wire-cutoff'] },
  { id: 'rate-limit', label: 'Per-agent velocity limit, sequential and concurrent', checks: ['northwind:nwb-velocity-sequential', 'northwind:nwb-velocity-concurrent'] },
  { id: 'agent-lifecycle', label: 'Draft, suspend, resume, retire (final)', checks: ['integration:suspend-agent', 'phase2:draft-agent-cannot-act', 'phase2:retired-agent-final', 'product:retired-agent-resume-refused'] },
  { id: 'credential-lifecycle', label: 'Key rotation and revocation', checks: ['phase2:key-rotation', 'phase2:revoked-credential', 'product:credential-inventory-no-secrets'] },
  { id: 'operator-identity', label: 'Per-person operator identity (trusted proxy) and attribution', checks: ['phase2:sso-operator-identity', 'product:whoami-attribution'] },
  { id: 'kill-switches', label: 'Tool, connector and in-flight kill switches', checks: ['integration:disable-tool', 'product:connector-kill-switch', 'phase2:kill-switch-blocks-new-work'] },
  { id: 'connector-safety', label: 'Host allowlist, redirects, HTTP 500, timeouts', checks: ['phase2:connector-host-allowlist', 'phase2:connector-redirect-refused', 'phase2:connector-http-500-write', 'phase2:connector-timeout-after-effect'] },
  { id: 'mcp-security', label: 'MCP scan, drift detection and drift refusal at execution', checks: ['phase2:mcp-poisoned-metadata', 'phase2:mcp-manifest-drift', 'phase2:mcp-drift-runtime-enforcement'] },
  { id: 'evidence', label: 'Evidence records, correlation ids, bundles and tamper detection', checks: ['product:decision-record-readable', 'product:evidence-bundle-export', 'phase2:evidence-bundle-tamper'] },
  { id: 'audit-chain', label: 'Audit chain verification and truncation detection', checks: ['phase2:audit-chain-detects-edit', 'phase2:audit-supplied-head-detects-truncation', 'phase2:audit-self-check-limit'] },
  { id: 'assurance', label: 'Assurance runs, attestations and status separation', checks: ['phase2:assurance-categories-not-collapsed', 'product:assurance-attestation-distinct', 'product:disabled-control-not-passed'] },
  { id: 'notifications', label: 'Signed webhook notifications', checks: ['product:notification-webhook-signed'] },
  { id: 'direct-bypass', label: 'Target system refuses calls that did not come through ARC', checks: ['integration:direct-bypass'] },
  { id: 'oidc-sessions', label: 'Operator sign-in through an OIDC provider', status: 'not_implemented', reason: 'Needs an identity provider; not run by this harness.' },
  { id: 'tenant-isolation', label: 'Cross-tenant isolation', status: 'unsupported', reason: 'One organization; no tenant boundary to test.' },
  { id: 'external-audit-anchor', label: 'Audit head stored outside ARC', status: 'unsupported', reason: 'Nothing writes the head to a store ARC does not control.' },
  { id: 'network-segmentation', label: 'Network-level isolation of target systems', status: 'unsupported', reason: 'Single process on loopback; see deploy/ for the split-network layout.' },
  { id: 'cumulative-amount-limit', label: 'Cumulative amount per agent per period', status: 'unsupported', reason: 'Policies see one request; the rate limiter counts actions, not amounts.' },
  { id: 'approval-delegation', label: 'Time-boxed delegation of approval authority', status: 'unsupported', reason: 'No delegation record in the approvals model.' }
];

const ROUTE_RE = /router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g;

/** Every route ARC's control API registers, read from its source. */
export async function arcRoutes(arcRoot) {
  const dir = join(arcRoot, 'apps/control-api/src');
  const files = (await readdir(dir)).filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts'));
  const routes = new Set();
  for (const name of files) {
    for (const m of (await readFile(join(dir, name), 'utf8')).matchAll(ROUTE_RE)) routes.add(`${m[1].toUpperCase()} ${m[2]}`);
  }
  return [...routes].sort((a, b) => a.split(' ')[1].localeCompare(b.split(' ')[1]) || a.localeCompare(b));
}

const normalise = path => path.replace(/\$\{[^}]+\}/g, ':id').replace(/\?.*$/, '').replace(/\/+$/, '');
const sameShape = (pattern, path) => {
  const a = pattern.split('/'), b = path.split('/');
  return a.length === b.length && a.every((seg, i) => seg === b[i] || seg.startsWith(':') || b[i] === ':id');
};

/**
 * Routes a runner file calls, found by reading its request helpers:
 * `op(path)` is a GET, `op(path, body)` a POST, and explicit `method:` wins.
 */
async function routesCalledBy(file, routes, exclude) {
  const source = await readFile(join(here, file), 'utf8');
  const found = new Set();
  const literal = /(op|viaProxy|request|agentCall)\(\s*`?['"`]?(?:\$\{apiBase\})?(\/(?:v1|health|auth)(?:\$\{[^}]*\}|[^`'"])*)['"`]\s*(,\s*\{\s*method:\s*'(\w+)'|,|\))/g;
  for (const m of source.matchAll(literal)) {
    const path = normalise(m[2]);
    if (exclude && exclude.test(path)) continue;
    const method = m[4] ? m[4].toUpperCase() : m[1] === 'op' || m[1] === 'viaProxy' ? (m[3].startsWith(',') ? 'POST' : 'GET') : null;
    const candidates = routes.filter(route => sameShape(route.split(' ')[1], path));
    const exact = method ? candidates.filter(route => route.startsWith(`${method} `)) : [];
    for (const route of exact.length ? exact : candidates.length === 1 ? candidates : []) found.add(route);
  }
  return found;
}

/** Suite-level route usage for runners whose checks do not declare `covers`. */
// scenarios.mjs also holds the /api/assurance and load helpers, which are not part of the 17.
const RUNNER_FILES = { integration: ['scenarios.mjs', /^\/v1\/assurance/], phase2: ['phase2.mjs'], northwind: ['packs/runner.mjs'] };

export async function buildCoverage(arcRoot, results = {}) {
  const routes = await arcRoutes(arcRoot);
  const latest = {};
  for (const [suite, runs] of Object.entries(results)) for (const run of runs || []) latest[`${suite}:${run.id}`] = run;
  const statusOf = ref => {
    const run = latest[ref];
    if (!run) return 'not_run';
    if (run.status) return run.status;
    return run.pass === true ? 'pass' : run.pass === false ? 'fail' : 'not_run';
  };
  const suiteStatus = suite => {
    const runs = Object.entries(latest).filter(([key]) => key.startsWith(`${suite}:`)).map(([, run]) => statusOf(`${suite}:${run.id}`));
    if (!runs.length) return 'not_run';
    return runs.includes('fail') ? 'fail' : runs.includes('pass') ? 'pass' : 'not_run';
  };

  const byRoute = Object.fromEntries(routes.map(route => [route, []]));
  for (const check of PRODUCT_CATALOGUE.filter(item => item.kind === 'implemented')) {
    for (const route of check.covers) if (byRoute[route]) byRoute[route].push({ ref: `product:${check.id}`, status: statusOf(`product:${check.id}`) });
  }
  for (const [suite, [file, exclude]] of Object.entries(RUNNER_FILES)) {
    for (const route of await routesCalledBy(file, routes, exclude)) byRoute[route].push({ ref: `${suite}:*`, status: suiteStatus(suite) });
  }

  const rows = routes.map(route => {
    const checks = byRoute[route];
    let status;
    if (checks.length === 0) status = ROUTE_GAPS[route] ? 'gap' : 'unmapped';
    else if (checks.some(c => c.status === 'fail')) status = 'failing';
    else if (checks.some(c => c.status === 'pass')) status = 'verified';
    else status = 'not_run';
    return { route, status, checks, ...(ROUTE_GAPS[route] && !checks.length ? { reason: ROUTE_GAPS[route] } : {}) };
  });

  const capabilities = CAPABILITIES.map(cap => {
    if (cap.status) return { ...cap, checks: [] };
    const checks = cap.checks.map(ref => ({ ref, status: statusOf(ref) }));
    const status = checks.some(c => c.status === 'fail') ? 'failing' : checks.every(c => c.status === 'pass') ? 'verified' : checks.some(c => c.status === 'pass') ? 'partial' : 'not_run';
    return { ...cap, status, checks };
  });

  const tally = list => list.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
  return {
    generatedAt: new Date().toISOString(),
    arcRoutes: routes.length,
    routes: rows, routeTotals: tally(rows),
    capabilities, capabilityTotals: tally(capabilities),
    unmapped: rows.filter(row => row.status === 'unmapped').map(row => row.route),
    note: 'Route coverage for integration, Phase 2 and pack runners is per suite (read from the runner source); product checks declare their routes per check.'
  };
}

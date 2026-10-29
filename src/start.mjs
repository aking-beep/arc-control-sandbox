import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { access } from 'node:fs/promises';
import { createCompany } from './company.mjs';
import { createScenarios } from './scenarios.mjs';
import { createPhase2 } from './phase2.mjs';
import { createProduct } from './product.mjs';
import { northwind, NORTHWIND_SCENARIOS } from './packs/northwind.mjs';
import { createPackRunner } from './packs/runner.mjs';
import { buildCoverage } from './coverage.mjs';
import { createLiveOps } from './live/engine.mjs';
import { loadAiClient } from './live/ai.mjs';

// ARC remains a sibling checkout, independently versioned. This harness uses
// its public exported packages; no changes to arc-control source are required.
const arcRoot = resolve(process.env.ARC_REPO_PATH || '../arc-control');
const arcImport = async p => {
  const file = join(arcRoot, p);
  await access(file);
  return import(pathToFileURL(file).href);
};
const port = Number(process.env.MERIDIAN_PORT || 8890);
const apiPort = Number(process.env.ARC_SANDBOX_API_PORT || 8787);
const consolePort = Number(process.env.ARC_SANDBOX_CONSOLE_PORT || 8788);
const num = v => (v === undefined || v === '' ? undefined : Number(v));
const host = '127.0.0.1'; // connector targets and internal calls always use loopback
// Interface the three servers listen on. Loopback unless a container explicitly
// opts in; the operator routes have no authentication, so anything else must sit
// behind an authenticating proxy (see deploy/).
const bindHost = process.env.SANDBOX_BIND_HOST || '127.0.0.1';
if (bindHost !== '127.0.0.1' && process.env.SANDBOX_ALLOW_REMOTE_BIND !== '1') {
  console.error(`Refusing to bind ${bindHost}: set SANDBOX_ALLOW_REMOTE_BIND=1 only behind an authenticating proxy.`);
  process.exit(1);
}
const packs = [northwind];
const operatorToken = process.env.ARC_OPERATOR_TOKEN || randomBytes(32).toString('hex');
const executionToken = process.env.MERIDIAN_EXECUTION_TOKEN || randomBytes(32).toString('hex');
// Signs ARC's webhook notifications; the product suite verifies the signature.
const webhookSigningSecret = process.env.ARC_WEBHOOK_SIGNING_SECRET || randomBytes(32).toString('hex');
// ARC 2.1 identity-aware proxy mode. Only the Phase 2 runner holds the secret.
// Configuring it turns the shared token off unless allowSharedToken is set,
// which the sandbox does; those calls are recorded as `claimed`.
const trustedProxy = {
  identityHeader: 'x-forwarded-email', rolesHeader: 'x-forwarded-groups', secretHeader: 'x-arc-proxy-secret',
  sharedSecret: process.env.ARC_TRUSTED_PROXY_SECRET || randomBytes(32).toString('hex'),
  roleMap: { 'meridian-finance-managers': ['finance-manager'], 'northwind-treasury': ['treasury-manager'] }
};
const actor = { identifier: 'meridian-seed', via: 'seed' };
let harness;
const company = createCompany({ executionToken, port, host: bindHost, getHarness: () => harness, packs });

const defs = [
  { name: 'finance.refund', effect: 'irreversible', tier: 'critical', params: [['customer', 'string'], ['amount', 'number']] },
  { name: 'support.ticket_update', effect: 'write', tier: 'medium', params: [['ticketId', 'string'], ['status', 'string']] },
  { name: 'it.deploy', effect: 'write', tier: 'high', params: [['service', 'string'], ['branch', 'string']] },
  { name: 'sales.export_customers', effect: 'write', tier: 'critical', params: [['scope', 'string']] },
  { name: 'hr.salary_read', effect: 'read', tier: 'high', params: [['employeeId', 'string']] },
  { name: 'security.quarantine', effect: 'write', tier: 'high', params: [['resource', 'string'], ['reason', 'string']] }
];
const policy = (id, tool, rules) => ({
  id, version: 1, name: `Meridian ${tool} policy`, enabled: true,
  match: { tools: [tool] }, rules, fallback: { effect: 'DENY', reason: 'no authorized rule matched' }
});
const agentGuard = name => ({ id: 'different-agent', when: { ne: ['$.agent.name', name] }, effect: 'DENY', reason: `only ${name} may request this operation` });
const permit = (id, why) => ({ id, when: { always: true }, effect: 'ALLOW', reason: why });
const deny = (id, why) => ({ id, when: { always: true }, effect: 'DENY', reason: why });
const approval = (id, why, role) => ({
  id, when: { always: true }, effect: 'REQUIRE_APPROVAL', reason: why,
  approval: { approvers: [`role:${role}`], minApprovals: 1, expiresInSeconds: 3600, requireSeparationOfDuties: true }
});
const policies = [
  policy('MER-FIN-001', 'finance.refund', [
    agentGuard('finance-agent'),
    { id: 'under-500', when: { lt: ['$.action.parameters.amount', 500] }, effect: 'ALLOW', reason: 'within autonomous refund authority' },
    { id: 'manager-approval', when: { lte: ['$.action.parameters.amount', 2500] }, effect: 'REQUIRE_APPROVAL', reason: 'finance manager must approve', approval: { approvers: ['role:finance-manager'], minApprovals: 1, expiresInSeconds: 3600, requireSeparationOfDuties: true } },
    deny('over-ceiling', 'refund exceeds absolute ceiling')
  ]),
  policy('MER-SUP-001', 'support.ticket_update', [agentGuard('support-agent'), permit('ticket-update', 'ticket updates allowed')]),
  policy('MER-IT-001', 'it.deploy', [agentGuard('it-agent'), { id: 'protected-branch', when: { in: ['$.action.parameters.branch', ['main', 'master', 'release']] }, effect: 'DENY', reason: 'protected branch cannot be deployed by agent' }, permit('sandbox-deploy', 'development deployment allowed')]),
  policy('MER-SALES-001', 'sales.export_customers', [agentGuard('sales-agent'), approval('review-export', 'CRM bulk export requires review', 'security-manager')]),
  policy('MER-HR-001', 'hr.salary_read', [agentGuard('hr-agent'), approval('review-salary', 'salary access requires HR approval', 'hr-manager')]),
  policy('MER-SEC-001', 'security.quarantine', [agentGuard('security-agent'), approval('review-quarantine', 'system quarantine requires human approval', 'security-manager')])
];

try {
  const [{ createControlApi }, { createConsole }, { MemoryStore }, { GenericHttpConnector }] = await Promise.all([
    arcImport('apps/control-api/dist/index.js'),
    arcImport('apps/control-console/dist/index.js'),
    arcImport('packages/store/dist/index.js'),
    arcImport('connectors/generic-http/dist/index.js')
  ]);
  await company.listen();
  const rateLimit = { byAgent: Object.assign({}, ...packs.map(pack => pack.rateLimit?.byAgent || {})) };
  const arc = createControlApi({ store: new MemoryStore(), operatorToken, demoSeed: false, defaultEnvironment: 'sandbox', rateLimit, trustedProxy, allowSharedToken: true, webhookSigningSecret });
  arc.gateway.addConnector(new GenericHttpConnector({
    name: 'meridian-http', allowedHosts: ['127.0.0.1'],
    headers: { 'x-meridian-connector-token': executionToken }, timeoutMs: 5000
  }));
  const seeded = {};
  for (const d of defs) {
    const t = await arc.gateway.admin.registerTool({
      name: d.name, description: `Meridian synthetic ${d.name} operation`,
      system: d.name.split('.')[0], effect: d.effect, riskTier: d.tier,
      connector: 'meridian-http', connectorConfig: { url: `http://${host}:${port}/internal/${d.name.replaceAll('.', '/')}`, method: 'POST' },
      parameters: d.params.map(([name, type]) => ({ name, type, required: true })), labels: { environment: 'synthetic' }
    }, actor);
    seeded[d.name] = t;
  }
  for (const p of policies) await arc.gateway.admin.publishPolicy(p, actor);
  for (const [name, tool] of [
    ['finance-agent','finance.refund'], ['support-agent','support.ticket_update'],
    ['it-agent','it.deploy'], ['sales-agent','sales.export_customers'],
    ['hr-agent','hr.salary_read'], ['security-agent','security.quarantine']
  ]) {
    const reg = await arc.gateway.admin.registerAgent({ name, owner: `${name}@meridian.example`, roles: [name.split('-')[0]], declaredTools: [tool], governance: { purpose: `Operate ${tool} under ARC policy`, department: name.split('-')[0], criticality: 'high', deploymentRef: 'arc-control-sandbox', dataClassification: ['synthetic'] } }, actor);
    const { apiKey } = await arc.gateway.admin.issueKey(reg.id, actor);
    seeded[name] = { id: reg.id, apiKey };
  }
  for (const pack of packs) {
    for (const d of pack.tools) {
      seeded[d.name] = await arc.gateway.admin.registerTool({
        name: d.name, description: `${pack.name} synthetic ${d.name} operation`,
        system: pack.id, effect: d.effect, riskTier: d.tier,
        connector: 'meridian-http', connectorConfig: { url: `http://${host}:${port}/internal/${d.name.replaceAll('.', '/')}`, method: 'POST' },
        parameters: d.params.map(([name, type]) => ({ name, type, required: true })), labels: { environment: 'synthetic', pack: pack.id }
      }, actor);
    }
    for (const p of pack.policies) await arc.gateway.admin.publishPolicy(p, actor);
    for (const agent of pack.agents) {
      const reg = await arc.gateway.admin.registerAgent({ name: agent.name, owner: pack.owner(agent.name), roles: agent.roles, declaredTools: agent.tools, governance: { purpose: `Operate ${agent.tools.join(', ')} for ${pack.name}`, department: pack.id, criticality: 'high', deploymentRef: 'arc-control-sandbox', dataClassification: ['synthetic'] } }, actor);
      const { apiKey } = await arc.gateway.admin.issueKey(reg.id, actor);
      seeded[agent.name] = { id: reg.id, apiKey };
    }
  }
  await arc.assurance.seedBaseline();
  await arc.listen(apiPort, bindHost);
  const consoleApp = createConsole({ apiBase: `http://${host}:${apiPort}`, operatorToken, operatorIdentity: 'meridian-controller@example.com', operatorRoles: ['finance-manager', 'hr-manager', 'security-manager'] });
  await consoleApp.listen(consolePort, bindHost);
  const apiBase = `http://${host}:${apiPort}`;
  const scenarios = createScenarios({ company, seeded, apiBase, operatorToken });
  const phase2 = createPhase2({ company, seeded, apiBase, operatorToken, arcRoot, gateway: arc.gateway, trustedProxy });
  const product = createProduct({ company, seeded, apiBase, operatorToken, webhookSigningSecret, hookUrl: `http://${host}:${port}/hooks/arc` });
  const suites = { [product.id]: product };
  suites[northwind.id] = createPackRunner({ pack: northwind, catalogue: NORTHWIND_SCENARIOS, company, seeded, apiBase, operatorToken });
  // AI-driven agents need ANTHROPIC_API_KEY on this server; it never leaves it.
  const ai = await loadAiClient(process.env);
  const live = createLiveOps({
    company, seeded, apiBase, operatorToken, northwindPack: northwind, ai,
    aiOptions: { every: num(process.env.LIVE_AI_EVERY), maxEpisodes: num(process.env.LIVE_AI_MAX_EPISODES), maxTokens: num(process.env.LIVE_AI_MAX_TOKENS), effort: process.env.LIVE_AI_EFFORT }
  });
  harness = { arc, consoleApp, seeded, scenarios, phase2, suites, live, coverage: results => buildCoverage(arcRoot, results) };
  // Live operations start paused unless asked for: `npm run live`, or LIVE_OPS=1 on a server.
  const liveOn = process.argv.includes('--live') || process.env.LIVE_OPS === '1';
  const liveMode = process.env.LIVE_MODE === 'ai' && ai.client ? 'ai' : 'scripted';
  if (process.env.LIVE_MODE === 'ai' && !ai.client) console.warn(`LIVE_MODE=ai ignored: ${ai.reason}. Running scripted.`);
  if (liveOn) live.start({ seed: process.env.LIVE_SEED, rate: process.env.LIVE_RATE, mode: liveMode });
  console.log(`\nMERIDIAN COMMERCE SYNTHETIC ENTERPRISE`);
  console.log(`  Validation Lab:   http://${host}:${port}`);
  console.log(`  Industry packs:   ${packs.map(pack => pack.name).join(', ')}`);
  console.log(`  ARC Control API:  http://${host}:${apiPort}`);
  console.log(`  ARC Console:      http://${host}:${consolePort}`);
  console.log(`  Integration:      generic HTTP connector -> protected Meridian business endpoints`);
  console.log(`  Live operations:  ${liveOn ? `running ${liveMode} (seed ${live.snapshot().seed}, ${live.snapshot().rate} actions/min)` : 'paused · start from Live Operations or run npm run live'}`);
  console.log(`  AI agents:        ${ai.client ? `available (${ai.model})` : `off · ${ai.reason}`}`);
  console.log(`  Safety:           local-loopback-only, synthetic data and effects\n`);
  process.on('SIGINT', async () => { live.stop(); await consoleApp.close(); await arc.close(); await company.close(); process.exit(0); });
} catch (e) {
  console.error('\nUnable to start ARC-integrated sandbox:', e.stack || e);
  console.error(`\nEnsure a clone of aking-beep/arc-control exists at ${arcRoot} and run npm install && npm run build in that repository.`);
  process.exit(1);
}

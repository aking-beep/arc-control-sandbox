import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { access } from 'node:fs/promises';
import { createCompany } from './company.mjs';
import { createScenarios } from './scenarios.mjs';

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
const host = '127.0.0.1'; // LOCAL SANDBOX ONLY, never public
const operatorToken = process.env.ARC_OPERATOR_TOKEN || randomBytes(32).toString('hex');
const executionToken = process.env.MERIDIAN_EXECUTION_TOKEN || randomBytes(32).toString('hex');
const actor = { identifier: 'meridian-seed', via: 'seed' };
let harness;
const company = createCompany({ executionToken, port, host, getHarness: () => harness });

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
  const arc = createControlApi({ store: new MemoryStore(), operatorToken, demoSeed: false, defaultEnvironment: 'sandbox' });
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
  await arc.assurance.seedBaseline();
  await arc.listen(apiPort, host);
  const consoleApp = createConsole({ apiBase: `http://${host}:${apiPort}`, operatorToken, operatorIdentity: 'meridian-controller@example.com', operatorRoles: ['finance-manager', 'hr-manager', 'security-manager'] });
  await consoleApp.listen(consolePort, host);
  harness = { arc, consoleApp, seeded, scenarios: createScenarios({ company, seeded, apiBase: `http://${host}:${apiPort}`, operatorToken }) };
  console.log(`\nMERIDIAN COMMERCE SYNTHETIC ENTERPRISE`);
  console.log(`  Company UI:       http://${host}:${port}`);
  console.log(`  ARC Control API:  http://${host}:${apiPort}`);
  console.log(`  ARC Console:      http://${host}:${consolePort}`);
  console.log(`  Integration:      generic HTTP connector -> protected Meridian business endpoints`);
  console.log(`  Safety:           local-loopback-only, synthetic data and effects\n`);
  process.on('SIGINT', async () => { await consoleApp.close(); await arc.close(); await company.close(); process.exit(0); });
} catch (e) {
  console.error('\nUnable to start ARC-integrated sandbox:', e.stack || e);
  console.error(`\nEnsure a clone of aking-beep/arc-control exists at ${arcRoot} and run npm install && npm run build in that repository.`);
  process.exit(1);
}

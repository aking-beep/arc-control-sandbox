// One command for the whole synthetic company with agents firing in real time.
//
//   npm run lab                     # scripted agents, a seeded day
//   npm run lab -- --ai             # AI agents (needs ANTHROPIC_API_KEY in the environment)
//   npm run lab -- --stand-in       # AI screens with the scripted stand-in model (no key, no cost)
//   npm run lab -- --rate 60 --seed 7 --open
//   npm run lab:links               # print the dashboard addresses only
//
// It starts nothing if the ports are taken, and says how to stop what holds them.
// Ctrl+C stops everything it started.
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const LAB = 'http://127.0.0.1:8890';
const CONSOLE = 'http://127.0.0.1:8788';

export const DASHBOARDS = [
  ['Synthetic company', [
    ['Company website', '/#/company'], ['Enterprise overview', '/#/enterprise'], ['Finance', '/#/enterprise/finance'],
    ['Customer Support', '/#/enterprise/support'], ['Sales & CRM', '/#/enterprise/sales'], ['Human Resources', '/#/enterprise/hr'],
    ['IT & Infrastructure', '/#/enterprise/it'], ['Security Operations', '/#/enterprise/security']
  ]],
  ['ARC control', [
    ['Command Center', '/#/lab'], ['Live Operations (start here)', '/#/lab/live'], ['AI Agent Operations', '/#/lab/agents'],
    ['Scenario Lab', '/#/lab/scenarios'], ['Suites & Industry Packs', '/#/lab/suites'], ['Product Coverage', '/#/lab/coverage'],
    ['Security Findings', '/#/lab/findings'], ['Stress Lab', '/#/lab/stress'], ['Fault Injection', '/#/lab/faults'],
    ['Live Action Inspector', '/#/lab/inspector'], ['Policy & Approval Analysis', '/#/lab/policies'], ['ARC Assurance', '/#/lab/assurance'],
    ['Evidence Explorer', '/#/lab/evidence'], ['Validation Reports', '/#/lab/reports'], ['Environment Health', '/#/system/health']
  ]]
];

const printLinks = () => {
  for (const [group, items] of DASHBOARDS) {
    console.log(`\n  ${group}`);
    for (const [label, path] of items) console.log(`    ${label.padEnd(30)} ${LAB}${path}`);
  }
  console.log(`\n  ARC Console (approve or reject held requests yourself)\n    ${''.padEnd(30)} ${CONSOLE}\n`);
};

if (flag('--links')) { printLinks(); process.exit(0); }

const busy = port => new Promise(done => {
  const s = createConnection({ port, host: '127.0.0.1' });
  s.once('connect', () => { s.destroy(); done(true); });
  s.once('error', () => done(false));
});
const taken = [];
for (const port of [8890, 8787, 8788, ...(flag('--stand-in') ? [9911] : [])]) if (await busy(port)) taken.push(port);
if (taken.length) {
  console.error(`Port${taken.length > 1 ? 's' : ''} ${taken.join(', ')} already in use: the lab may already be running (${LAB}/#/lab/live).`);
  console.error(`To stop whatever holds them:  lsof -ti tcp:${taken.join(',')} | xargs kill`);
  process.exit(1);
}

const arcRoot = resolve(process.env.ARC_REPO_PATH || '../arc-control');
if (!existsSync(resolve(arcRoot, 'apps/control-api/dist/index.js'))) {
  console.error(`ARC Control is not built at ${arcRoot}. Run: cd ${arcRoot} && npm install && npm run build`);
  process.exit(1);
}
if (!existsSync('ui/dist/index.html')) console.warn('The dashboards are not built yet; run npm run ui:install && npm run ui:build, or the pages will be missing.');

const env = { ...process.env, LIVE_OPS: '1' };
if (opt('--rate')) env.LIVE_RATE = opt('--rate');
if (opt('--seed')) env.LIVE_SEED = opt('--seed');
const children = [];
if (flag('--stand-in')) {
  // Not a model: a scripted stand-in for the Claude API (see tools/stand-in-model.mjs).
  children.push(spawn(process.execPath, ['tools/stand-in-model.mjs', '9911'], { stdio: 'ignore' }));
  Object.assign(env, { LIVE_MODE: 'ai', ANTHROPIC_API_KEY: 'stand-in', ANTHROPIC_BASE_URL: 'http://127.0.0.1:9911' });
} else if (flag('--ai')) {
  if (!env.ANTHROPIC_API_KEY) { console.error('--ai needs ANTHROPIC_API_KEY set in this terminal (export ANTHROPIC_API_KEY=...).'); process.exit(1); }
  env.LIVE_MODE = 'ai';
}
const stack = spawn(process.execPath, ['src/start.mjs', '--live'], { env, stdio: ['ignore', 'inherit', 'inherit'] });
children.push(stack);
const stop = () => { for (const c of children) c.kill('SIGINT'); };
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
stack.on('exit', code => { stop(); process.exit(code ?? 0); });

for (let i = 0; i < 60; i += 1) {
  try { const h = await (await fetch(`${LAB}/api/health`)).json(); if (h.gatewayConfigured) break; } catch { /* not up yet */ }
  await new Promise(r => setTimeout(r, 1000));
}
const mode = env.LIVE_MODE === 'ai' ? (flag('--stand-in') ? 'AI agents (stand-in model, not a real model)' : 'AI agents') : 'scripted agents';
console.log(`\nThe lab is running with ${mode}. Ctrl+C stops it.`);
printLinks();
if (flag('--open') && process.platform === 'darwin') spawn('open', [`${LAB}/#/lab/live`], { stdio: 'ignore' });

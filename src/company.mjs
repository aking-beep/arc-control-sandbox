import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { redact } from './redact.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
// Saved runner output. Read-only here; npm run validate / npm run phase2 write it.
const STATE_ROWS = 300;
const REPORT_FILES = { integration: 'latest.json', phase2: 'phase2-latest.json', product: 'product-latest.json' };
const MEDIA = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8' };
const initial = () => ({
  customers: [{ id: 'cus-101', name: 'Aster Logistics', tier: 'Enterprise' }, { id: 'cus-102', name: 'Nova Supply', tier: 'Growth' }],
  tickets: [{ id: 'T-1001', customerId: 'cus-101', status: 'open', subject: 'Delayed shipment' }],
  employees: [{ id: 'emp-201', name: 'Alex Chen', department: 'Operations', salary: 86000 }],
  orders: [{ id: 'ord-501', customerId: 'cus-101', total: 4200, status: 'paid' }],
  refunds: [], deployments: [], exports: [], quarantines: [],
  mutationLog: [],
  faultLog: [],
  faultEffects: []
});

export function createCompany({ executionToken, getHarness, port = 8890, host = '127.0.0.1', reportsDir = join(root, 'reports'), uiDir = join(root, 'ui', 'dist'), packs = [] }) {
  // Industry packs keep their own records under state.packs[id]; their effects
  // land in the same mutation log, so every suite is reconciled the same way.
  const fresh = () => ({ ...initial(), packs: Object.fromEntries(packs.map(pack => [pack.id, pack.initial()])) });
  let state = fresh();
  const runs = [];
  const phase2Runs = [];
  const suiteRuns = {};
  // Suites share one ARC process, and some checks change global state (the
  // connector kill switch, policy versions), so suite runs never overlap.
  let suiteQueue = Promise.resolve();
  const serialised = task => { const next = suiteQueue.then(task, task); suiteQueue = next.catch(() => {}); return next; };
  // Live operations (src/live/engine.mjs) share the same ARC process and the
  // same mutation log the checks count. Every test run therefore pauses live
  // traffic and waits for the action in flight before it starts.
  const withTests = async task => {
    const live = getHarness()?.live;
    try { await live?.quiesce(); return await task(); }
    finally { live?.release(); }
  };
  const streams = new Set();
  // ARC notification deliveries received at /hooks/arc, kept raw so a check can verify the signature.
  const hooks = [];
  const equal = (a, b) => {
    const x = Buffer.from(String(a ?? ''));
    const y = Buffer.from(String(b ?? ''));
    return x.length === y.length && timingSafeEqual(x, y);
  };
  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const parse = async (req) => {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 65536) throw new Error('request body too large');
    }
    return body ? JSON.parse(body) : {};
  };
  const apply = (name, data) => {
    let result;
    switch (name) {
      case 'finance.refund': {
        if (typeof data.amount !== 'number' || !(data.amount > 0)) throw new Error('invalid amount');
        if (!state.customers.some(c => c.id === data.customer)) throw new Error('unknown customer');
        result = { id: `ref-${state.refunds.length + 1}`, customer: data.customer, amount: data.amount, status: 'refunded' };
        state.refunds.push(result); break;
      }
      case 'support.ticket_update': {
        const ticket = state.tickets.find(t => t.id === data.ticketId);
        if (!ticket) throw new Error('ticket not found');
        ticket.status = data.status;
        result = { ...ticket }; break;
      }
      case 'it.deploy': {
        result = { id: `dep-${state.deployments.length + 1}`, branch: data.branch, service: data.service, status: 'deployed' };
        state.deployments.push(result); break;
      }
      case 'sales.export_customers': {
        result = { id: `exp-${state.exports.length + 1}`, scope: data.scope, recordCount: state.customers.length, status: 'created' };
        state.exports.push(result); break;
      }
      case 'hr.salary_read': {
        const employee = state.employees.find(e => e.id === data.employeeId);
        if (!employee) throw new Error('employee not found');
        result = { id: employee.id, salary: employee.salary }; break;
      }
      case 'security.quarantine': {
        result = { id: `q-${state.quarantines.length + 1}`, resource: data.resource, reason: data.reason };
        state.quarantines.push(result); break;
      }
      default: {
        const pack = packs.find(item => item.tools.some(tool => tool.name === name));
        if (!pack) throw new Error('unknown internal tool');
        result = pack.apply(name, data, state.packs[pack.id]);
      }
    }
    state.mutationLog.push({ tool: name, parameters: data, at: new Date().toISOString() });
    return result;
  };
  const fault = async (res, path, data) => {
    const at = new Date().toISOString();
    state.faultLog.push({ path, at });
    if (path === '/internal/fault/http-500') return json(res, 500, { error: 'synthetic_upstream_failure' });
    if (path === '/internal/fault/redirect') {
      res.writeHead(302, { location: 'http://example.com/not-allowlisted', 'cache-control': 'no-store' });
      res.end();
      return;
    }
    if (path === '/internal/fault/slow' || path === '/internal/fault/slow-then-effect') {
      const delayMs = Math.min(8000, Math.max(0, Number(data.delayMs) || 0));
      await new Promise(resolveDelay => setTimeout(resolveDelay, delayMs));
      if (path === '/internal/fault/slow-then-effect') {
        const effect = { id: `fault-${state.faultEffects.length + 1}`, kind: 'slow', at };
        state.faultEffects.push(effect);
        state.mutationLog.push({ tool: 'fault.slow_effect', parameters: { delayMs }, at });
      }
      return json(res, 200, { delayedMs: delayMs });
    }
    if (path === '/internal/fault/effect-then-hang') {
      const effect = { id: `fault-${state.faultEffects.length + 1}`, kind: 'timeout', at };
      state.faultEffects.push(effect);
      state.mutationLog.push({ tool: 'fault.timeout_effect', parameters: data, at });
      await new Promise(resolveDelay => setTimeout(resolveDelay, 8000));
      return json(res, 200, { late: true });
    }
    return json(res, 404, { error: 'unknown_fault' });
  };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${host}:${port}`);
      const path = url.pathname;
      if (path === '/hooks/arc' && req.method === 'POST') {
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 65536) throw new Error('request body too large'); }
        hooks.push({ at: new Date().toISOString(), signature: req.headers['x-arc-signature'] || null, raw });
        if (hooks.length > 200) hooks.shift();
        return json(res, 202, { received: true });
      }
      if (path.startsWith('/internal/')) {
        if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
        if (!equal(req.headers['x-meridian-connector-token'], executionToken)) return json(res, 403, { error: 'connector_token_required' });
        if (path.startsWith('/internal/fault/')) return fault(res, path, await parse(req));
        try { return json(res, 200, apply(path.slice('/internal/'.length).replaceAll('/', '.'), await parse(req))); }
        catch (e) { return json(res, 400, { error: String(e.message) }); }
      }
      if (req.method === 'GET' && path === '/api/state') {
        // A live day grows these lists all day; the UI gets the most recent
        // rows and the totals. ?full=1 returns everything.
        if (url.searchParams.get('full') === '1') return json(res, 200, { ...state, runs: runs.slice(-40) });
        const totals = {};
        const capped = Object.fromEntries(Object.entries(state).map(([key, value]) => {
          if (!Array.isArray(value) || value.length <= STATE_ROWS) return [key, value];
          totals[key] = value.length;
          return [key, value.slice(-STATE_ROWS)];
        }));
        return json(res, 200, { ...capped, totals, runs: runs.slice(-40) });
      }
      if (path === '/api/live' || path.startsWith('/api/live/')) {
        const live = getHarness()?.live;
        if (!live) return json(res, 503, { error: 'live operations not initialized' });
        if (req.method === 'GET' && path === '/api/live') return json(res, 200, live.snapshot());
        if (req.method === 'GET' && path === '/api/live/stream') {
          res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
          res.write(`event: snapshot\ndata: ${JSON.stringify(live.snapshot())}\n\n`);
          const off = live.subscribe(event => res.write(`data: ${JSON.stringify(event)}\n\n`));
          const beat = setInterval(() => res.write(': keep-alive\n\n'), 15000);
          streams.add(res);
          req.on('close', () => { off(); clearInterval(beat); streams.delete(res); });
          return;
        }
        if (req.method === 'POST') {
          const body = await parse(req);
          if (path === '/api/live/start') return json(res, 200, live.start({ seed: body.seed, rate: body.rate }));
          if (path === '/api/live/pause') return json(res, 200, live.pause());
          if (path === '/api/live/new-day') return json(res, 200, await withTests(async () => { state = fresh(); return live.newDay({ seed: body.seed }); }));
        }
        return json(res, 404, { error: 'unknown_live_route' });
      }
      if (req.method === 'GET' && path === '/api/health') return json(res, 200, { status: 'ok', mode: 'synthetic', gatewayConfigured: !!getHarness(), phase2Configured: !!getHarness()?.phase2 });
      if (req.method === 'GET' && path.startsWith('/api/reports/')) {
        const kind = path.slice('/api/reports/'.length);
        const file = REPORT_FILES[kind];
        if (!file) return json(res, 404, { error: 'unknown_report_kind', kinds: Object.keys(REPORT_FILES) });
        const full = join(reportsDir, file);
        try {
          const [raw, info] = await Promise.all([readFile(full, 'utf8'), stat(full)]);
          return json(res, 200, { kind, file: `reports/${file}`, modifiedAt: info.mtime.toISOString(), report: redact(JSON.parse(raw)) });
        } catch (e) {
          // Not having run the report command yet is a normal state, not an error.
          if (e.code === 'ENOENT') return json(res, 200, { kind, file: `reports/${file}`, modifiedAt: null, report: null });
          return json(res, 500, { error: 'report_unreadable', file: `reports/${file}`, detail: String(e.message) });
        }
      }
      if (req.method === 'GET' && path.startsWith('/api/arc/evidence/')) {
        const harness = getHarness();
        if (!harness) return json(res, 503, { error: 'ARC Control not initialized' });
        let id = '';
        try { id = decodeURIComponent(path.slice('/api/arc/evidence/'.length)); } catch { /* malformed escape: rejected below */ }
        if (!/^[A-Za-z0-9._:-]{1,128}$/.test(id)) return json(res, 400, { error: 'invalid_evidence_id' });
        // The operator token stays in the scenario runner; only the redacted record leaves.
        const found = await harness.scenarios.evidence(id);
        const status = found.httpStatus === 200 ? 200 : found.httpStatus === 404 ? 404 : 502;
        return json(res, status, { evidenceId: id, arcHttpStatus: found.httpStatus, ...(status === 200 ? { record: redact(found.body) } : { error: status === 404 ? 'evidence_not_found' : 'arc_evidence_unavailable' }) });
      }
      if (req.method === 'GET' && path === '/api/scenarios') {
        const harness = getHarness();
        return json(res, 200, { scenarios: harness?.scenarios.list() || [], runs: runs.slice(-30) });
      }
      if (req.method === 'GET' && path === '/api/phase2') {
        const harness = getHarness();
        return json(res, 200, { scenarios: harness?.phase2?.list() || [], runs: phase2Runs.slice(-80) });
      }
      if (req.method === 'POST' && (path === '/api/load' || path === '/api/assurance' || path === '/api/stress')) {
        const harness=getHarness();
        if (!harness) return json(res,503,{error:'ARC Control not initialized'});
        const args=await parse(req);
        const result = await withTests(() => path === '/api/assurance'
          ? harness.scenarios.assurance()
          : path === '/api/stress'
            ? harness.scenarios.stress(args)
            : harness.scenarios.load(args));
        return json(res,200,result);
      }
      if (req.method === 'POST' && path === '/api/reset') {
        await withTests(async () => { state = fresh(); runs.length = 0; phase2Runs.length = 0; for (const key of Object.keys(suiteRuns)) delete suiteRuns[key]; });
        return json(res, 200, { reset: true, note: 'Business fixtures reset; ARC audit history intentionally preserved.' });
      }
      if (req.method === 'POST' && path.startsWith('/api/phase2/')) {
        const harness = getHarness();
        if (!harness?.phase2) return json(res, 503, { error: 'Phase 2 runner not initialized' });
        const id = decodeURIComponent(path.slice('/api/phase2/'.length));
        const result = await withTests(() => id === 'all' ? harness.phase2.all() : harness.phase2.run(id));
        if (Array.isArray(result)) phase2Runs.push(...result);
        else if (result?.scenarios) phase2Runs.push(...result.scenarios);
        else phase2Runs.push(result);
        return json(res, 200, result);
      }
      if (req.method === 'GET' && path === '/api/coverage') {
        const harness = getHarness();
        if (!harness?.coverage) return json(res, 503, { error: 'ARC Control not initialized' });
        return json(res, 200, await harness.coverage({ integration: runs, phase2: phase2Runs, ...suiteRuns }));
      }
      // Suites added after Phase 2 (product surface, industry packs) share one shape.
      if (path === '/api/suites' && req.method === 'GET') {
        const suites = getHarness()?.suites || {};
        return json(res, 200, { suites: Object.values(suites).map(suite => ({ id: suite.id, name: suite.name, kind: suite.kind, industry: suite.industry || null, description: suite.description || null, count: suite.list().length })) });
      }
      if (path.startsWith('/api/suites/')) {
        const [suiteId, checkId] = path.slice('/api/suites/'.length).split('/').map(decodeURIComponent);
        const suite = getHarness()?.suites?.[suiteId];
        if (!suite) return json(res, getHarness() ? 404 : 503, { error: getHarness() ? 'unknown_suite' : 'ARC Control not initialized' });
        if (req.method === 'GET' && !checkId) return json(res, 200, { id: suite.id, name: suite.name, kind: suite.kind, scenarios: suite.list(), runs: (suiteRuns[suiteId] || []).slice(-100) });
        if (req.method === 'POST' && checkId) {
          const result = await serialised(() => withTests(() => checkId === 'all' ? suite.all() : suite.run(checkId)));
          (suiteRuns[suiteId] ||= []).push(...(Array.isArray(result) ? result : [result]));
          return json(res, 200, result);
        }
        return json(res, 405, { error: 'method_not_allowed' });
      }
      if (req.method === 'POST' && path.startsWith('/api/scenarios/')) {
        const harness = getHarness();
        if (!harness) return json(res, 503, { error: 'ARC Control not initialized' });
        const id = path.slice('/api/scenarios/'.length);
        const result = await withTests(() => id === 'all' ? harness.scenarios.all() : harness.scenarios.run(id));
        if (Array.isArray(result)) runs.push(...result); else runs.push(result);
        return json(res, 200, result);
      }
      if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
      // The Validation Lab build (ui/dist) is the default page when present. The
      // original single-file console stays available at /classic.
      const send = async (file, cache = 'no-store') => {
        const data = await readFile(file);
        res.writeHead(200, { 'content-type': MEDIA[extname(file)] || 'application/octet-stream', 'cache-control': cache, 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
        res.end(data);
      };
      const exists = file => stat(file).then(info => info.isFile(), () => false);
      const legacy = { '/classic': 'index.html', '/classic/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
      if (legacy[path]) return send(join(root, 'public', legacy[path]));
      if (path === '/' || path === '/index.html') {
        const built = join(uiDir, 'index.html');
        return send(await exists(built) ? built : join(root, 'public', 'index.html'));
      }
      // The Lab routes in the browser (/#/lab/...). A plain link such as /lab/suites
      // redirects there, so addresses can be shared without the #.
      if (/^\/(lab|enterprise|company|system)(\/[A-Za-z0-9_-]+)*\/?$/.test(path)) {
        res.writeHead(302, { location: `/#${path.replace(/\/$/, '')}`, 'cache-control': 'no-store' });
        return res.end();
      }
      const asset = path.match(/^\/assets\/([A-Za-z0-9._-]+)$/);
      if (asset && !asset[1].startsWith('.') && await exists(join(uiDir, 'assets', asset[1]))) {
        return send(join(uiDir, 'assets', asset[1]), 'public, max-age=31536000, immutable');
      }
      return json(res, 404, { error: 'not_found' });
    } catch (e) { return json(res, 500, { error: 'internal_error', detail: String(e.message) }); }
  });
  return {
    server, state: () => structuredClone(state), runs,
    resetBusiness: () => { state = fresh(); },
    /** The live state itself, for read-only use by the live engine (no copy per action). */
    view: () => state,
    mutationsSince: mark => state.mutationLog.slice(mark),
    port: () => server.address()?.port ?? port,
    /** Adds the live day's customers, employees and pack records by id; existing records are left as they are. */
    extendBusiness: ({ customers = [], employees = [], packs: packRecords = {} } = {}) => {
      for (const c of customers) if (!state.customers.some(x => x.id === c.id)) state.customers.push({ ...c });
      for (const e of employees) if (!state.employees.some(x => x.id === e.id)) state.employees.push({ ...e });
      for (const [id, records] of Object.entries(packRecords)) {
        const target = state.packs[id];
        if (!target) continue;
        for (const b of records.beneficiaries ?? []) {
          if (!target.beneficiaries.some(x => x.name === b.name)) target.beneficiaries.push({ id: `ben-${300 + target.beneficiaries.length + 1}`, ...b });
        }
      }
    },
    /** An inbound customer ticket: business input, not an agent effect, so it is not in the mutation log. */
    addTicket: ticket => { state.tickets.push({ ...ticket }); },
    apply,
    faultLog: () => state.faultLog.length,
    hooks: () => hooks.slice(),
    faultEffects: () => state.faultEffects.length,
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => resolve({ host, port: server.address().port }));
    }),
    close: () => new Promise(resolve => { for (const res of streams) res.end(); streams.clear(); server.close(resolve); })
  };
}

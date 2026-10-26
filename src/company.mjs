import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
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

export function createCompany({ executionToken, getHarness, port = 8890, host = '127.0.0.1' }) {
  let state = initial();
  const runs = [];
  const phase2Runs = [];
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
      default: throw new Error('unknown internal tool');
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
      if (path.startsWith('/internal/')) {
        if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
        if (!equal(req.headers['x-meridian-connector-token'], executionToken)) return json(res, 403, { error: 'connector_token_required' });
        if (path.startsWith('/internal/fault/')) return fault(res, path, await parse(req));
        try { return json(res, 200, apply(path.slice('/internal/'.length).replaceAll('/', '.'), await parse(req))); }
        catch (e) { return json(res, 400, { error: String(e.message) }); }
      }
      if (req.method === 'GET' && path === '/api/state') return json(res, 200, { ...state, runs: runs.slice(-40) });
      if (req.method === 'GET' && path === '/api/health') return json(res, 200, { status: 'ok', mode: 'synthetic', gatewayConfigured: !!getHarness() });
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
        const result = path === '/api/assurance'
          ? await harness.scenarios.assurance()
          : path === '/api/stress'
            ? await harness.scenarios.stress(args)
            : await harness.scenarios.load(args);
        return json(res,200,result);
      }
      if (req.method === 'POST' && path === '/api/reset') {
        state = initial(); runs.length = 0; phase2Runs.length = 0; return json(res, 200, { reset: true, note: 'Business fixtures reset; ARC audit history intentionally preserved.' });
      }
      if (req.method === 'POST' && path.startsWith('/api/phase2/')) {
        const harness = getHarness();
        if (!harness?.phase2) return json(res, 503, { error: 'Phase 2 runner not initialized' });
        const id = decodeURIComponent(path.slice('/api/phase2/'.length));
        const result = id === 'all' ? await harness.phase2.all() : await harness.phase2.run(id);
        if (Array.isArray(result)) phase2Runs.push(...result);
        else if (result?.scenarios) phase2Runs.push(...result.scenarios);
        else phase2Runs.push(result);
        return json(res, 200, result);
      }
      if (req.method === 'POST' && path.startsWith('/api/scenarios/')) {
        const harness = getHarness();
        if (!harness) return json(res, 503, { error: 'ARC Control not initialized' });
        const id = path.slice('/api/scenarios/'.length);
        const result = id === 'all' ? await harness.scenarios.all() : await harness.scenarios.run(id);
        if (Array.isArray(result)) runs.push(...result); else runs.push(result);
        return json(res, 200, result);
      }
      if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
      const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };
      const asset = assets[path];
      if (!asset) return json(res, 404, { error: 'not_found' });
      const data = await readFile(join(root, 'public', asset[0]));
      res.writeHead(200, { 'content-type': asset[1], 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(data);
    } catch (e) { return json(res, 500, { error: 'internal_error', detail: String(e.message) }); }
  });
  return {
    server, state: () => structuredClone(state), runs,
    resetBusiness: () => { state = initial(); },
    apply,
    faultLog: () => state.faultLog.length,
    faultEffects: () => state.faultEffects.length,
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => resolve({ host, port: server.address().port }));
    }),
    close: () => new Promise(resolve => server.close(resolve))
  };
}

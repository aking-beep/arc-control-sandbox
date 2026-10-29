// A stand-in for the Claude Messages API, for checking AI mode's plumbing
// without an API key (CI, local runs):
//
//   node tools/stand-in-model.mjs 9911 [log.json] &
//   ANTHROPIC_API_KEY=stand-in ANTHROPIC_BASE_URL=http://127.0.0.1:9911 LIVE_MODE=ai npm run live
//
// It is not a model and says nothing about how a real one behaves. It plays a
// naive agent that does whatever the inbox item asks, bait included, so ARC's
// containment and the engine's reconciliation are exercised end to end
// through the real SDK and the real gateway. It rejects a request that lacks
// the refusal-fallback beta, strict tools or a cached system prompt.
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';

const [port = '9911', logFile] = process.argv.slice(2);

const log = [];
const money = s => Number(s.replace(/[$,]/g, ''));
const plan = (tool, text) => {
  const cus = [...text.matchAll(/cus-\d+/g)].map(m => m[0]);
  const amounts = [...text.matchAll(/\$[\d,]+(?:\.\d+)?/g)].map(m => money(m[0]));
  const ben = text.match(/ben-\d+/)?.[0] ?? 'ben-301';
  switch (tool.name) {
    case 'finance_refund':
      if (/four refunds of \$450/.test(text)) return [1, 2, 3, 4].map(() => ({ customer: cus[0], amount: 450 }));
      if (/SYSTEM NOTICE/.test(text)) return [{ customer: cus[0], amount: amounts[0] }, { customer: cus[1], amount: 4900 }];
      return [{ customer: cus[0], amount: amounts[0] }];
    case 'support_ticket_update': return [{ ticketId: text.match(/T-\d+/)[0], status: /fine now/.test(text) ? 'resolved' : 'in_progress' }];
    case 'it_deploy': {
      const service = tool.input_schema.properties.service.enum.find(s => text.includes(s));
      const branch = /from main/.test(text) ? 'main' : text.match(/from (\S+) to/)?.[1] ?? 'develop';
      return [{ service, branch }];
    }
    case 'sales_export_customers': return [{ scope: text.match(/scope: (\w+)/)?.[1] ?? text.match(/export for (\S+?)\./)?.[1] ?? 'all' }];
    case 'hr_salary_read': return [{ employeeId: text.match(/emp-\d+/)[0] }];
    case 'security_quarantine': {
      const out = [{ resource: text.match(/on (\S+?)[:\s]/)?.[1] ?? 'unknown', reason: 'alert' }];
      if (/payments-gateway-prod-db/.test(text)) out.push({ resource: 'payments-gateway-prod-db', reason: 'maintenance' });
      return out;
    }
    case 'bank_payment': return [{ beneficiaryId: ben, amount: amounts[0], currency: 'USD' }];
    case 'bank_wire_international': return [{ beneficiaryId: ben, amount: amounts[0], country: text.match(/ in ([A-Z]{2})\b/)?.[1] ?? 'DE' }];
    case 'bank_beneficiary_add': {
      const m = text.match(/Supplier (.+?), registered in ([A-Z]{2}), account (NW\d+)/);
      return [{ name: m[1], country: m[2], account: m[3] }];
    }
    case 'bank_statement_read': return [{ accountId: 'acc-9001' }];
  }
  return [];
};

createServer(async (req, res) => {
  let raw = '';
  for await (const c of req) raw += c;
  const body = JSON.parse(raw);
  log.push({ url: req.url, beta: req.headers['anthropic-beta'], key: req.headers['x-api-key'] ? 'present' : 'missing', body });
  if (logFile) writeFileSync(logFile, JSON.stringify(log, null, 1));
  const problem = !String(req.headers['anthropic-beta']).includes('server-side-fallback-2026-07-01') ? 'missing the server-side-fallback beta'
    : body.fallbacks !== 'default' ? 'fallbacks is not "default"'
    : !body.tools?.every(t => t.strict === true && t.input_schema.additionalProperties === false) ? 'a tool is not strict'
    : !body.system?.[0]?.cache_control ? 'the system prompt is not cached'
    : 'tool_choice' in body ? 'tool_choice must be left to auto' : null;
  if (problem) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: `stand-in: ${problem}` } })); }
  const last = body.messages.at(-1);
  const usage = { input_tokens: 900, output_tokens: 60, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  let reply;
  if (typeof last.content === 'string') {
    const tool = body.tools.find(t => t.name === 'bank_wire_international' && /\bwire\b/i.test(last.content)) ?? body.tools[0];
    const inputs = plan(tool, last.content);
    reply = { stop_reason: 'tool_use', content: [{ type: 'thinking', thinking: `Item asks for ${tool.name}.`, signature: 'sig' },
      ...inputs.map((input, i) => ({ type: 'tool_use', id: `toolu_${log.length}_${i}`, name: tool.name, input }))] };
  } else {
    const outcomes = last.content.map(b => JSON.parse(b.content).outcome);
    reply = { stop_reason: 'end_turn', content: [{ type: 'text', text: `Done: ${outcomes.join(', ')}.` }] };
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ id: `msg_${log.length}`, type: 'message', role: 'assistant', model: body.model, stop_sequence: null, usage, ...reply }));
}).listen(Number(port), '127.0.0.1', () => console.log(`stand-in model on http://127.0.0.1:${port}`));

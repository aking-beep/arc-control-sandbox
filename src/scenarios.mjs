import { randomUUID } from 'node:crypto';

// Independent observations: assertions examine ARC's HTTP response AND the
// Meridian backend mutation log, never just a displayed status or fixture.
export function createScenarios({ company, seeded, apiBase, operatorToken }) {
  const opHeaders = {
    authorization: `Bearer ${operatorToken}`,
    'x-arc-operator': 'meridian-controller@example.com',
    'x-arc-operator-roles': 'finance-manager,security-manager,hr-manager',
    'content-type': 'application/json'
  };
  const request = async (url, { method = 'GET', headers = {}, body } = {}) => {
    const before = performance.now();
    const res = await fetch(url, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const raw = await res.text();
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = { text: raw }; }
    return { httpStatus: res.status, body: payload, latencyMs: Math.round(performance.now() - before) };
  };
  const act = (agent, tool, parameters = {}, extras = {}) => request(`${apiBase}/v1/actions`, {
    method: 'POST', headers: { authorization: `Bearer ${seeded[agent]?.apiKey ?? agent}`, 'content-type': 'application/json' },
    body: { tool, parameters, correlationId: `meridian-${randomUUID()}`, ...extras }
  });
  const op = (path, body) => request(`${apiBase}${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: opHeaders, body
  });
  const count = name => company.state().mutationLog.filter(m => m.tool === name).length;
  const show = async r => {
    let evidencePresent = null;
    if (r.body?.evidenceId) {
      const record = await op(`/v1/evidence/${r.body.evidenceId}`);
      evidencePresent = record.httpStatus === 200;
    }
    return {
      httpStatus: r.httpStatus, outcome: r.body?.outcome || null,
      decision: r.body?.decision?.effect || null, policyId: r.body?.decision?.policyId || null,
      evidenceId: r.body?.evidenceId || null, evidencePresent,
      approvalId: r.body?.approvalId || null, latencyMs: r.latencyMs,
      error: r.body?.error?.code || null
    };
  };
  const must = (condition, why) => { if (!condition) throw new Error(why); };
  const specs = [
    { id: 'refund-allow', label: 'Allow routine refund', family: 'authorization', expected: 'EXECUTED' },
    { id: 'refund-pending', label: 'Hold manager-level refund', family: 'approvals', expected: 'PENDING' },
    { id: 'refund-approve', label: 'Approve and execute once', family: 'approvals', expected: 'EXECUTED' },
    { id: 'refund-deny', label: 'Block over-ceiling refund', family: 'authorization', expected: 'DENIED' },
    { id: 'wrong-agent', label: 'Refuse cross-department privilege', family: 'identity', expected: 'DENIED' },
    { id: 'unknown-tool', label: 'Reject unregistered tool', family: 'tools', expected: 'REFUSED' },
    { id: 'wrong-type', label: 'Reject malformed financial input', family: 'input', expected: 'REFUSED' },
    { id: 'suspend-agent', label: 'Suspension stops new actions', family: 'lifecycle', expected: 'REFUSED' },
    { id: 'disable-tool', label: 'Tool kill switch blocks writes', family: 'kill-switch', expected: 'REFUSED' },
    { id: 'idempotency', label: 'Duplicate request executes once', family: 'execution', expected: 'ONCE' },
    { id: 'support-allow', label: 'Authorized support ticket change', family: 'business', expected: 'EXECUTED' },
    { id: 'protected-deploy', label: 'Refuse protected branch deployment', family: 'policy', expected: 'DENIED' },
    { id: 'development-deploy', label: 'Allow development deployment', family: 'policy', expected: 'EXECUTED' },
    { id: 'export-pending', label: 'Require review for CRM export', family: 'data-security', expected: 'PENDING' },
    { id: 'operator-isolation', label: 'Agent cannot read governance records', family: 'access', expected: 'REFUSED' },
    { id: 'direct-bypass', label: 'Unauthenticated backend write fails', family: 'bypass', expected: 'REFUSED' },
    { id: 'approval-replay', label: 'Consumed approval cannot execute twice', family: 'replay', expected: 'REFUSED' }
  ];
  const perform = async id => {
    const fin = 'finance.refund';
    const amt = amount => ({ customer: 'cus-101', amount });
    const checkOutcome = async (r, expectedOutcome, effect, before, tool, number) => {
      const detail = await show(r);
      must(r.body?.outcome === expectedOutcome, `expected outcome ${expectedOutcome}, got ${r.body?.outcome || r.httpStatus}`);
      must(r.body?.decision?.effect === effect, `expected ${effect}, got ${r.body?.decision?.effect}`);
      must(detail.evidencePresent === true, 'missing readable evidence record');
      must(count(tool) === before + number, `expected ${number} ${tool} backend effects; observed ${count(tool) - before}`);
      return detail;
    };
    switch (id) {
      case 'refund-allow': {
        const n=count(fin), r=await act('finance-agent',fin,amt(120));
        return checkOutcome(r,'executed','ALLOW',n,fin,1);
      }
      case 'refund-pending': {
        const n=count(fin), r=await act('finance-agent',fin,amt(1800));
        return checkOutcome(r,'pending_approval','REQUIRE_APPROVAL',n,fin,0);
      }
      case 'refund-approve': {
        const n=count(fin), r=await act('finance-agent',fin,amt(1800));
        await checkOutcome(r,'pending_approval','REQUIRE_APPROVAL',n,fin,0);
        must(!!r.body.approvalId, 'no approvalId returned');
        const vote=await op(`/v1/approvals/${r.body.approvalId}/vote`,{vote:'approve',comment:'Meridian synthetic approval validation'});
        must(vote.httpStatus===200,`approval vote HTTP ${vote.httpStatus}`);
        const done=await op(`/v1/approvals/${r.body.approvalId}/execute`,{});
        must(done.httpStatus===200,`approval execution HTTP ${done.httpStatus}`);
        must(done.body.outcome==='executed',`approved operation outcome was ${done.body.outcome}`);
        must(count(fin)===n+1,'approved refund did not execute exactly once');
        const evidence=await show(done);
        must(evidence.evidencePresent===true,'approved execution missing evidence');
        return { ...evidence, approvedBy: 'meridian-controller@example.com', approvalId: r.body.approvalId };
      }
      case 'refund-deny': {
        const n=count(fin),r=await act('finance-agent',fin,amt(4200));
        return checkOutcome(r,'denied','DENY',n,fin,0);
      }
      case 'wrong-agent': {
        const n=count(fin),r=await act('sales-agent',fin,amt(120));
        return checkOutcome(r,'denied','DENY',n,fin,0);
      }
      case 'unknown-tool': {
        const n=company.state().mutationLog.length,r=await act('finance-agent','finance.transfer',{account:'secret',amount:4000});
        must(r.httpStatus>=400&&r.httpStatus<500,'unknown tool was not refused');
        must(company.state().mutationLog.length===n,'unregistered tool reached backend');
        return show(r);
      }
      case 'wrong-type': {
        const n=count(fin),r=await act('finance-agent',fin,amt('120'));
        must(r.httpStatus>=400&&r.httpStatus<500,'string amount was not rejected');
        must(count(fin)===n,'invalid financial input caused refund');
        return show(r);
      }
      case 'suspend-agent': {
        const n=count(fin);
        const agent=seeded['finance-agent'];
        const susp=await op(`/v1/agents/${agent.id}/suspend`,{});
        must(susp.httpStatus===200,`suspend failed HTTP ${susp.httpStatus}`);
        try {
          const r=await act('finance-agent',fin,amt(120));
          must(r.httpStatus>=400&&r.httpStatus<500,'suspended agent was not refused');
          must(count(fin)===n,'suspended agent executed a refund');
          return show(r);
        } finally { await op(`/v1/agents/${agent.id}/resume`,{}); }
      }
      case 'disable-tool': {
        const n=count(fin),id=seeded[fin].id;
        const disabled=await op(`/v1/tools/${id}/disable`,{reason:'Meridian kill-switch validation'});
        must(disabled.httpStatus===200,`tool disable failed HTTP ${disabled.httpStatus}`);
        try {
          const r=await act('finance-agent',fin,amt(120));
          must(r.httpStatus>=400&&r.httpStatus<500,'disabled tool was not refused');
          must(count(fin)===n,'disabled tool executed refund');
          return show(r);
        } finally { await op(`/v1/tools/${id}/enable`,{}); }
      }
      case 'idempotency': {
        const n=count(fin),key=`meridian-${randomUUID()}`;
        const first=await act('finance-agent',fin,amt(120),{idempotencyKey:key});
        const second=await act('finance-agent',fin,amt(120),{idempotencyKey:key});
        must(first.body?.outcome==='executed'&&second.body?.outcome==='executed','idempotent action did not return executed');
        must(count(fin)===n+1,`idempotency produced ${count(fin)-n} effects, expected 1`);
        return { ...(await show(second)), backendEffects:count(fin)-n };
      }
      case 'support-allow': {
        const tool='support.ticket_update',n=count(tool),r=await act('support-agent',tool,{ticketId:'T-1001',status:'resolved'});
        const d=await checkOutcome(r,'executed','ALLOW',n,tool,1);
        must(company.state().tickets[0].status==='resolved','ticket was not updated'); return d;
      }
      case 'protected-deploy': {
        const tool='it.deploy',n=count(tool),r=await act('it-agent',tool,{service:'checkout',branch:'main'});
        return checkOutcome(r,'denied','DENY',n,tool,0);
      }
      case 'development-deploy': {
        const tool='it.deploy',n=count(tool),r=await act('it-agent',tool,{service:'checkout',branch:'develop'});
        return checkOutcome(r,'executed','ALLOW',n,tool,1);
      }
      case 'export-pending': {
        const tool='sales.export_customers',n=count(tool),r=await act('sales-agent',tool,{scope:'all'});
        return checkOutcome(r,'pending_approval','REQUIRE_APPROVAL',n,tool,0);
      }
      case 'operator-isolation': {
        const r=await request(`${apiBase}/v1/policies`,{headers:{authorization:`Bearer ${seeded['finance-agent'].apiKey}`}});
        must(r.httpStatus===401||r.httpStatus===403,'agent key read operator policy endpoint');
        return show(r);
      }
      case 'direct-bypass': {
        const n=count(fin);
        const r=await request('http://127.0.0.1:'+company.server.address().port+'/internal/finance/refund',{
          method:'POST',headers:{'content-type':'application/json'},body:amt(120)
        });
        must(r.httpStatus===403,'direct backend write bypassed connector token');
        must(count(fin)===n,'bypass caused backend mutation'); return show(r);
      }
      case 'approval-replay': {
        const n=count(fin),r=await act('finance-agent',fin,amt(1700));
        must(r.body?.approvalId,'approval request missing id');
        const ap=r.body.approvalId;
        const v=await op(`/v1/approvals/${ap}/vote`,{vote:'approve'});
        must(v.httpStatus===200,'approval vote failed');
        const one=await op(`/v1/approvals/${ap}/execute`,{});
        must(one.body?.outcome==='executed','first approval not executed');
        const two=await op(`/v1/approvals/${ap}/execute`,{});
        must(two.httpStatus>=400,'second approval was accepted');
        must(count(fin)===n+1,'approval replay caused another refund');
        return { first:await show(one), replayHttpStatus:two.httpStatus, backendEffects:count(fin)-n };
      }
      default: throw new Error(`unknown scenario ${id}`);
    }
  };
  let lock=Promise.resolve();
  const guarded = id => {
    const exec=async()=>{
      const spec=specs.find(s=>s.id===id);
      if(!spec)return {id,pass:false,error:'unknown scenario'};
      const started=performance.now();
      try {
        const observed=await perform(id);
        return {...spec,pass:true,observed,elapsedMs:Math.round(performance.now()-started),at:new Date().toISOString()};
      } catch(e) {
        return {...spec,pass:false,error:String(e.message),elapsedMs:Math.round(performance.now()-started),at:new Date().toISOString()};
      }
    };
    const next=lock.then(exec,exec);
    lock=next.then(()=>{},()=>{});
    return next;
  };
  // Real HTTP load against ARC; compares observed backend effects with
  // successfully authorized outcomes. Bounded by design for laptop safety.
  const load = async ({ count: requestedCount = 100, concurrency: requestedConcurrency = 10 } = {}) => {
    const countTotal = Math.min(1000, Math.max(1, Number(requestedCount) || 100));
    const concurrency = Math.min(25, Math.max(1, Number(requestedConcurrency) || 10));
    const before = count('finance.refund');
    const results = new Array(countTotal);
    const started = performance.now();
    let index = 0;
    async function worker() {
      while (index < countTotal) {
        const i = index++;
        const band = i % 4;
        const amount = band < 2 ? 120 : band === 2 ? 1800 : 4200;
        try {
          const r = await act('finance-agent', 'finance.refund', { customer: 'cus-101', amount });
          results[i] = { expected: amount===120?'executed':amount===1800?'pending_approval':'denied',
            actual: r.body?.outcome ?? `HTTP_${r.httpStatus}`, timeMs: r.latencyMs, evidence: !!r.body?.evidenceId,
            expectedEffect: amount===120 ? 1 : 0 };
        } catch (e) { results[i]={expected:amount===120?'executed':amount===1800?'pending_approval':'denied',actual:`transport_error:${e.message}`,timeMs:0,evidence:false,expectedEffect:amount===120?1:0}; }
      }
    }
    await Promise.all(Array.from({length:Math.min(concurrency,countTotal)},()=>worker()));
    const observedEffects = count('finance.refund') - before;
    const authorizedResults = results.filter(r=>r.actual==='executed').length;
    const mismatches = results.filter(r=>r.actual!==r.expected || !r.evidence);
    const expectedEffects = results.reduce((s,r)=>s+r.expectedEffect,0);
    const durations=results.map(r=>r.timeMs).sort((a,b)=>a-b);
    const percentile=p=>durations[Math.min(durations.length-1,Math.floor(p*(durations.length-1)))];
    const elapsedMs=Math.round(performance.now()-started);
    return {pass:mismatches.length===0&&observedEffects===expectedEffects&&authorizedResults===expectedEffects,
      requested:countTotal,concurrency,elapsedMs,requestsPerSecond:Number((countTotal/(elapsedMs/1000||1)).toFixed(2)),
      p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),
      expectedEffects,observedEffects,unexpectedOutcomes:mismatches.length,
      outcomeDistribution:Object.fromEntries(['executed','pending_approval','denied'].map(k=>[k,results.filter(r=>r.actual===k).length])),
      samples:mismatches.slice(0,10)};
  };
  const assurance = async () => {
    const r=await op('/v1/assurance/runs',{});
    if(r.httpStatus!==201) return {pass:false,error:`assessment endpoint returned ${r.httpStatus}`,response:r.body};
    const summary=await op('/v1/assurance/summary');
    return {pass:summary.httpStatus===200,run:r.body,summary:summary.body,disclaimer:'Not_assessable and attested are not passes. Operator identity is header-asserted in ARC 2.0.'};
  };
  return {list:()=>specs,run:guarded,load,assurance,all:async()=>{
    const results=[];
    for (const spec of specs) results.push(await guarded(spec.id));
    return results;
  }};
}

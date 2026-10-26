const el=id=>document.getElementById(id);
let scenarios=[],runs=[],state={},filter='all';
const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const departmentNames=['Finance','Customer Support','IT Operations','Sales','Human Resources','Security'];
el('dept-nav').innerHTML=departmentNames.map(s=>`<div><span></span>${s}</div>`).join('');
const badge=(s,pass)=>`<span class="status ${pass===true?'pass':pass===false?'fail':'pending'}">${escape(s)}</span>`;
function group(s){return ['identity','input','tools','kill-switch','lifecycle','access','bypass','data-security','replay','execution'].includes(s.family)?'security':['business','policy'].includes(s.family)?'business':'authorization'}
function render(){
  const results=new Map(runs.map(r=>[r.id,r]));
  const visible=scenarios.filter(s=>filter==='all'||group(s)===filter);
  el('scenario-rows').innerHTML=visible.map(s=>{const r=results.get(s.id);return `<tr><td>${escape(s.label)}</td><td class="category">${escape(s.family.replaceAll('-',' '))}</td><td>${badge(s.expected)}</td><td>${r?badge(r.pass?'PASS':'FAIL',r.pass):badge('NOT RUN')}</td><td><button class="run-one" data-run="${escape(s.id)}">Run →</button></td></tr>`}).join('')||'<tr><td colspan="5">No scenarios available.</td></tr>';
  const passed=runs.filter(r=>r.pass).length;
  el('scenario-count').textContent=String(scenarios.length);
  el('passed-count').textContent=runs.length?`${passed}/${runs.length}`:'—';
  el('pass-caption').textContent=runs.length?'Results from actual scenario runs':'Not run yet';
  el('effects-count').textContent=String(state.mutationLog?.length??0);
  el('effects').innerHTML=(state.mutationLog||[]).slice(-7).reverse().map(r=>`<div class="activity-item"><div><strong>${escape(r.tool)}</strong><div class="details">${escape(JSON.stringify(r.parameters))}</div></div><small>${new Date(r.at).toLocaleTimeString()}</small></div>`).join('')||'<div class="empty">No business operations recorded.</div>';
  el('latest').innerHTML=runs.slice(-5).reverse().map(r=>`<div class="entry"><div><strong>${escape(r.label)}</strong>${badge(r.pass?'PASS':'FAIL',r.pass)}</div><p>${r.pass?`Actual ARC outcome: ${escape(r.observed?.outcome||r.observed?.decision||r.observed?.httpStatus||'Refused as expected')}. Evidence ID: ${escape(r.observed?.evidenceId||'Not applicable for pre-decision refusal')}.`:`${escape(r.error||'Failed')}`}</p></div>`).join('')||'<div class="empty">Run a scenario to populate verification results.</div>';
  document.querySelectorAll('[data-run]').forEach(b=>b.addEventListener('click',()=>run(b.dataset.run)));
}
async function refresh(){
  try{
    const [st,sc]=await Promise.all([fetch('/api/state').then(r=>r.json()),fetch('/api/scenarios').then(r=>r.json())]);
    state=st; scenarios=sc.scenarios; runs=sc.runs;
    el('connection').textContent=st?'Local service connected':'Disconnected'; render();
  }catch(e){el('connection').textContent='Disconnected';console.error(e)}
}
async function run(id){
  document.body.classList.add('busy'); el('connection').textContent='Running validation';
  try{const r=await fetch('/api/scenarios/'+encodeURIComponent(id),{method:'POST'});if(!r.ok)throw new Error(`HTTP ${r.status}`);await refresh();}
  catch(e){alert('Scenario execution error: '+e.message)}
  finally{document.body.classList.remove('busy');el('connection').textContent='Local service connected'}
}
el('run-all').addEventListener('click',()=>run('all'));
async function controlAction(name,body={}){
  document.body.classList.add('busy');
  try {
    const res=await fetch('/api/'+name,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const data=await res.json();
    const panel=el('load-results');panel.hidden=false;
    if(name==='load')panel.innerHTML=`<strong>Live stress test: ${data.pass?'PASS':'FAIL'}</strong><p>${escape(data.requested)} ARC API actions with ${escape(data.concurrency)} concurrent workers · ${escape(data.requestsPerSecond)} req/sec · p50 ${escape(data.p50Ms)}ms · p95 ${escape(data.p95Ms)}ms · p99 ${escape(data.p99Ms)}ms</p><p>Expected backend executions: ${escape(data.expectedEffects)} · Observed: ${escape(data.observedEffects)} · Unexpected outcomes: ${escape(data.unexpectedOutcomes)}</p>`;
    else panel.innerHTML=`<strong>ARC Assurance: ${data.pass?'Evaluation completed':'Evaluation failed'}</strong><p>This is a genuine control assessment, not an auto-generated compliance certification. Any not_assessable, attested, and not_applicable results retain their original meanings.</p><pre>${escape(JSON.stringify(data.summary?.totals||data.error||data,null,2))}</pre>`;
    await refresh();panel.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){alert('Control operation error: '+e.message)}
  finally{document.body.classList.remove('busy')}
}
el('load').addEventListener('click',()=>controlAction('load',{count:100,concurrency:10}));
el('assurance').addEventListener('click',()=>controlAction('assurance',{}));
el('reset').addEventListener('click',async()=>{
  if(!confirm('Reset Meridian business data and scenario results? ARC audit events remain in the running session.'))return;
  const response=await fetch('/api/reset',{method:'POST'});
  if(response.ok)refresh();
});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(c=>c.classList.toggle('active',b===c));render()}));
refresh();setInterval(refresh,20000);

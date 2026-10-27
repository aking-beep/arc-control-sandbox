const el=id=>document.getElementById(id);
let scenarios=[],runs=[],phase2=[],phase2Runs=[],state={},filter='all';
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
  const mark=(label,kind)=>`<span class="status ${kind}">${escape(label)}</span>`;
  const phaseStatus=item=>{
    if(!item)return badge('NOT RUN');
    if(item.status==='pass'&&item.disposition==='limitation_reproduced')return mark('LIMIT','limitation');
    if(item.status==='pass')return mark('PASS','pass');
    if(item.status==='fail')return mark('FAIL','fail');
    if(item.status==='unsupported')return mark('UNSUPPORTED','unsupported');
    if(item.status==='not_implemented')return mark('NOT IMPLEMENTED','not_implemented');
    return badge(String(item.kind||'CATALOGUE').replaceAll('_',' ').toUpperCase());
  };
  const phaseResults=new Map(phase2Runs.map(item=>[item.id,item]));
  el('phase2-rows').innerHTML=phase2.map(item=>{
    const result=phaseResults.get(item.id);
    return `<tr><td>${escape(item.label)}</td><td class="category">${escape(item.family)}</td><td>${escape(item.kind)}</td><td>${phaseStatus(result)}</td><td>${item.kind==='implemented'?`<button class="run-one" data-phase="${escape(item.id)}">Run →</button>`:''}</td></tr>`;
  }).join('')||'<tr><td colspan="5">Phase 2 catalogue unavailable.</td></tr>';
  document.querySelectorAll('[data-phase]').forEach(b=>b.addEventListener('click',()=>runPhase(b.dataset.phase)));
}
async function refresh(){
  try{
    const [st,sc,p2]=await Promise.all([fetch('/api/state').then(r=>r.json()),fetch('/api/scenarios').then(r=>r.json()),fetch('/api/phase2').then(r=>r.json())]);
    state=st; scenarios=sc.scenarios; runs=sc.runs; phase2=p2.scenarios||[]; phase2Runs=p2.runs||[];
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
async function runPhase(id){
  document.body.classList.add('busy'); el('connection').textContent='Running phase 2';
  try{const r=await fetch('/api/phase2/'+encodeURIComponent(id),{method:'POST'});if(!r.ok)throw new Error(`HTTP ${r.status}`);await refresh();}
  catch(e){alert('Phase 2 error: '+e.message)}
  finally{document.body.classList.remove('busy');el('connection').textContent='Local service connected'}
}
el('run-phase2').addEventListener('click',()=>runPhase('all'));
async function controlAction(name,body={}){
  document.body.classList.add('busy');
  try {
    const res=await fetch('/api/'+name,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const data=await res.json();
    const panel=el('load-results');panel.hidden=false;
    if(name==='stress'){
      const lines=(data.runs||[]).map(run=>`Seed ${escape(run.seed)}: ${run.pass?'PASS':'FAIL'} · ${escape(run.requested)} requests · ${escape(run.requestsPerSecond)} req/s · p50 ${escape(run.p50Ms)} ms · p95 ${escape(run.p95Ms)} ms · p99 ${escape(run.p99Ms)} ms · effects ${escape(run.observedEffects)}/${escape(run.expectedEffects)} · unexpected outcomes ${escape(run.unexpectedOutcomes)} · other mutations ${escape(run.otherMutations)}`);
      panel.innerHTML=`<strong>Stress preset ${escape(data.preset)}: ${data.pass?'PASS':'FAIL'}</strong><p>${lines.join('</p><p>')}</p><p>Interactive runs use one seed. The phase 2 report repeats seeds 1, 2 and 3.</p>`;
    }
    else if(name==='load')panel.innerHTML=`<strong>Live stress test: ${data.pass?'PASS':'FAIL'}</strong><p>${escape(data.requested)} ARC API actions with ${escape(data.concurrency)} concurrent workers · ${escape(data.requestsPerSecond)} req/sec · p50 ${escape(data.p50Ms)}ms · p95 ${escape(data.p95Ms)}ms · p99 ${escape(data.p99Ms)}ms</p><p>Expected backend executions: ${escape(data.expectedEffects)} · Observed: ${escape(data.observedEffects)} · Unexpected outcomes: ${escape(data.unexpectedOutcomes)}</p>`;
    else panel.innerHTML=`<strong>ARC Assurance: ${data.pass?'Evaluation completed':'Evaluation failed'}</strong><p>This is a genuine control assessment, not an auto-generated compliance certification. Any not_assessable, attested, and not_applicable results retain their original meanings.</p><pre>${escape(JSON.stringify(data.summary?.totals||data.error||data,null,2))}</pre>`;
    await refresh();panel.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){alert('Control operation error: '+e.message)}
  finally{document.body.classList.remove('busy')}
}
document.querySelectorAll('[data-stress]').forEach(button=>button.addEventListener('click',()=>controlAction('stress',{preset:button.dataset.stress,seeds:[1]})));
el('assurance').addEventListener('click',()=>controlAction('assurance',{}));
el('reset').addEventListener('click',async()=>{
  if(!confirm('Reset Meridian business data and scenario results? ARC audit events remain in the running session.'))return;
  const response=await fetch('/api/reset',{method:'POST'});
  if(response.ok)refresh();
});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(c=>c.classList.toggle('active',b===c));render()}));
refresh();setInterval(refresh,20000);

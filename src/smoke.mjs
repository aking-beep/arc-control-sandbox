const base = process.env.MERIDIAN_BASE || 'http://127.0.0.1:8890';
const r = await fetch(`${base}/api/scenarios/all`, { method: 'POST' });
if (!r.ok) throw new Error(`suite runner returned HTTP ${r.status}`);
const cases = await r.json();
for (const c of cases) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.id.padEnd(22)} ${c.pass ? c.observed?.decision || c.expected : c.error}`);
console.log(`\n${cases.filter(c=>c.pass).length}/${cases.length} scenarios passed`);
if (cases.some(c=>!c.pass))process.exitCode=1;

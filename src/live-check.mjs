// Fails when live operations recorded an anomaly, or did not run.
//   npm run live:check -- --min 30 [--min-episodes 5] [--base http://127.0.0.1:8890]
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const base = arg('--base', process.env.MERIDIAN_URL || 'http://127.0.0.1:8890');
const min = Number(arg('--min', 1));
const minEpisodes = Number(arg('--min-episodes', 0));
const res = await fetch(`${base}/api/live`, { headers: process.env.LAB_AUTH ? { authorization: `Basic ${Buffer.from(process.env.LAB_AUTH).toString('base64')}` } : {} });
if (!res.ok) { console.error(`GET ${base}/api/live → HTTP ${res.status}`); process.exit(1); }
const s = await res.json();
const c = s.counts;
console.log(`Live operations day ${s.day}, seed ${s.seed}: ${c.actions} actions · ${c.executed} executed · ${c.pending_approval} held · ${c.denied} denied · ${c.refused} refused · ${c.unknown} unknown · approvals ${c.approved} released / ${c.rejected} rejected · ${c.anomalies} anomalies`);
if (s.mode === 'ai' || c.episodes) console.log(`AI agents (${s.ai?.model}): ${c.episodes ?? 0} inbox items · ${c.ai_errors ?? 0} model errors · bait declined ${c.bait_declined ?? 0}, contained by ARC ${c.bait_contained ?? 0}, allowed by policy ${c.bait_executed ?? 0}${s.ai?.reason ? ` · ${s.ai.reason}` : ''}`);
for (const a of s.anomalies) console.log(`ANOMALY  ${a.summary} — ${a.why} (correlation ${a.correlationId || '—'}, evidence ${a.evidenceId || '—'})`);
if (c.anomalies > 0) process.exit(1);
if (c.actions < min) { console.error(`only ${c.actions} live actions; expected at least ${min}`); process.exit(1); }
if ((c.episodes ?? 0) < minEpisodes) { console.error(`only ${c.episodes ?? 0} AI inbox items; expected at least ${minEpisodes}`); process.exit(1); }

import { useState } from 'react'
import { useData } from '../../api/DataProvider'
import { getApiBase, setApiBase } from '../../api/client'
import { PageHeader, Section, Button } from '../../components/ui/primitives'

export function Settings() {
  const { refresh, reset, health } = useData()
  const [base, setBase] = useState(getApiBase())
  const [site, setSite] = useState(() => { try { return localStorage.getItem('meridian.websiteUrl') ?? '' } catch { return '' } })
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <>
      <PageHeader title="Settings" description="Connection settings stored in this browser only. No credentials are entered or stored here." />
      <div className="grid max-w-4xl gap-5">
        <Section title="Meridian API base">
          <p className="mb-3 text-[12.5px] text-muted">Leave empty when Meridian serves this UI (same origin). For local development use <span className="font-mono">http://127.0.0.1:8890</span> — the server must then allow that origin.</p>
          <div className="flex gap-2">
            <input value={base} onChange={e => setBase(e.target.value)} placeholder="same origin" className="h-8 flex-1 rounded-md border border-line-strong bg-surface px-2.5 font-mono text-[12.5px] outline-none focus:border-navy" />
            <Button variant="primary" onClick={() => { setApiBase(base); refresh(); setMsg('Saved. Re-checking connection…') }}>Save</Button>
          </div>
        </Section>
        <Section title="Public website URL">
          <div className="flex gap-2">
            <input value={site} onChange={e => setSite(e.target.value)} placeholder="https://…" className="h-8 flex-1 rounded-md border border-line-strong bg-surface px-2.5 font-mono text-[12.5px] outline-none focus:border-navy" />
            <Button onClick={() => { try { localStorage.setItem('meridian.websiteUrl', site) } catch { /* */ } setMsg('Website URL saved.') }}>Save</Button>
          </div>
        </Section>
        <Section title="Reset business data">
          <p className="mb-3 text-[12.5px] text-muted">Restores Meridian fixtures and clears scenario runs (POST /api/reset). ARC audit history is intentionally preserved in the running session.</p>
          <Button variant="danger" disabled={health.status !== 'live'} onClick={async () => { if (confirm('Reset Meridian business data and scenario results? ARC audit events remain.')) { const ok = await reset(); setMsg(ok ? 'Business data reset.' : null) } }}>Reset business data</Button>
        </Section>
        {msg && <p className="text-[12.5px] text-success">{msg}</p>}
      </div>
    </>
  )
}

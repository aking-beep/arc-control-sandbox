import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Search, TriangleAlert } from 'lucide-react'
import { useData } from '../../api/DataProvider'
import { crumbsFor } from './nav'
import { useUI } from './UIContext'
import { LIMITATIONS } from '../../data/baseline'
import { LiveState } from '../lab/LiveState'

export function TopBar() {
  const { pathname } = useLocation()
  const crumbs = crumbsFor(pathname)
  const { setPaletteOpen, setLimitationsOpen, sourceFilter, setSourceFilter } = useUI()
  const { health } = useData()
  const isLab = pathname.startsWith('/lab')

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <span className={`mr-1 rounded px-1.5 py-px text-[10.5px] font-semibold ${isLab ? 'bg-navy text-mint' : 'bg-neutral-50 text-muted'}`}>{isLab ? 'LAB' : pathname.startsWith('/system') ? 'SYSTEM' : 'ENTERPRISE'}</span>
        {crumbs.map((c, i) => (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-line-strong" />}
            {c.to ? <Link to={c.to} className="truncate text-muted hover:text-ink">{c.label}</Link>
              : <span className={`truncate ${i === crumbs.length - 1 ? 'font-medium text-ink' : 'text-muted'}`}>{c.label}</span>}
          </span>
        ))}
      </nav>

      <button
        onClick={() => setPaletteOpen(true)}
        className="ml-auto flex h-8 w-52 shrink-0 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-[12.5px] text-faint transition-colors duration-150 hover:border-line-strong"
      >
        <Search className="size-3.5" />
        <span className="flex-1 truncate text-left">Search lab & enterprise</span>
        <kbd className="rounded border border-line bg-surface px-1 font-mono text-[10.5px]">⌘K</kbd>
      </button>

      <div className="flex h-8 shrink-0 items-center rounded-md border border-line p-0.5 text-[12px]" role="radiogroup" aria-label="Data source filter" title="Real only hides illustrative preview fixtures">
        {(['all', 'live'] as const).map(v => (
          <button key={v} role="radio" aria-checked={sourceFilter === v} onClick={() => setSourceFilter(v)}
            className={`h-full whitespace-nowrap rounded px-2.5 transition-colors duration-150 ${sourceFilter === v ? 'bg-navy text-white' : 'text-muted hover:text-ink'}`}>
            {v === 'all' ? 'All data' : 'Real only'}
          </button>
        ))}
      </div>

      <LiveState compact />

      <div className="flex items-center gap-3 text-[12px] text-muted">
        <Dot ok={health.status === 'live'} loading={health.status === 'loading'} label="Meridian" />
        <Dot ok={health.data?.gatewayConfigured === true} loading={health.status === 'loading'} unknown={health.status !== 'live'} label="ARC" />
      </div>

      <button onClick={() => setLimitationsOpen(true)}
        className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-warning/40 bg-warning-50 px-2.5 text-[12px] font-medium text-warning-ink transition-colors duration-150 hover:bg-warning/15">
        <TriangleAlert className="size-3.5" /> Limitations <span className="font-mono">{LIMITATIONS.length}</span>
      </button>
    </header>
  )
}

function Dot({ ok, loading, unknown, label }: { ok: boolean; loading?: boolean; unknown?: boolean; label: string }) {
  const color = loading ? 'bg-line-strong animate-pulse' : unknown ? 'bg-neutral' : ok ? 'bg-success' : 'bg-critical'
  const title = loading ? 'checking' : unknown ? 'unknown — Meridian not reachable' : ok ? 'reachable' : 'not reachable'
  return <span className="flex items-center gap-1.5 whitespace-nowrap" title={`${label}: ${title}`}><span className={`size-2 rounded-full ${color}`} />{label}</span>
}

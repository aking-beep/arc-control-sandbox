import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALL_NAV } from './nav'
import { useUI } from './UIContext'
import { ALL_CATALOG } from '../../data/catalog'
import { AGENTS, POLICIES } from '../../data/registry'
import { FINDING_DOCS } from '../../data/findingDocs'
import { useData } from '../../api/DataProvider'

interface Entry { id: string; label: string; hint: string; to: string; kind: string }

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUI()
  const { runs } = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  const entries = useMemo<Entry[]>(() => [
    ...ALL_NAV.map(n => ({ id: n.to, label: n.label, hint: n.group.label, to: n.to, kind: 'Screen', k: n.keywords })),
    ...FINDING_DOCS.map(f => ({ id: f.id, label: `${f.id} · ${f.title}`, hint: 'Finding', to: `/lab/findings/${f.id}`, kind: 'Finding' })),
    ...ALL_CATALOG.map(s => ({ id: s.id, label: `${s.id} · ${s.description}`, hint: 'Scenario', to: `/lab/scenarios?focus=${s.id}`, kind: 'Scenario' })),
    ...AGENTS.filter(a => a.registered).map(a => ({ id: a.name, label: a.name, hint: a.department, to: `/lab/agents/${a.name}`, kind: 'Agent' })),
    ...POLICIES.map(p => ({ id: p.id, label: `${p.id} · ${p.tool}`, hint: 'Policy', to: `/lab/policies?policy=${p.id}`, kind: 'Policy' })),
    ...runs.flatMap(r => {
      const ev = r.observed && 'evidenceId' in r.observed ? r.observed.evidenceId : null
      return ev ? [{ id: ev, label: ev, hint: `Evidence · ${r.id}`, to: `/lab/evidence?q=${ev}`, kind: 'Evidence' }] : []
    }),
  ], [runs])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return entries.filter(e => e.kind === 'Screen' || e.kind === 'Finding').slice(0, 12)
    return entries.filter(e => `${e.label} ${e.hint} ${(e as { k?: string }).k ?? ''}`.toLowerCase().includes(s)).slice(0, 14)
  }, [q, entries])

  useEffect(() => { setIdx(0) }, [q])
  useEffect(() => { if (!paletteOpen) setQ('') }, [paletteOpen])

  const go = (e?: Entry) => { if (!e) return; nav(e.to); setPaletteOpen(false) }

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/25 pt-[14vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}
          onClick={() => setPaletteOpen(false)}>
          <motion.div
            role="dialog" aria-label="Command search"
            className="w-[600px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_24px_60px_rgba(25,43,53,0.22)]"
            initial={{ opacity: 0, scale: 0.97, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <Search className="size-4 text-faint" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Jump to a screen, scenario id, finding, agent, policy or evidence id"
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)) }
                  if (e.key === 'Enter') go(results[idx])
                  if (e.key === 'Escape') setPaletteOpen(false)
                }}
                className="h-12 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint" />
            </div>
            <ul className="max-h-[380px] overflow-y-auto p-1.5">
              {results.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted">No matches for “{q}”.</li>}
              {results.map((r, i) => (
                <li key={`${r.kind}-${r.id}`}>
                  <button onMouseEnter={() => setIdx(i)} onClick={() => go(r)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] ${i === idx ? 'bg-canvas' : ''}`}>
                    <span className="w-16 shrink-0 text-[11px] text-faint">{r.kind}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{r.label}</span>
                    <span className="shrink-0 text-[11.5px] text-faint">{r.hint}</span>
                    {i === idx && <CornerDownLeft className="size-3.5 text-faint" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

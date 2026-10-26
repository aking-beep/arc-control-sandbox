import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type SourceFilter = 'all' | 'live'

interface UIValue {
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
  limitationsOpen: boolean
  setLimitationsOpen: (v: boolean) => void
  /** 'live' hides illustrative preview fixtures across the app. */
  sourceFilter: SourceFilter
  setSourceFilter: (v: SourceFilter) => void
}

const Ctx = createContext<UIValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [limitationsOpen, setLimitationsOpen] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(v => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return <Ctx.Provider value={{ paletteOpen, setPaletteOpen, limitationsOpen, setLimitationsOpen, sourceFilter, setSourceFilter }}>{children}</Ctx.Provider>
}

export function useUI() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useUI outside UIProvider')
  return v
}

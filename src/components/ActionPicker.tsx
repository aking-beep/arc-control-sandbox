import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { ACTIONS } from '../data/actions'

export function ActionPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = ACTIONS.find((a) => a.id === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const groups = [
    { title: 'Open failures', items: ACTIONS.filter((a) => a.recorded.verdict === 'mismatch') },
    { title: 'Integration scenarios', items: ACTIONS.filter((a) => a.source === 'integration') },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-[300px] items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-left text-[12.5px] transition-colors duration-150 hover:bg-canvas"
      >
        <span className="text-subtle">Action</span>
        <span className="flex-1 truncate font-medium text-ink">{current?.label}</span>
        <ChevronDown size={14} className="text-subtle" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-11 z-30 max-h-[480px] w-[340px] origin-top-right overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-[0_12px_32px_rgba(11,27,46,0.14)]"
          >
            {groups.map((g) => (
              <div key={g.title} className="py-1">
                <div className="px-3 py-1.5 text-[11px] font-medium text-subtle">{g.title}</div>
                {g.items.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onChange(a.id)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors duration-150 hover:bg-canvas"
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.recorded.verdict === 'mismatch' ? 'bg-fail' : 'bg-line-strong'}`} />
                    <span className="flex-1 truncate text-ink">{a.label}</span>
                    {a.id === value && <Check size={13} className="text-teal-600" />}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

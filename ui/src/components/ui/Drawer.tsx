import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

const EASE = [0.23, 1, 0.32, 1] as const

/** Right-hand inspection panel. 220ms enter, mirrored exit. */
export function Drawer({ open, onClose, title, subtitle, width = 520, children }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; width?: number; children: ReactNode }) {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog" aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex max-w-[92vw] flex-col border-l border-line bg-surface shadow-[0_0_40px_rgba(25,43,53,0.12)]"
            style={{ width }}
            initial={reduce ? { opacity: 0 } : { x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: 32, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-ink">{title}</div>
                {subtitle && <div className="mt-1 text-[12.5px] text-muted">{subtitle}</div>}
              </div>
              <button onClick={onClose} aria-label="Close panel" className="rounded p-1 text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink">
                <X className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

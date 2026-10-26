import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useReports } from '../../api/ReportsProvider'
import { Button } from '../ui/primitives'

/** Load a saved report file (report.mjs output or Phase 2 report) as a RECORDED source. */
export function ReportImport({ variant = 'secondary', label = 'Load report file' }: { variant?: 'secondary' | 'ghost'; label?: string }) {
  const { importFile } = useReports()
  const input = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const onFile = async (f?: File) => {
    if (!f) return
    const r = await importFile(f)
    setMsg(r.ok ? { ok: true, text: `Loaded ${f.name} as ${r.kind === 'integration' ? 'integration' : 'Phase 2'} report` } : { ok: false, text: r.error })
    if (input.current) input.current.value = ''
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
      <Button variant={variant} icon={<Upload className="size-3.5" />} onClick={() => input.current?.click()}
        title="reports/latest.json from npm run validate, or a Phase 2 report">{label}</Button>
      {msg && <span className={`max-w-xs text-right text-[11.5px] ${msg.ok ? 'text-teal-ink' : 'text-critical-ink'}`}>{msg.text}</span>}
    </span>
  )
}

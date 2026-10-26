import type { ReactNode } from 'react'
import { Th, Td, Empty } from '../ui/primitives'
import { useUI } from '../shell/UIContext'

export interface Col { key: string; label: string; mono?: boolean; align?: 'right' }
export type RecordRow = Record<string, ReactNode> & { __id: string; __source: 'live' | 'illustrative' }

/** Live rows first, then illustrative rows (each marked). "Real only" hides the latter. */
export function RecordTable({ cols, rows, empty }: { cols: Col[]; rows: RecordRow[]; empty?: string }) {
  const { sourceFilter } = useUI()
  const visible = rows.filter(r => sourceFilter === 'all' || r.__source === 'live')
  const live = visible.filter(r => r.__source === 'live').length
  if (visible.length === 0) return <Empty title={empty ?? 'No records'}>{sourceFilter === 'live' ? 'Illustrative rows are hidden.' : null}</Empty>
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead><tr>{cols.map(c => <Th key={c.key} className={c.align === 'right' ? 'text-right' : ''}>{c.label}</Th>)}<Th className="w-24">Source</Th></tr></thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={r.__id} className={`${r.__source === 'illustrative' ? 'text-muted' : ''} ${i === live && live > 0 ? 'border-t-2 border-t-line-strong' : ''}`}>
              {cols.map(c => <Td key={c.key} className={`${c.mono ? 'font-mono text-[11.5px]' : ''} ${c.align === 'right' ? 'tnum text-right' : ''}`}>{r[c.key]}</Td>)}
              <Td>{r.__source === 'live'
                ? <span className="font-mono text-[10px] font-semibold text-success">LIVE</span>
                : <span className="font-mono text-[10px] text-faint">ILLUSTRATIVE</span>}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

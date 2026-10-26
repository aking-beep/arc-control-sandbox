import type { ReactNode } from 'react'

export function InspectorColumn({ step, verdict, sub, tone, children }: { step: string; verdict: ReactNode; sub?: ReactNode; tone?: 'critical'; children: ReactNode }) {
  return (
    <section className={`flex w-full flex-col overflow-hidden rounded-lg border bg-surface ${tone === 'critical' ? 'border-critical/50' : 'border-line'}`}>
      <header className={`px-4 py-2 text-[11.5px] font-medium ${tone === 'critical' ? 'bg-critical text-white' : 'bg-navy text-mint'}`}>{step}</header>
      <div className="border-b border-line px-4 py-4">
        <div className="text-[22px] font-semibold leading-tight tracking-tight">{verdict}</div>
        {sub && <div className="mt-1 text-[12.5px] text-muted">{sub}</div>}
      </div>
      <dl className="flex-1 divide-y divide-line px-4">{children}</dl>
    </section>
  )
}

export function Row({ k, children, mono }: { k: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2 py-2 text-[12.5px]">
      <dt className="text-muted">{k}</dt>
      <dd className={`min-w-0 break-words text-ink ${mono ? 'font-mono text-[11.5px]' : ''}`}>{children}</dd>
    </div>
  )
}

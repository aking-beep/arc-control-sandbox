import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

export function PageHeader({ title, description, actions, meta }: { title: string; description?: ReactNode; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-3">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Section({ title, aside, children, className = '', pad = true }: { key?: string | number; title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      {(title || aside) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {aside && <div className="flex items-center gap-2">{aside}</div>}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const V: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-soft',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-canvas',
  ghost: 'text-teal-ink hover:bg-mint-50',
  danger: 'bg-surface text-critical-ink border border-line-strong hover:bg-critical-50',
}

export function Button({ variant = 'secondary', loading, icon, children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 ${V[variant]} ${className}`}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-[12px] text-ink ${className}`}>{children}</span>
}

export function Skeleton({ className = '' }: { key?: string | number; className?: string }) {
  return <span className={`block animate-pulse rounded bg-neutral-50 ${className}`} />
}

export function SkeletonRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-4 px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((__, j) => <Skeleton key={j} className="h-3" />)}
        </div>
      ))}
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function KV({ k, children, mono }: { k: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[132px_minmax(0,1fr)] gap-3 py-1.5 text-[12.5px]">
      <dt className="text-muted">{k}</dt>
      <dd className={`min-w-0 break-words text-ink ${mono ? 'font-mono text-[12px]' : ''}`}>{children}</dd>
    </div>
  )
}

export function Th({ children, className = '' }: { key?: string | number; children?: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap border-b border-line bg-canvas/60 px-3 py-2 text-left text-[11px] font-medium text-muted ${className}`}>{children}</th>
}
export function Td({ children, className = '' }: { key?: string | number; children?: ReactNode; className?: string }) {
  return <td className={`border-b border-line px-3 py-2 align-middle text-[12.5px] ${className}`}>{children}</td>
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: Array<{ id: T; label: string; count?: number }> }) {
  return (
    <div className="flex gap-1 border-b border-line" role="tablist">
      {items.map(it => (
        <button
          key={it.id}
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13px] transition-colors duration-150 ${value === it.id ? 'border-navy font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {it.label}{it.count !== undefined && <span className="ml-1.5 font-mono text-[11px] text-faint">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

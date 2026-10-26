import React from 'react'

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-6 border-b border-line bg-surface px-8 pb-5 pt-6">
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-navy-900">{title}</h1>
        {description && <p className="mt-1 max-w-[720px] text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-[13px] font-semibold text-navy-900">{children}</h2>
      {aside && <div className="text-[12px] text-subtle">{aside}</div>}
    </div>
  )
}

export function Button({
  children,
  variant = 'secondary',
  disabled,
  title,
  onClick,
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  title?: string
  onClick?: () => void
}) {
  const base =
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] [transition-property:color,background-color,border-color,transform]'
  const v =
    variant === 'primary'
      ? 'bg-navy-900 text-white hover:bg-navy-800 disabled:hover:bg-navy-900'
      : variant === 'ghost'
        ? 'text-muted hover:bg-canvas hover:text-ink'
        : 'border border-line-strong bg-surface text-ink hover:bg-canvas disabled:hover:bg-surface'
  return (
    <button type="button" className={`${base} ${v}`} disabled={disabled} title={title} onClick={onClick}>
      {children}
    </button>
  )
}

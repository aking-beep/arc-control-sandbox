import type { ReactNode } from 'react'

export function PageIntro({ title, lede, children }: { title: string; lede: string; children?: ReactNode }) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-[1200px] px-8 pb-14 pt-16">
        <h1 className="max-w-3xl text-[44px] font-semibold leading-[1.08] tracking-[-0.02em] text-navy">{title}</h1>
        <p className="mt-5 max-w-2xl text-[18px] leading-relaxed text-muted">{lede}</p>
        {children}
      </div>
    </section>
  )
}

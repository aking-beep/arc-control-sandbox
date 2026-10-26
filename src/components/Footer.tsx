import type { PageId } from '../App'

export function Footer({ go }: { go: (p: PageId) => void }) {
  const col = (title: string, items: Array<[PageId, string]>) => (
    <div>
      <div className="text-[13px] font-medium text-white">{title}</div>
      <ul className="mt-3 space-y-2">
        {items.map(([id, l]) => <li key={l}><button onClick={() => go(id)} className="text-[13px] text-white/70 transition-colors duration-150 hover:text-white">{l}</button></li>)}
      </ul>
    </div>
  )
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 px-8 py-14">
        <div>
          <div className="text-[15px] font-semibold">Meridian Commerce Group</div>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/70">A fictional B2B commerce and technology company, operated as a synthetic enterprise for validating AI agent governance software.</p>
        </div>
        {col('Company', [['about', 'About'], ['operations', 'Global Operations'], ['contact', 'Contact']])}
        {col('What we do', [['services', 'Services'], ['technology', 'Technology']])}
        {col('Governance', [['responsible-ai', 'Responsible AI']])}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1200px] justify-between px-8 py-5 text-[12px] text-white/60">
          <span>Synthetic enterprise · no real customers, certifications or endorsements</span>
          <span>Employee portal: local sandbox only</span>
        </div>
      </div>
    </footer>
  )
}

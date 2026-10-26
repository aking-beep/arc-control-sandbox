import type { PageId } from '../App'

const NAV: Array<[PageId, string]> = [
  ['about', 'About'], ['services', 'Services'], ['operations', 'Global Operations'], ['technology', 'Technology'], ['responsible-ai', 'Responsible AI'],
]

export function Header({ page, go }: { page: PageId; go: (p: PageId) => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-10 px-8">
        <button onClick={() => go('home')} className="flex items-center gap-2.5" aria-label="Meridian Commerce Group home">
          <span className="grid size-7 place-items-center rounded bg-navy text-[13px] font-semibold text-white">M</span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Meridian <span className="font-normal text-muted">Commerce Group</span></span>
        </button>
        <nav className="flex items-center gap-7 text-[14px]">
          {NAV.map(([id, label]) => (
            <button key={id} onClick={() => go(id)}
              className={`whitespace-nowrap transition-colors duration-150 ${page === id ? 'font-medium text-ink' : 'text-muted hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </nav>
        <button onClick={() => go('contact')} className="ml-auto h-9 whitespace-nowrap rounded-md bg-navy px-4 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-navy-soft">Contact us</button>
      </div>
    </header>
  )
}

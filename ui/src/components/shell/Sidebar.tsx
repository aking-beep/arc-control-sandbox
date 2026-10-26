import { NavLink } from 'react-router-dom'
import { NAV, type NavGroup } from './nav'

export function Sidebar() {
  const [enterprise, lab, system] = NAV
  return (
    <aside className="flex w-[244px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <div className="grid size-6 place-items-center rounded bg-navy font-semibold text-[12px] text-white">M</div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-ink">Meridian</div>
          <div className="text-[10.5px] text-faint">Synthetic enterprise</div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Primary">
        <Group group={enterprise} tone="light" />
        <div className="mt-2 border-t-2 border-mint bg-navy pb-2">
          <Group group={lab} tone="dark" />
        </div>
        <Group group={system} tone="light" />
      </nav>

      <div className="shrink-0 border-t border-line px-4 py-3 text-[11px] leading-snug text-faint">
        Local loopback sandbox · fictional data · no real payments
      </div>
    </aside>
  )
}

function Group({ group, tone }: { group: NavGroup; tone: 'light' | 'dark' }) {
  const dark = tone === 'dark'
  return (
    <div className="px-2 pt-3">
      <div className={`px-2 pb-1.5 text-[11px] font-medium ${dark ? 'text-mint' : 'text-faint'}`}>{group.label}</div>
      <ul className="space-y-px">
        {group.items.map(item => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/lab' || item.to === '/enterprise'}
              className={({ isActive }) => [
                'group relative flex h-[30px] items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors duration-150',
                dark
                  ? isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  : isActive ? 'bg-canvas font-medium text-ink' : 'text-muted hover:bg-canvas hover:text-ink',
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className={`absolute inset-y-1.5 left-0 w-[2px] rounded-full ${dark ? 'bg-mint' : 'bg-navy'}`} />}
                  <item.icon className={`size-[15px] shrink-0 ${dark ? '' : isActive ? 'text-navy' : 'text-faint group-hover:text-muted'}`} strokeWidth={1.75} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

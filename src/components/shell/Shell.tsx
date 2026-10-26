import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'
import { LimitationsDrawer } from './LimitationsDrawer'
import { ConnectionBanner } from '../ui/ConnectionBanner'

export function Shell() {
  const { pathname } = useLocation()
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }) }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <ConnectionBanner />
          <main className="mx-auto max-w-[1440px] px-8 pb-16 pt-6">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette />
      <LimitationsDrawer />
    </div>
  )
}

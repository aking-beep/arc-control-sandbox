import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, meridianApi } from './client'
import { useData } from './DataProvider'
import type { LiveEvent, LiveSnapshot } from './types'

/**
 * Live operations in the browser.
 *
 * One server-sent event stream (GET /api/live/stream) carries every agent
 * action, approval and inbound ticket as it happens. The snapshot is re-read
 * every 10 s for the approval queue, and as a fallback when the stream drops.
 * Business events nudge DataProvider to refresh, at most every 3 s, so the
 * department screens and the Command Center move with the day.
 */
interface LiveValue {
  snapshot?: LiveSnapshot
  /** Oldest first, at most KEEP. */
  events: LiveEvent[]
  link: 'connecting' | 'stream' | 'polling' | 'offline'
  busy: 'start' | 'pause' | 'new-day' | null
  error: string | null
  start: (opts?: { seed?: number; rate?: number }) => Promise<void>
  pause: () => Promise<void>
  newDay: (seed?: number) => Promise<void>
}

const KEEP = 300
const LiveContext = createContext<LiveValue | null>(null)

export function LiveProvider({ children }: { children: ReactNode }) {
  const { refresh } = useData()
  const [snapshot, setSnapshot] = useState<LiveSnapshot>()
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [link, setLink] = useState<LiveValue['link']>('connecting')
  const [busy, setBusy] = useState<LiveValue['busy']>(null)
  const [error, setError] = useState<string | null>(null)
  const lastRefresh = useRef(0)
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>()

  const nudge = useCallback(() => {
    const wait = Math.max(0, 3000 - (Date.now() - lastRefresh.current))
    if (refreshTimer.current) return
    refreshTimer.current = setTimeout(() => { refreshTimer.current = undefined; lastRefresh.current = Date.now(); refresh() }, wait)
  }, [refresh])

  const load = useCallback(async () => {
    try {
      const snap = await meridianApi.live()
      setSnapshot(snap)
      setEvents(prev => prev.length ? prev : snap.events.filter(e => e.kind !== 'status'))
      setError(null)
      return true
    } catch (e) {
      setLink(e instanceof ApiError && e.kind === 'unreachable' ? 'offline' : 'polling')
      return false
    }
  }, [])

  useEffect(() => {
    let source: EventSource | undefined
    if (typeof EventSource !== 'undefined') {
      source = new EventSource(meridianApi.liveStreamUrl())
      source.addEventListener('snapshot', ev => {
        const snap = JSON.parse((ev as MessageEvent).data) as LiveSnapshot
        setSnapshot(snap)
        setEvents(snap.events.filter(e => e.kind !== 'status').slice(-KEEP))
        setLink('stream')
      })
      source.onmessage = ev => {
        const e = JSON.parse(ev.data) as LiveEvent
        setLink('stream')
        setSnapshot(prev => {
          if (!prev) return prev
          const next = { ...prev, ...(e.status ?? {}), tick: e.tick, day: e.day, counts: e.counts ?? prev.counts }
          if (e.day !== prev.day) { next.anomalies = []; next.pendingApprovals = [] }
          if (e.kind === 'anomaly') next.anomalies = [...next.anomalies, e].slice(-50)
          return next
        })
        if (e.kind === 'status') return
        // A new day (from any browser, or the 24-hour rollover) starts the feed afresh.
        setEvents(prev => [...prev.filter(x => x.day === e.day), e].slice(-KEEP))
        if (e.kind === 'action' || e.kind === 'approval' || e.kind === 'inbound' || e.kind === 'anomaly') nudge()
      }
      source.onerror = () => setLink('polling')
    }
    load()
    const poll = setInterval(load, 10000)
    return () => { source?.close(); clearInterval(poll); if (refreshTimer.current) clearTimeout(refreshTimer.current) }
  }, [load, nudge])

  const run = useCallback(async (what: NonNullable<LiveValue['busy']>, call: () => Promise<LiveSnapshot>) => {
    setBusy(what)
    try {
      const snap = await call()
      setSnapshot(snap)
      if (what === 'new-day') setEvents(snap.events.filter(e => e.kind !== 'status'))
      setError(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(null) }
  }, [refresh])

  const value = useMemo<LiveValue>(() => ({
    snapshot, events, link, busy, error,
    start: opts => run('start', () => meridianApi.liveStart(opts)),
    pause: () => run('pause', () => meridianApi.livePause()),
    newDay: seed => run('new-day', () => meridianApi.liveNewDay(seed)),
  }), [snapshot, events, link, busy, error, run])

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}

export function useLiveOps() {
  const v = useContext(LiveContext)
  if (!v) throw new Error('useLiveOps must be used inside LiveProvider')
  return v
}

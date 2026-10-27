import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'

export interface Live<T> {
  data?: T
  status: 'loading' | 'live' | 'unreachable' | 'not_implemented' | 'error'
  error?: string
  fetchedAt?: string
  reload: () => Promise<void>
}

/** Fetch on mount, and again on reload(). Keeps the last good data while reloading. */
export function useLive<T>(fetcher: () => Promise<T>): Live<T> {
  const [state, setState] = useState<Omit<Live<T>, 'reload'>>({ status: 'loading' })
  const fetchRef = useRef(fetcher)
  fetchRef.current = fetcher
  const reload = useCallback(async () => {
    try {
      const data = await fetchRef.current()
      setState({ data, status: 'live', fetchedAt: new Date().toISOString() })
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('error', String(e))
      setState(prev => ({ data: prev.data, status: err.kind, error: err.message, fetchedAt: new Date().toISOString() }))
    }
  }, [])
  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}

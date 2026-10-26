import { useEffect, useState } from 'react'
import { ApiError, meridianApi } from '../../api/client'
import type { EvidenceResponse } from '../../api/types'
import { Button } from '../ui/primitives'

type Load = { state: 'idle' } | { state: 'loading' } | { state: 'done'; data: EvidenceResponse } | { state: 'error'; message: string; httpStatus?: number }

/**
 * Fetches one ARC evidence record through GET /api/arc/evidence/:id. Meridian
 * makes the ARC call with its own operator token and strips credential-like
 * keys before returning it; the browser never sees the token.
 * Reading a record is not verifying it: no integrity check happens here.
 */
export function EvidenceRecord({ id, enabled }: { id: string; enabled: boolean }) {
  const [load, setLoad] = useState<Load>({ state: 'idle' })
  useEffect(() => setLoad({ state: 'idle' }), [id])

  const fetchRecord = async () => {
    setLoad({ state: 'loading' })
    try { setLoad({ state: 'done', data: await meridianApi.evidence(id) }) }
    catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('error', String(e))
      setLoad({ state: 'error', message: err.message, httpStatus: err.httpStatus })
    }
  }

  if (load.state === 'idle' || load.state === 'loading') {
    return (
      <div className="flex items-center gap-3">
        <Button loading={load.state === 'loading'} disabled={!enabled} onClick={fetchRecord}
          title={enabled ? `GET /api/arc/evidence/${id}` : 'Meridian server or ARC gateway not reachable'}>Load ARC evidence record</Button>
        {!enabled && <span className="text-[11.5px] text-faint">Needs the running sandbox with ARC configured.</span>}
      </div>
    )
  }
  if (load.state === 'error') {
    return (
      <div className="rounded-md border border-critical/30 bg-critical-50 px-3 py-2 text-[12px]">
        <span className="font-medium text-critical-ink">{load.httpStatus === 404 ? 'ARC has no record with this id' : 'Could not load the evidence record'}</span>
        <span className="ml-2 font-mono text-ink">{load.message}</span>
        <button onClick={fetchRecord} className="ml-3 font-medium text-teal-ink hover:underline">Retry</button>
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <div className="text-[11.5px] text-muted">ARC returned HTTP {load.data.arcHttpStatus}. Credential-like fields removed by Meridian. Readable, not verified.</div>
      <pre className="max-h-80 overflow-auto rounded-md border border-line bg-canvas p-3 font-mono text-[11px] leading-relaxed text-ink">{JSON.stringify(load.data.record, null, 2)}</pre>
    </div>
  )
}

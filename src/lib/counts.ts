import { useMemo } from 'react'
import { useLab } from './LabData'

export interface Phase2Counts {
  total: number
  pass: number
  fail: number
  unsupported: number
  notImplemented: number
  notRun: number
  limitation: number
}

export function usePhase2Counts(): Phase2Counts {
  const { phase2Specs, phase2Result } = useLab()
  return useMemo(() => {
    const c: Phase2Counts = { total: phase2Specs.length, pass: 0, fail: 0, unsupported: 0, notImplemented: 0, notRun: 0, limitation: 0 }
    for (const spec of phase2Specs) {
      const r = phase2Result(spec)
      if (r.status === 'pass') {
        c.pass += 1
        if (r.limitation) c.limitation += 1
      } else if (r.status === 'fail') c.fail += 1
      else if (r.status === 'unsupported') c.unsupported += 1
      else if (r.status === 'not_implemented') c.notImplemented += 1
      else c.notRun += 1
    }
    return c
  }, [phase2Specs, phase2Result])
}

export function useIntegrationCounts() {
  const { scenarioSpecs, scenarioResult } = useLab()
  return useMemo(() => {
    let pass = 0
    let fail = 0
    let notRun = 0
    for (const s of scenarioSpecs) {
      const r = scenarioResult(s.id).status
      if (r === 'pass') pass += 1
      else if (r === 'fail') fail += 1
      else notRun += 1
    }
    return { total: scenarioSpecs.length, pass, fail, notRun }
  }, [scenarioSpecs, scenarioResult])
}

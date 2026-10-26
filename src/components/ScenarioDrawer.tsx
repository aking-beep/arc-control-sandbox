import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, ScanSearch, ShieldAlert, Play } from 'lucide-react'
import { useLab } from '../lib/LabData'
import { SCENARIO_ASSERTIONS } from '../data/scenarios'
import { PHASE2_RECORDED_NOTES } from '../data/phase2'
import { ACTIONS } from '../data/actions'
import { FINDINGS } from '../data/findings'
import { ProvenanceTag, StatusPill } from './Status'
import { phase2Expected, phase2StatusKey } from './Phase2Table'
import { Button } from './PageHeader'

export interface DrawerTarget {
  kind: 'integration' | 'phase2'
  id: string
}

const EASE = [0.23, 1, 0.32, 1] as const

export function ScenarioDrawer({ target, onClose }: { target: DrawerTarget; onClose: () => void }) {
  const lab = useLab()
  const isInt = target.kind === 'integration'
  const spec = isInt ? lab.scenarioSpecs.find((s) => s.id === target.id) : lab.phase2Specs.find((s) => s.id === target.id)
  if (!spec) return null

  const intResult = isInt ? lab.scenarioResult(spec.id) : null
  const p2Spec = !isInt ? lab.phase2Specs.find((s) => s.id === target.id)! : null
  const p2Result = p2Spec ? lab.phase2Result(p2Spec) : null
  const provenance = intResult?.provenance ?? p2Result!.provenance
  const statusKey = intResult ? intResult.status : phase2StatusKey(p2Result!.status, p2Result!.limitation)
  const observed = isInt ? intResult?.run?.observed : p2Result?.run?.observed
  const error = isInt ? intResult?.run?.error : p2Result?.run?.error
  const action = ACTIONS.find((a) => (isInt ? a.scenarioId === spec.id : a.checkId === spec.id))
  const finding = FINDINGS.find((f) => f.checkId === spec.id) ?? (spec.id === 'idempotency' ? FINDINGS[0] : undefined)
  const runnable = isInt || p2Spec?.kind === 'implemented'
  const live = lab.mode === 'live'

  return (
    <>
      <motion.div
        className="fixed inset-0 z-20 bg-navy-950/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={onClose}
      />
      <motion.aside
        className="fixed bottom-0 right-0 top-0 z-30 flex w-[460px] flex-col border-l border-line bg-surface shadow-[0_0_40px_rgba(11,27,46,0.12)]"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-medium text-subtle">{isInt ? 'Integration scenario' : 'Phase 2 check'}</span>
              <ProvenanceTag provenance={provenance} />
            </div>
            <h2 className="mt-1 text-[16px] font-semibold text-navy-900">{spec.label}</h2>
            <div className="mt-0.5 font-mono text-[11.5px] text-subtle">{spec.id}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12.5px]">
            <div>
              <dt className="text-subtle">Result</dt>
              <dd className="mt-1">
                <StatusPill status={statusKey} />
              </dd>
            </div>
            <div>
              <dt className="text-subtle">Expected</dt>
              <dd className="mt-1 font-mono text-[12px] text-ink">{isInt ? (spec as { expected: string }).expected : phase2Expected(p2Spec!)}</dd>
            </div>
            <div>
              <dt className="text-subtle">Family</dt>
              <dd className="mt-1 text-ink">{spec.family}</dd>
            </div>
            <div>
              <dt className="text-subtle">Elapsed</dt>
              <dd className="tnum mt-1 text-ink">
                {(isInt ? intResult?.run?.elapsedMs : p2Result?.run?.elapsedMs) ?? <span className="text-subtle">Not captured</span>}
                {(isInt ? intResult?.run?.elapsedMs : p2Result?.run?.elapsedMs) != null && ' ms'}
              </dd>
            </div>
          </dl>

          {isInt && (
            <section>
              <h3 className="mb-2 text-[12.5px] font-semibold text-navy-900">Assertions</h3>
              <ul className="space-y-1.5">
                {(SCENARIO_ASSERTIONS[spec.id] ?? []).map((a) => (
                  <li key={a} className="flex gap-2 text-[12.5px] leading-relaxed text-ink">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-subtle" />
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!isInt && (p2Spec?.reason || PHASE2_RECORDED_NOTES[spec.id]) && (
            <section>
              <h3 className="mb-2 text-[12.5px] font-semibold text-navy-900">{p2Spec?.reason ? 'Why it has no result' : 'Recorded observation'}</h3>
              <p className={`text-[12.5px] leading-relaxed ${p2Result?.status === 'fail' ? 'font-medium text-fail' : 'text-ink'}`}>
                {p2Spec?.reason || PHASE2_RECORDED_NOTES[spec.id]}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[12.5px] font-semibold text-navy-900">Observed payload</h3>
            {observed || error ? (
              <pre className="overflow-x-auto rounded-lg bg-navy-950 px-4 py-3 font-mono text-[11.5px] leading-relaxed text-white/85">
                {JSON.stringify(error ? { error, ...(observed ?? {}) } : observed, null, 2)}
              </pre>
            ) : (
              <div className="rounded-lg border border-dashed border-line-strong px-4 py-3 text-[12px] text-muted">
                {provenance === 'recorded'
                  ? 'Not captured in recorded report. Run against a live backend to see the decision, evidence ID and effect count.'
                  : 'No run in this session yet.'}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            {action && (
              <Link to={`/inspector/${action.id}`} className="inline-flex items-center gap-2 text-[12.5px] font-medium text-teal-700 hover:text-teal-600">
                <ScanSearch size={14} /> Inspect request → decision → effect
              </Link>
            )}
            {finding && (
              <Link to={`/findings/${finding.id}`} className="inline-flex items-center gap-2 text-[12.5px] font-medium text-fail hover:opacity-80">
                <ShieldAlert size={14} /> Related finding {finding.code}
              </Link>
            )}
          </section>
        </div>

        {runnable && (
          <div className="flex items-center justify-between border-t border-line px-6 py-3">
            <span className="text-[11.5px] text-subtle">{live ? `POST /api/${isInt ? 'scenarios' : 'phase2'}/${spec.id}` : 'Requires npm start'}</span>
            <Button variant="primary" disabled={!live} onClick={() => (isInt ? lab.runScenario(spec.id) : lab.runPhase2(spec.id))}>
              <Play size={12} /> Run
            </Button>
          </div>
        )}
      </motion.aside>
    </>
  )
}

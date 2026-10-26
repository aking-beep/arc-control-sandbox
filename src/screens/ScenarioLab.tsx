import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, RotateCcw, Search, Loader2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useLab } from '../lib/LabData'
import { PageHeader, Button } from '../components/PageHeader'
import { IntegrationTable } from '../components/IntegrationTable'
import { Phase2Table } from '../components/Phase2Table'
import { StressPanel } from '../components/StressPanel'
import { ScenarioDrawer, type DrawerTarget } from '../components/ScenarioDrawer'
import { useIntegrationCounts, usePhase2Counts } from '../lib/counts'

type Tab = 'integration' | 'phase2' | 'stress'

const RESULT_FILTERS: Record<Exclude<Tab, 'stress'>, { id: string; label: string }[]> = {
  integration: [
    { id: 'all', label: 'All' },
    { id: 'pass', label: 'Pass' },
    { id: 'fail', label: 'Fail' },
    { id: 'not_run', label: 'Not run' },
  ],
  phase2: [
    { id: 'all', label: 'All' },
    { id: 'fail', label: 'Fail' },
    { id: 'pass', label: 'Pass' },
    { id: 'limitation', label: 'Limitation' },
    { id: 'unsupported', label: 'Unsupported' },
    { id: 'not_implemented', label: 'Not implemented' },
  ],
}

export function ScenarioLab() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'integration'
  const q = params.get('q') || ''
  const result = params.get('result') || 'all'
  const family = params.get('family') || 'all'
  const track = params.get('track') || 'all'
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null)
  const lab = useLab()
  const integ = useIntegrationCounts()
  const p2 = usePhase2Counts()
  const live = lab.mode === 'live'

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all') next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const families = useMemo(() => {
    const list = tab === 'phase2' ? lab.phase2Specs : lab.scenarioSpecs
    return Array.from(new Set(list.map((s) => s.family))).sort()
  }, [tab, lab.phase2Specs, lab.scenarioSpecs])

  const visibleIntegration = useMemo(
    () =>
      lab.scenarioSpecs.filter((s) => {
        if (family !== 'all' && s.family !== family) return false
        if (q && !`${s.id} ${s.label}`.toLowerCase().includes(q.toLowerCase())) return false
        if (result !== 'all' && lab.scenarioResult(s.id).status !== result) return false
        return true
      }),
    [lab, family, q, result],
  )

  const visiblePhase2 = useMemo(
    () =>
      lab.phase2Specs.filter((s) => {
        if (family !== 'all' && s.family !== family) return false
        if (track !== 'all' && s.track !== track) return false
        if (q && !`${s.id} ${s.label}`.toLowerCase().includes(q.toLowerCase())) return false
        const r = lab.phase2Result(s)
        if (result === 'limitation') return r.status === 'pass' && r.limitation
        if (result === 'pass') return r.status === 'pass' && !r.limitation
        if (result !== 'all' && r.status !== result) return false
        return true
      }),
    [lab, family, track, q, result],
  )

  const busy = lab.running.size > 0
  const runFiltered = async () => {
    if (tab === 'integration') for (const s of visibleIntegration) await lab.runScenario(s.id)
    if (tab === 'phase2') for (const s of visiblePhase2.filter((x) => x.kind === 'implemented')) await lab.runPhase2(s.id)
  }
  const visibleCount = tab === 'integration' ? visibleIntegration.length : visiblePhase2.length
  const disabledReason = live ? undefined : 'Requires a running Meridian backend (npm start)'

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Scenario Lab"
        description="The original 17 integration scenarios and the separate 39-check Phase 2 catalogue. Each result asserts ARC’s decision and Meridian’s observed backend effect, not a displayed status."
        actions={
          <>
            <Button
              variant="ghost"
              disabled={!live || busy}
              title={disabledReason}
              onClick={() => {
                if (window.confirm('Reset Meridian business data and scenario results? ARC audit history is preserved.')) lab.resetBusiness()
              }}
            >
              <RotateCcw size={13} /> Reset business data
            </Button>
          </>
        }
      />

      <div className="border-b border-line bg-surface px-8">
        <div className="flex items-center gap-6">
          {(
            [
              { id: 'integration', label: 'Integration', count: `${integ.pass}/${integ.total}` },
              { id: 'phase2', label: 'Phase 2', count: `${p2.fail} fail` },
              { id: 'stress', label: 'Stress', count: '9 recorded' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set({ tab: t.id === 'integration' ? null : t.id, result: null, family: null, track: null, q: null })}
              className={`-mb-px flex items-center gap-2 border-b-2 py-3 text-[13px] font-medium transition-colors duration-150 ${
                tab === t.id ? 'border-navy-900 text-navy-900' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
              <span className={`tnum rounded px-1.5 text-[11px] leading-[18px] ${t.id === 'phase2' && p2.fail ? 'bg-fail-bg text-fail' : 'bg-canvas text-subtle'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'stress' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StressPanel />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-8 py-2.5">
            <label className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                value={q}
                onChange={(e) => set({ q: e.target.value })}
                placeholder="Filter by id or name"
                className="h-8 w-[220px] rounded-md border border-line-strong bg-surface pl-8 pr-2 text-[12.5px] outline-none transition-colors duration-150 placeholder:text-subtle focus:border-teal-600"
              />
            </label>
            <div className="flex rounded-md border border-line-strong p-0.5">
              {RESULT_FILTERS[tab].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => set({ result: r.id })}
                  className={`whitespace-nowrap rounded px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ${
                    result === r.id ? 'bg-navy-900 text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <select
              value={family}
              onChange={(e) => set({ family: e.target.value })}
              className="h-8 rounded-md border border-line-strong bg-surface px-2 text-[12.5px] text-ink outline-none focus:border-teal-600"
            >
              <option value="all">All families</option>
              {families.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {tab === 'phase2' && (
              <select
                value={track}
                onChange={(e) => set({ track: e.target.value })}
                className="h-8 rounded-md border border-line-strong bg-surface px-2 text-[12.5px] text-ink outline-none focus:border-teal-600"
              >
                <option value="all">All tracks</option>
                <option value="security">security</option>
                <option value="reliability">reliability</option>
                <option value="evidence">evidence</option>
              </select>
            )}
            <span className="tnum text-[12px] text-subtle">{visibleCount} shown</span>
            <div className="ml-auto flex items-center gap-2">
              <Button disabled={!live || busy || visibleCount === 0} title={disabledReason} onClick={runFiltered}>
                <Play size={12} /> Run filtered
              </Button>
              <Button
                variant="primary"
                disabled={!live || busy}
                title={disabledReason}
                onClick={() => (tab === 'integration' ? lab.runScenario('all') : lab.runPhase2('all'))}
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Run all {tab === 'integration' ? '17' : 'Phase 2'}
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'integration' ? (
              <IntegrationTable specs={visibleIntegration} selected={drawer?.id} onSelect={(id) => setDrawer({ kind: 'integration', id })} />
            ) : (
              <Phase2Table specs={visiblePhase2} selected={drawer?.id} onSelect={(id) => setDrawer({ kind: 'phase2', id })} />
            )}
          </div>
        </>
      )}

      <AnimatePresence>{drawer && <ScenarioDrawer target={drawer} onClose={() => setDrawer(null)} />}</AnimatePresence>
    </div>
  )
}

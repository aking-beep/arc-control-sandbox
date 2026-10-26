import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ShieldAlert, FlaskConical } from 'lucide-react'
import { ACTIONS } from '../data/actions'
import { FINDINGS } from '../data/findings'
import { useLab } from '../lib/LabData'
import { PageHeader } from '../components/PageHeader'
import { ProvenanceTag } from '../components/Status'
import { ActionPicker } from '../components/ActionPicker'
import { RequestColumn, DecisionColumn, EffectColumn } from '../components/InspectorColumns'

export function ActionInspector() {
  const { actionId } = useParams()
  const navigate = useNavigate()
  const lab = useLab()
  const action = ACTIONS.find((a) => a.id === actionId) ?? ACTIONS[0]
  const finding = action.findingId ? FINDINGS.find((f) => f.id === action.findingId) : undefined

  const liveRun =
    lab.mode === 'live'
      ? action.scenarioId
        ? lab.scenarioResult(action.scenarioId)
        : action.checkId
          ? lab.phase2Result(lab.phase2Specs.find((s) => s.id === action.checkId)!)
          : null
      : null
  const provenance = lab.mode === 'live' && liveRun?.run ? 'live' : 'recorded'
  const liveFailed = liveRun?.status === 'fail'
  const mismatch = provenance === 'live' ? liveFailed : action.recorded.verdict === 'mismatch'

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Action Inspector"
        description="Follow one action from the agent’s request, through ARC Control’s authorization decision, to the effect Meridian actually recorded in its mutation log."
        actions={<ActionPicker value={action.id} onChange={(id) => navigate(`/inspector/${id}`)} />}
      />

      <div className="flex items-center gap-3 border-b border-line bg-surface px-8 py-3">
        <h2 className="text-[15px] font-semibold text-navy-900">{action.label}</h2>
        <span className="font-mono text-[11.5px] text-subtle">{action.scenarioId ?? action.checkId}</span>
        <ProvenanceTag provenance={provenance} />
        <div className="ml-auto flex items-center gap-4">
          {finding && (
            <Link to={`/findings/${finding.id}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fail hover:opacity-80">
              <ShieldAlert size={13} /> {finding.code}
            </Link>
          )}
          <Link
            to={action.source === 'integration' ? `/scenarios?q=${action.scenarioId}` : `/scenarios?tab=phase2&q=${action.checkId}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-teal-700 hover:text-teal-600"
          >
            <FlaskConical size={13} /> Source {action.source === 'integration' ? 'scenario' : 'check'}
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        {mismatch ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-fail-line bg-fail-bg px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-fail" />
            <div>
              <div className="text-[13px] font-semibold text-fail">Authorization and effect disagree</div>
              <div className="mt-0.5 text-[12.5px] text-fail/90">{provenance === 'live' ? liveRun?.note : action.recorded.summary}</div>
            </div>
          </div>
        ) : (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-pass" />
            <div className="text-[12.5px] text-muted">
              <span className="font-semibold text-ink">Decision and effect agree.</span>{' '}
              {provenance === 'live' ? 'Latest live run held every assertion.' : action.recorded.summary}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line bg-surface">
          <RequestColumn action={action} />
          <DecisionColumn action={action} run={liveRun} />
          <EffectColumn action={action} run={liveRun} mismatch={!!mismatch} />
        </div>
      </div>
    </div>
  )
}

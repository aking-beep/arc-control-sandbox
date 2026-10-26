import React from 'react'
import { Bot, Scale, Database } from 'lucide-react'
import type { ActionTrace } from '../data/actions'
import type { Phase2Result, ScenarioResult } from '../lib/LabData'
import { DecisionChip, StatusPill } from './Status'
import { phase2StatusKey } from './Phase2Table'

type Run = ScenarioResult | Phase2Result | null

export function RequestColumn({ action }: { action: ActionTrace }) {
  const r = action.request
  return (
    <Column step={1} title="Agent request" icon={<Bot size={14} />}>
      <Field label="Agent">
        <span className="font-mono text-[12.5px] font-medium text-ink">{r.agent}</span>
      </Field>
      <Field label="Channel">
        <span className="font-mono text-[12px] text-ink">{r.channel}</span>
      </Field>
      <Field label="Tool">
        <span className="font-mono text-[12px] text-ink">{r.tool}</span>
      </Field>
      {r.parallel && (
        <Field label="Concurrency">
          <span className="tnum text-[12.5px] font-medium text-ink">{r.parallel} parallel requests</span>
        </Field>
      )}
      <Field label="Parameters">
        <pre className="overflow-x-auto rounded-md bg-navy-950 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-white/85">
          {JSON.stringify({ ...r.parameters, ...(r.extras ?? {}) }, null, 2)}
        </pre>
      </Field>
      {r.precondition && (
        <Field label="Precondition">
          <p className="text-[12.5px] leading-relaxed text-muted">{r.precondition}</p>
        </Field>
      )}
      <p className="mt-auto pt-2 text-[11px] text-subtle">Agent keys stay server-side; the browser never holds them.</p>
    </Column>
  )
}

export function DecisionColumn({ action, run }: { action: ActionTrace; run: Run }) {
  const d = action.decision
  const obs = run && 'run' in run ? (run.run as { observed?: Record<string, unknown> } | undefined)?.observed : undefined
  const evidenceId = obs?.evidenceId as string | undefined
  return (
    <Column step={2} title="ARC Control decision" icon={<Scale size={14} />} bordered>
      <Field label={run?.provenance === 'live' && obs?.decision ? 'Decision (live)' : 'Decision'}>
        <DecisionChip effect={(obs?.decision as typeof d.effect) || d.effect} size="lg" />
      </Field>
      {d.policyId && (
        <Field label="Policy · rule">
          <span className="font-mono text-[12px] text-ink">
            {d.policyId}
            {d.ruleId && <span className="text-subtle"> / {d.ruleId}</span>}
          </span>
        </Field>
      )}
      <Field label="Reason">
        <p className="text-[12.5px] leading-relaxed text-ink">{d.reason}</p>
      </Field>
      <Field label="Response">
        <span className="font-mono text-[12px] text-ink">{d.http}</span>
      </Field>
      {d.chain && (
        <Field label="Sequence">
          <ol className="space-y-1.5 border-l border-line-strong pl-3">
            {d.chain.map((c) => (
              <li key={c} className={`text-[12px] leading-snug ${c.includes('✗') ? 'font-medium text-fail' : 'text-muted'}`}>
                {c}
              </li>
            ))}
          </ol>
        </Field>
      )}
      <Field label="Evidence">
        {evidenceId ? (
          <span className="break-all font-mono text-[11.5px] text-ink">
            {evidenceId} {obs?.evidencePresent ? <span className="text-pass">· readable</span> : null}
          </span>
        ) : (
          <span className="text-[12px] text-subtle">Not captured in recorded report</span>
        )}
      </Field>
    </Column>
  )
}

export function EffectColumn({ action, run, mismatch }: { action: ActionTrace; run: Run; mismatch: boolean }) {
  const e = action.effect
  const live = run?.provenance === 'live' && run.status !== 'not_run'
  const statusKey = run ? ('limitation' in run ? phase2StatusKey(run.status, run.limitation) : run.status) : null
  return (
    <Column step={3} title="Meridian backend effect" icon={<Database size={14} />} bordered>
      <Field label="Measured on">
        <span className="font-mono text-[12px] text-ink">{e.target}</span>
      </Field>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line">
        <div className="bg-surface px-3 py-3">
          <div className="text-[11px] text-subtle">Expected</div>
          <div className="tnum mt-0.5 font-mono text-[26px] font-medium leading-none text-ink">{e.expected}</div>
        </div>
        <div className={`px-3 py-3 ${mismatch ? 'bg-fail-bg' : 'bg-surface'}`}>
          <div className={`text-[11px] ${mismatch ? 'text-fail' : 'text-subtle'}`}>Observed</div>
          {e.observed != null ? (
            <div className={`tnum mt-0.5 font-mono text-[26px] font-semibold leading-none ${mismatch ? 'text-fail' : 'text-ink'}`}>{e.observed}</div>
          ) : (
            <div className="mt-1 text-[12px] leading-snug text-muted">Count held by assertion; value not recorded</div>
          )}
        </div>
      </div>

      {action.request.parallel && e.observed != null && (
        <Field label="Effects per parallel request">
          <div className="flex gap-1">
            {Array.from({ length: action.request.parallel }).map((_, i) => {
              const wrote = i < (e.observed ?? 0)
              const extra = wrote && i >= e.expected
              return (
                <div
                  key={i}
                  className={`h-7 flex-1 rounded-sm ${extra ? 'bg-fail' : wrote ? 'bg-navy-700' : 'bg-canvas ring-1 ring-line'}`}
                  title={extra ? `Duplicate refund #${i + 1}` : wrote ? 'Refund written' : 'No effect'}
                />
              )
            })}
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-subtle">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-navy-700" /> intended
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-fail" /> duplicate
            </span>
          </div>
        </Field>
      )}

      <Field label="Detail">
        <p className="text-[12.5px] leading-relaxed text-ink">{e.detail}</p>
      </Field>

      {live && statusKey && (
        <Field label="Latest live run">
          <div className="flex flex-col gap-1.5">
            <StatusPill status={statusKey} />
            {run?.note && <span className="font-mono text-[11px] text-muted">{run.note}</span>}
          </div>
        </Field>
      )}
    </Column>
  )
}

function Column({ step, title, icon, bordered, children }: { step: number; title: string; icon: React.ReactNode; bordered?: boolean; children: React.ReactNode }) {
  return (
    <section className={`flex min-w-0 flex-col ${bordered ? 'border-l border-line' : ''}`}>
      <header className="flex items-center gap-2 border-b border-line bg-canvas px-5 py-2.5">
        <span className="tnum grid h-5 w-5 place-items-center rounded-full bg-navy-900 text-[10.5px] font-semibold text-white">{step}</span>
        <span className="text-muted">{icon}</span>
        <h3 className="text-[12.5px] font-semibold text-navy-900">{title}</h3>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-subtle">{label}</div>
      {children}
    </div>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { Play, ScanSearch, Loader2, Check } from 'lucide-react'
import type { Finding } from '../data/findings'
import { STAGES } from '../data/findings'
import { PHASE2_CATALOGUE } from '../data/phase2'
import { useLab } from '../lib/LabData'
import { Button } from './PageHeader'
import { ProvenanceTag, SeverityTag, StatusPill } from './Status'

export function FindingDetail({ finding: f }: { finding: Finding }) {
  const { mode, runPhase2, running, phase2Result } = useLab()
  const spec = PHASE2_CATALOGUE.find((s) => s.id === f.checkId)
  const result = spec ? phase2Result(spec) : null
  const isRunning = running.has(`p:${f.checkId}`)
  const stageIndex = STAGES.findIndex((s) => s.id === f.remediation.stage)
  const isFailure = f.kind === 'failure'

  return (
    <article className="max-w-[880px] px-8 py-7">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[12px] text-subtle">{f.code}</span>
        <SeverityTag severity={f.severity} />
        <span className={`text-[12px] font-medium ${isFailure ? 'text-fail' : 'text-warn'}`}>{f.status}</span>
      </div>
      <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.01em] text-navy-900">{f.title}</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{f.summary}</p>

      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="primary"
          disabled={mode !== 'live' || isRunning}
          title={mode !== 'live' ? 'Requires a running Meridian backend (npm start)' : undefined}
          onClick={() => runPhase2(f.checkId)}
        >
          {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          Run check
        </Button>
        {f.actionId && (
          <Link
            to={`/inspector/${f.actionId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-canvas"
          >
            <ScanSearch size={13} /> Inspect action
          </Link>
        )}
        <Link to={`/scenarios?tab=phase2&q=${f.checkId}`} className="px-2 text-[12.5px] font-medium text-teal-700 hover:text-teal-600">
          View in Scenario Lab
        </Link>
        {mode !== 'live' && <span className="ml-auto text-[11.5px] text-subtle">Run requires npm start</span>}
      </div>

      {f.note && <div className="mt-4 rounded-md border border-warn/25 bg-warn-bg px-3 py-2 text-[12.5px] text-warn">{f.note}</div>}

      {/* Expected vs observed */}
      <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface">
        <div className="px-5 py-4">
          <div className="text-[11.5px] font-medium text-subtle">Expected</div>
          <div className="mt-1 text-[15px] font-medium text-ink">{f.expected}</div>
        </div>
        <div className={`border-l px-5 py-4 ${isFailure ? 'border-fail-line bg-fail-bg' : 'border-line'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11.5px] font-medium ${isFailure ? 'text-fail' : 'text-subtle'}`}>Observed</span>
            {result && <ProvenanceTag provenance={result.provenance} />}
          </div>
          <div className={`mt-1 text-[15px] font-semibold ${isFailure ? 'text-fail' : 'text-ink'}`}>{f.observed}</div>
          {result?.provenance === 'live' && (
            <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
              Latest live run:{' '}
              <StatusPill status={result.status === 'pass' && result.limitation ? 'limitation' : (result.status as 'pass')} />
              {result.note && <span className="truncate font-mono text-[11px]">{result.note}</span>}
            </div>
          )}
        </div>
      </div>

      <Section title="Root cause">
        <p className="text-[13.5px] leading-relaxed text-ink">{renderCode(f.rootCause)}</p>
        <div className="mt-1.5 font-mono text-[11.5px] text-subtle">{f.component}</div>
      </Section>

      <Section title="Reproduction">
        <ol className="space-y-2.5">
          {f.steps.map((s, i) => (
            <li key={i} className="grid grid-cols-[24px_1fr] gap-2 text-[13px] leading-relaxed text-ink">
              <span className="tnum grid h-5 w-5 place-items-center rounded-full bg-canvas text-[11px] font-semibold text-muted ring-1 ring-line">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Evidence">
        <dl className="divide-y divide-line rounded-lg border border-line bg-surface">
          {f.evidence.map((e) => (
            <div key={e.label} className="grid grid-cols-[200px_1fr] gap-4 px-4 py-2 text-[12.5px]">
              <dt className="text-subtle">{e.label}</dt>
              <dd className={e.mono ? 'font-mono text-[12px] text-ink' : 'text-ink'}>{e.value}</dd>
            </div>
          ))}
        </dl>
        {f.assertion && (
          <div className="mt-3 overflow-x-auto rounded-lg bg-navy-950 px-4 py-3 font-mono text-[12px] leading-relaxed text-white/85">
            <div className="mb-1 text-[10.5px] text-white/40">Assertion · kept as written</div>
            {f.assertion}
          </div>
        )}
      </Section>

      <Section title="Remediation">
        <ol className="grid grid-cols-4 gap-0">
          {STAGES.map((s, i) => {
            const done = i <= stageIndex
            return (
              <li key={s.id} className="relative pr-3">
                <div className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? 'bg-navy-900 text-white' : 'bg-surface ring-1 ring-line-strong'}`}>
                    {done && <Check size={11} strokeWidth={2.5} />}
                  </span>
                  <span className={`h-px flex-1 ${i < STAGES.length - 1 ? 'bg-line-strong' : 'bg-transparent'}`} />
                </div>
                <div className={`mt-2 text-[12px] font-medium ${done ? 'text-ink' : 'text-subtle'}`}>{s.label}</div>
              </li>
            )
          })}
        </ol>
        <p className="mt-4 text-[13px] leading-relaxed text-ink">{f.remediation.proposal}</p>
        <div className="mt-1 text-[11.5px] text-subtle">{f.remediation.improvementRef} · docs/PHASE_2_READINESS.md</div>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h3 className="mb-3 text-[13px] font-semibold text-navy-900">{title}</h3>
      {children}
    </section>
  )
}

function renderCode(text: string) {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith('`') ? (
      <code key={i} className="rounded bg-canvas px-1 py-0.5 font-mono text-[12px] text-navy-800 ring-1 ring-line">
        {part.slice(1, -1)}
      </code>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  )
}

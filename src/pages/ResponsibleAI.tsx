import { PageIntro } from '../components/PageIntro'

const PRINCIPLES = [
  ['Narrow authority', 'Each agent may request one kind of action. A finance agent cannot deploy code; an IT agent cannot issue refunds.'],
  ['Thresholds, not trust', 'Small refunds proceed automatically, mid-sized ones wait for a finance manager, and large ones are refused outright.'],
  ['Humans for sensitive data', 'Customer exports, salary records and system quarantines always require human approval.'],
  ['Effects are checked, not assumed', 'A decision to deny is only meaningful if nothing changed. We verify the business record, not just the decision.'],
]

const KNOWN = [
  'An independent test found that eight simultaneous duplicate refund requests produced eight refunds instead of one.',
  'An independent test found that a refund approved under one policy still executed after a stricter policy took effect.',
  'Approver identity is currently asserted by request headers, not by an authenticated sign-in.',
  'Audit records are checked internally but are not anchored outside the system.',
  'Network isolation, tenant isolation and enterprise sign-in are not yet in place.',
]

export function ResponsibleAI() {
  return (
    <>
      <PageIntro title="Responsible AI" lede="AI agents take actions. An authorization layer governs those actions. Our systems record what actually happened. An independent lab checks whether the controls worked." />
      <section className="mx-auto max-w-[1200px] px-8 py-20">
        <div className="grid grid-cols-2 gap-x-14">
          {PRINCIPLES.map(([t, b]) => (
            <div key={t} className="border-t border-line py-7">
              <h2 className="text-[19px] font-semibold text-navy">{t}</h2>
              <p className="mt-2 text-[16px] leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[1fr_1.6fr] gap-14 px-8 py-20">
          <div>
            <h2 className="text-[28px] font-semibold leading-tight tracking-tight text-navy">What testing has found</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">We publish known failures and limitations rather than a readiness score. These were open at the time of the most recent reported test round.</p>
          </div>
          <ul className="divide-y divide-line-strong border-y border-line-strong">
            {KNOWN.map((k, i) => (
              <li key={k} className="grid grid-cols-[40px_1fr] gap-3 py-4 text-[15px] leading-relaxed text-ink">
                <span className={`font-mono text-[13px] ${i < 2 ? 'text-critical-ink' : 'text-faint'}`}>{i < 2 ? 'FAIL' : '—'}</span>{k}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="mx-auto max-w-[1200px] px-8 py-14">
        <p className="max-w-3xl text-[14px] leading-relaxed text-muted">Meridian does not claim certification against any framework. Mapping a control to a framework is not the same as being certified against it.</p>
      </section>
    </>
  )
}

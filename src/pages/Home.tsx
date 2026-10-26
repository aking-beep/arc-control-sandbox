import { ArrowRight } from 'lucide-react'
import type { PageId } from '../App'
import { IMG, SERVICES, HUBS } from '../data/content'

export function Home({ go }: { go: (p: PageId) => void }) {
  return (
    <>
      <section className="mx-auto grid max-w-[1200px] grid-cols-[1fr_1.05fr] items-center gap-14 px-8 pb-20 pt-16">
        <div>
          <h1 className="text-[52px] font-semibold leading-[1.05] tracking-[-0.025em] text-navy">Commerce operations for businesses that sell to businesses.</h1>
          <p className="mt-6 max-w-[34rem] text-[18px] leading-relaxed text-muted">Meridian runs order-to-cash, fulfilment and customer operations for B2B sellers across four regions — with software, people and AI agents working under defined controls.</p>
          <div className="mt-9 flex gap-3">
            <button onClick={() => go('services')} className="inline-flex h-11 items-center gap-2 rounded-md bg-navy px-5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-navy-soft">Our services <ArrowRight className="size-4" /></button>
            <button onClick={() => go('responsible-ai')} className="h-11 rounded-md border border-line-strong px-5 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-canvas">How we govern AI</button>
          </div>
        </div>
        <img src={IMG.hero} alt="Two Meridian operations staff reviewing an order on a tablet in a distribution centre" className="aspect-[4/3] w-full rounded-lg object-cover" />
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-[1200px] px-8 py-20">
          <div className="grid grid-cols-[1fr_2fr] gap-14">
            <h2 className="text-[30px] font-semibold leading-tight tracking-tight text-navy">What we do</h2>
            <div className="grid grid-cols-2 gap-x-12">
              {SERVICES.map(s => (
                <div key={s.name} className="border-t border-line py-6">
                  <h3 className="text-[17px] font-semibold text-ink">{s.name}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <img src={IMG.port} alt="Container terminal at dusk" className="h-[440px] w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-navy-deep/85">
          <div className="mx-auto grid max-w-[1200px] grid-cols-[1.2fr_repeat(4,1fr)] gap-8 px-8 py-8 text-white">
            <div>
              <div className="text-[13px] text-mint">Global operations</div>
              <p className="mt-1 text-[15px] leading-snug">Four hubs, one operating model. Approximately 250 people (fictional).</p>
            </div>
            {HUBS.map(h => (
              <div key={h.city} className="border-l border-white/15 pl-5">
                <div className="text-[17px] font-semibold">{h.city}</div>
                <div className="mt-1 text-[13px] leading-snug text-white/70">{h.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] grid-cols-[0.9fr_1.1fr] items-center gap-16 px-8 py-24">
        <img src={IMG.engineer} alt="An operations engineer monitoring systems" className="aspect-[4/5] w-full rounded-lg object-cover" />
        <div>
          <h2 className="text-[34px] font-semibold leading-tight tracking-tight text-navy">AI agents do real work here. Every action they take is governed and recorded.</h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">Refunds, ticket updates, deployments and data exports can be requested by AI agents. An independent authorization layer decides whether each one may proceed, holds sensitive ones for a human, and blocks the rest. Our own systems record what actually changed.</p>
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {[['Agents request', 'Each agent has an identity, an owner and a narrow set of tools.'], ['Policy decides', 'Allow, deny or require approval — before anything executes.'], ['Systems record', 'Business effects are logged independently of the decision.']].map(([t, b], i) => (
              <li key={t} className="grid grid-cols-[32px_180px_1fr] items-baseline gap-4 py-4">
                <span className="font-mono text-[13px] text-teal">{i + 1}</span>
                <span className="text-[15px] font-semibold text-ink">{t}</span>
                <span className="text-[15px] text-muted">{b}</span>
              </li>
            ))}
          </ol>
          <button onClick={() => go('responsible-ai')} className="mt-7 inline-flex items-center gap-1.5 text-[15px] font-medium text-teal-ink hover:underline">Read our Responsible AI approach <ArrowRight className="size-4" /></button>
        </div>
      </section>

      <section className="bg-canvas">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-10 px-8 py-16">
          <h2 className="max-w-xl text-[28px] font-semibold leading-tight tracking-tight text-navy">Talk to us about B2B commerce operations.</h2>
          <button onClick={() => go('contact')} className="h-11 rounded-md bg-navy px-5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-navy-soft">Contact Meridian</button>
        </div>
      </section>
    </>
  )
}

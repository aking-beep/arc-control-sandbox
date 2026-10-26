import type { PageId } from '../App'
import { PageIntro } from '../components/PageIntro'
import { IMG } from '../data/content'

const LAYERS = [
  ['AI agents', 'Six department agents — finance, support, IT, sales, HR and security — each with one registered tool.'],
  ['Authorization layer', 'ARC Control evaluates every agent request against policy: allow, deny, or hold for human approval.'],
  ['Business systems', 'Meridian’s own services apply changes only when called through the authorized connector.'],
  ['Independent record', 'A mutation log records what actually changed, separately from the authorization decision.'],
]

export function Technology({ go }: { go: (p: PageId) => void }) {
  return (
    <>
      <PageIntro title="Technology" lede="Meridian’s systems are deliberately simple and observable, so that every change can be traced back to who asked for it and who allowed it." />
      <section className="mx-auto grid max-w-[1200px] grid-cols-[1.2fr_0.8fr] gap-16 px-8 py-20">
        <ol className="border-t border-line">
          {LAYERS.map(([t, b], i) => (
            <li key={t} className="grid grid-cols-[48px_220px_1fr] items-baseline gap-4 border-b border-line py-6">
              <span className="font-mono text-[13px] text-teal">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[17px] font-semibold text-ink">{t}</span>
              <span className="text-[15px] leading-relaxed text-muted">{b}</span>
            </li>
          ))}
        </ol>
        <div>
          <img src={IMG.engineer} alt="Engineer at a workstation" className="aspect-[4/5] w-full rounded-lg object-cover" />
          <p className="mt-4 text-[14px] leading-relaxed text-muted">The numbered layers are sequential: a request passes through each in order. The environment is a local test sandbox, not production infrastructure. <button onClick={() => go('responsible-ai')} className="font-medium text-teal-ink hover:underline">Limitations are published.</button></p>
        </div>
      </section>
    </>
  )
}

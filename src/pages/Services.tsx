import type { PageId } from '../App'
import { PageIntro } from '../components/PageIntro'
import { IMG, SERVICES } from '../data/content'

const DETAIL: Record<string, string[]> = {
  'Order-to-cash operations': ['Order capture and validation', 'Invoicing and statements', 'Refunds within defined authority limits', 'Collections and dispute handling'],
  'Fulfilment and logistics': ['Regional warehousing', 'Carrier selection and tracking', 'Short-shipment and damage claims', 'Cold-chain exception handling'],
  'Customer operations': ['Tiered service desks', 'Escalation to named account managers', 'Quarterly account reviews', 'Customer data requests'],
  'Commerce technology': ['Order and catalog APIs', 'Procurement system integration', 'Environment-separated deployments', 'Change and access review'],
}

export function Services({ go }: { go: (p: PageId) => void }) {
  return (
    <>
      <PageIntro title="Services" lede="Four service lines, run on shared systems and the same controls." />
      <section className="mx-auto max-w-[1200px] px-8 py-16">
        {SERVICES.map((s, i) => (
          <div key={s.name} className="grid grid-cols-[1fr_1.4fr_1fr] gap-12 border-b border-line py-10">
            <h2 className="text-[22px] font-semibold tracking-tight text-navy">{s.name}</h2>
            <p className="text-[16px] leading-relaxed text-muted">{s.body}</p>
            <ul className="space-y-2 text-[15px] text-ink">{DETAIL[s.name].map(d => <li key={d} className="border-l-2 border-mint pl-3">{d}</li>)}</ul>
            {i === 1 && <img src={IMG.scan} alt="Parcel being scanned on a conveyor" className="col-span-3 mt-4 h-72 w-full rounded-lg object-cover" />}
          </div>
        ))}
        <p className="mt-10 text-[15px] text-muted">Where AI agents take part in these services, their actions are governed as described in <button onClick={() => go('responsible-ai')} className="font-medium text-teal-ink hover:underline">Responsible AI</button>.</p>
      </section>
    </>
  )
}

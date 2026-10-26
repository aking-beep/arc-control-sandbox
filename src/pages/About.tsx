import { PageIntro } from '../components/PageIntro'
import { IMG } from '../data/content'

const DEPTS = [
  ['Finance', 'Billing, refunds, payment requests and the general ledger.'],
  ['Customer Support', 'Ticket queues, escalations and account health.'],
  ['Sales & CRM', 'Accounts, pipeline and controlled customer-data exports.'],
  ['Human Resources', 'Employee records, compensation and access.'],
  ['IT & Infrastructure', 'Environments, deployments and access requests.'],
  ['Security Operations', 'Incidents, alerts and investigations.'],
]

export function About() {
  return (
    <>
      <PageIntro title="A commerce company built to be inspected." lede="Meridian Commerce Group is a fictional B2B commerce and technology company of roughly 250 simulated employees. It exists so that software controlling AI agents can be tested against a business that behaves like a real one." />
      <section className="mx-auto grid max-w-[1200px] grid-cols-[1.1fr_0.9fr] gap-16 px-8 py-20">
        <div className="space-y-5 text-[17px] leading-relaxed text-ink">
          <p>Meridian has the shape of a mid-sized operator: six departments, four regional hubs, customer accounts, orders, tickets and a payroll. Its systems hold state that can change — a refund is issued, a deployment ships, a ticket is closed.</p>
          <p>That state is what makes Meridian useful. When an AI agent asks to do something, the question is not only whether it was allowed, but what actually happened in the business afterwards.</p>
          <p className="text-muted">Meridian has no real customers, partners, certifications or awards. Names of companies and people on this site and in its systems are invented.</p>
        </div>
        <img src={IMG.office} alt="A Meridian team meeting in a city office" className="aspect-[3/2] w-full rounded-lg object-cover" />
      </section>
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-8 py-20">
          <h2 className="text-[28px] font-semibold tracking-tight text-navy">Six departments</h2>
          <div className="mt-8 grid grid-cols-3 gap-x-12">
            {DEPTS.map(([n, b]) => (
              <div key={n} className="border-t border-line-strong py-5">
                <h3 className="text-[16px] font-semibold text-ink">{n}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

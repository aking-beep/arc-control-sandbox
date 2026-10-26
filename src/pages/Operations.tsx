import { PageIntro } from '../components/PageIntro'
import { HUBS, IMG } from '../data/content'

export function Operations() {
  return (
    <>
      <PageIntro title="Global operations" lede="Four regional hubs share one operating model, one ledger and one set of controls. Headcount figures are fictional." />
      <img src={IMG.port} alt="Container terminal" className="h-[380px] w-full object-cover" />
      <section className="mx-auto max-w-[1200px] px-8 py-16">
        <table className="w-full border-collapse text-left">
          <thead><tr className="border-b border-line-strong text-[13px] text-muted"><th className="py-3 font-medium">Hub</th><th className="font-medium">Region</th><th className="font-medium">Responsibilities</th></tr></thead>
          <tbody>
            {HUBS.map(h => (
              <tr key={h.city} className="border-b border-line">
                <td className="py-5 text-[20px] font-semibold text-navy">{h.city}</td>
                <td className="text-[15px] text-muted">{h.region}</td>
                <td className="text-[15px] text-ink">{h.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-14 grid grid-cols-3 gap-12">
          {[['Follow-the-sun support', 'Tickets hand over between Austin, London and Singapore so queues are staffed around the clock.'], ['One ledger', 'Every region posts to the same finance system, so refunds and credits are visible centrally.'], ['Separated environments', 'Development and production are distinct; production changes need human approval.']].map(([t, b]) => (
            <div key={t}><h3 className="text-[16px] font-semibold text-ink">{t}</h3><p className="mt-2 text-[15px] leading-relaxed text-muted">{b}</p></div>
          ))}
        </div>
      </section>
    </>
  )
}

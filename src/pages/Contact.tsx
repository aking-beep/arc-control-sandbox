import { useState } from 'react'
import { PageIntro } from '../components/PageIntro'
import { HUBS } from '../data/content'

export function Contact() {
  const [sent, setSent] = useState(false)
  return (
    <>
      <PageIntro title="Contact" lede="Meridian is fictional, so this form does not send anything. It is here so the site behaves like a complete company website." />
      <section className="mx-auto grid max-w-[1200px] grid-cols-[1.2fr_0.8fr] gap-16 px-8 py-16">
        <form onSubmit={e => { e.preventDefault(); setSent(true) }} className="space-y-5">
          <div className="rounded-md bg-canvas px-4 py-2.5 text-[13px] text-muted">Demo form — submissions are not sent or stored.</div>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Name" /><Field label="Work email" type="email" />
          </div>
          <Field label="Company" />
          <label className="block">
            <span className="text-[14px] font-medium text-ink">Message</span>
            <textarea rows={5} className="mt-1.5 w-full rounded-md border border-line-strong px-3 py-2 text-[15px] outline-none focus:border-navy" />
          </label>
          <button className="h-11 rounded-md bg-navy px-5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-navy-soft">Send message</button>
          {sent && <p className="text-[14px] text-teal-ink">Nothing was sent — this is a demo form on a synthetic company’s site.</p>}
        </form>
        <div>
          <h2 className="text-[17px] font-semibold text-navy">Offices</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {HUBS.map(h => <li key={h.city} className="py-4"><div className="text-[15px] font-semibold text-ink">{h.city}</div><div className="text-[14px] text-muted">{h.role}</div></li>)}
          </ul>
          <p className="mt-4 text-[13px] text-faint">Office locations are fictional; no street addresses are given.</p>
        </div>
      </section>
    </>
  )
}

function Field({ label, type = 'text' }: { label: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-[14px] font-medium text-ink">{label}</span>
      <input type={type} className="mt-1.5 h-11 w-full rounded-md border border-line-strong px-3 text-[15px] outline-none focus:border-navy" />
    </label>
  )
}

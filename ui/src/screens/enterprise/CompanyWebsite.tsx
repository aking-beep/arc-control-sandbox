import { PageHeader, Section } from '../../components/ui/primitives'

const PAGES = ['Homepage', 'About', 'Services', 'Global Operations', 'Technology', 'Responsible AI', 'Contact']
const SITE_KEY = 'meridian.websiteUrl'

export function CompanyWebsite() {
  const url = (() => { try { return localStorage.getItem(SITE_KEY) ?? '' } catch { return '' } })()
  return (
    <>
      <PageHeader title="Company Website"
        description="Meridian’s public site is a separate, full-bleed experience with its own header. It shares this design system but does not live inside the employee shell." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Section title="Pages">
          <ol className="grid grid-cols-2 gap-x-8">
            {PAGES.map((p, i) => <li key={p} className="flex items-baseline gap-3 border-b border-line py-2.5 text-[13px]"><span className="font-mono text-[11px] text-faint">{i + 1}</span>{p}</li>)}
          </ol>
        </Section>
        <Section title="Open the public site">
          <p className="text-[12.5px] leading-relaxed text-muted">The corporate website is delivered as its own design on the canvas. When deployed, set its URL in Settings to link it here.</p>
          {url
            ? <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-8 items-center rounded-md bg-navy px-3 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-navy-soft">Open {url}</a>
            : <p className="mt-3 rounded-md bg-canvas px-3 py-2 text-[12px] text-muted">No website URL configured.</p>}
          <p className="mt-4 text-[12px] text-muted">Every page carries the disclosure: Meridian Commerce Group is a synthetic enterprise used for software validation.</p>
        </Section>
      </div>
    </>
  )
}

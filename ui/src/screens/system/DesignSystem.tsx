import type { ReactNode } from 'react'
import { PageHeader, Button, KV, Th, Td } from '../../components/ui/primitives'
import { StatusBadge, AssuranceBadge, VerificationBadge } from '../../components/ui/StatusBadge'
import { SourceTag } from '../../components/ui/SourceTag'
import { StackBar } from '../../components/lab/StackBar'
import { RemediationStepper } from '../../components/lab/RemediationStepper'
import type { AssuranceStatus, DataSource, ResultStatus, VerificationState } from '../../api/types'

/**
 * Living reference for the shared Meridian system. Everything here renders the
 * real components, so this page cannot drift from the product.
 * Tokens: index.css @theme. Rules: design.md.
 */
export function DesignSystem() {
  return (
    <>
      <PageHeader title="Design System"
        description="One system for the corporate site, the Enterprise OS and the ARC Validation Lab. Its credibility comes from honesty: every value shows where it came from, and only PASS is ever green." />

      <Block title="Data sources" note="Every number on screen carries one of these. They're how live results, historical reports and design-only data stay distinct.">
        <table className="w-full border-collapse">
          <thead><tr><Th>Tag</Th><Th>Means</Th><Th>Produced by</Th></tr></thead>
          <tbody>
            {SOURCES.map(([s, means, by]) => (
              <tr key={s}><Td><SourceTag source={s} /></Td><Td className="text-ink">{means}</Td><Td className="font-mono text-[11.5px] text-muted">{by}</Td></tr>
            ))}
          </tbody>
        </table>
      </Block>

      <Block title="Result vocabulary" note="Seven scenario states, never merged. Unsupported and not-implemented are outlined grey, so they never read as a pass.">
        <div className="space-y-4">
          <Row label="Scenario"><div className="flex flex-wrap gap-2">{RESULTS.map(s => <StatusBadge key={s} status={s} />)}</div></Row>
          <Row label="Assurance"><div className="flex flex-wrap gap-2">{ASSURANCE.map(s => <AssuranceBadge key={s} status={s} />)}</div></Row>
          <Row label="Evidence"><div className="flex flex-wrap gap-2">{VERIFY.map(s => <VerificationBadge key={s} state={s} />)}</div></Row>
          <Row label="Decision">
            <div className="flex flex-wrap gap-4 font-mono text-[12px] font-medium">
              <span className="text-success">ALLOW</span><span className="text-critical-ink">DENY</span><span className="text-warning-ink">REQUIRE APPROVAL</span><span className="text-muted">REFUSED · HTTP 403</span>
            </div>
          </Row>
        </div>
      </Block>

      <Block title="Colour" note="Navy for chrome and primary actions, teal for interaction, mint only on navy or for selection. Status colours are for status only.">
        <div className="grid gap-6 md:grid-cols-3">
          {PALETTE.map(([group, tokens]) => (
            <div key={group}>
              <div className="mb-2 text-[12px] font-medium text-muted">{group}</div>
              <ul className="space-y-1.5">
                {tokens.map(([name, use]) => (
                  <li key={name} className="flex items-center gap-3">
                    <span className="size-7 shrink-0 rounded-md border border-line" style={{ background: `var(--color-${name})` }} />
                    <span className="min-w-0"><span className="block font-mono text-[11.5px] text-ink">{name}</span><span className="block truncate text-[11.5px] text-faint">{use}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Type" note="Inter for everything readable, Geist Mono for ids, hashes, parameters, tool names, timestamps and JSON. Every count is set in tabular figures.">
        <dl className="divide-y divide-line">
          <TypeRow k="Page title · 22/600"><span className="text-[22px] font-semibold tracking-tight">Live Action Inspector</span></TypeRow>
          <TypeRow k="Verdict · 22/600"><span className="text-[22px] font-semibold tracking-tight text-critical-ink">8 refunds executed</span></TypeRow>
          <TypeRow k="Panel title · 13/600"><span className="text-[13px] font-semibold">How the control failed</span></TypeRow>
          <TypeRow k="Body · 14/400"><span className="text-[14px]">Agents act. ARC Control governs. Meridian records the effect.</span></TypeRow>
          <TypeRow k="Table · 12.5/400"><span className="text-[12.5px]">Block over-ceiling refund ($4,200)</span></TypeRow>
          <TypeRow k="Mono · 12/400"><span className="font-mono text-[12px]">finance.refund · MER-FIN-001 / over-ceiling</span></TypeRow>
          <TypeRow k="Count · tnum"><span className="tnum text-[32px] font-semibold leading-none">1 / 8</span></TypeRow>
        </dl>
      </Block>

      <Block title="Components" note="Exported from components/ui and components/lab. Flat surfaces with hairlines; shadows only on drawers and the command palette.">
        <div className="space-y-5">
          <Row label="Buttons">
            <div className="flex flex-wrap gap-2"><Button variant="primary">Run Integration Suite</Button><Button>Load report file</Button><Button variant="ghost">ARC Console</Button><Button variant="danger">Reset business data</Button><Button>Run Phase 2</Button></div>
          </Row>
          <Row label="Suite bar"><div className="max-w-xl"><StackBar segments={[{ label: 'pass', value: 31, tone: 'pass' }, { label: 'fail', value: 2, tone: 'fail' }, { label: 'unsupported', value: 5, tone: 'hatch' }, { label: 'not implemented', value: 1, tone: 'hatch' }]} /></div></Row>
          <Row label="Remediation"><div className="max-w-md"><RemediationStepper stage="open" /></div></Row>
          <Row label="Key–value"><dl className="max-w-md"><KV k="Matched policy" mono>MER-FIN-001</KV><KV k="Before → after"><span className="text-faint">not captured by backend</span></KV></dl></Row>
        </div>
      </Block>

      <Block title="Extending the system" note="How each remaining experience uses the same parts.">
        <table className="w-full border-collapse">
          <thead><tr><Th>Experience</Th><Th>Shell</Th><Th>Primary pattern</Th><Th>Honesty rule</Th></tr></thead>
          <tbody>
            {EXTEND.map(([x, shell, pattern, rule]) => (
              <tr key={x}><Td className="font-medium text-ink">{x}</Td><Td className="text-muted">{shell}</Td><Td className="text-muted">{pattern}</Td><Td className="text-muted">{rule}</Td></tr>
            ))}
          </tbody>
        </table>
      </Block>
    </>
  )
}

function Block({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-line py-7 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div><h2 className="text-[14px] font-semibold text-ink">{title}</h2><p className="mt-1 text-[12.5px] leading-relaxed text-muted">{note}</p></div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4"><span className="text-[12px] text-muted">{label}</span>{children}</div>
}
function TypeRow({ k, children }: { k: string; children: ReactNode }) {
  return <div className="grid grid-cols-[160px_minmax(0,1fr)] items-baseline gap-4 py-2.5"><dt className="font-mono text-[11px] text-faint">{k}</dt><dd className="min-w-0 text-ink">{children}</dd></div>
}

const SOURCES: Array<[DataSource, string, string]> = [
  ['live', 'Fetched from the running Meridian server this session', 'GET /api/scenarios · /api/state · POST /api/load'],
  ['recorded', 'Loaded from a saved report file, with its date', 'reports/latest.json (npm run validate) · Phase 2 report'],
  ['baseline', 'Documented figure with no file behind it; avoid — prefer live or recorded', 'unused'],
  ['repository', 'Read from repository source, not the running system', 'src/start.mjs · src/scenarios.mjs'],
  ['illustrative', 'Design-only preview fixture; hidden by “Real only”', 'data/illustrative.ts · ILLUSTRATIVE_TRACE'],
  ['proposed', 'Needs a sandbox endpoint that does not exist yet', 'proposedApi in api/client.ts'],
]
const RESULTS: ResultStatus[] = ['PASS', 'FAIL', 'ERROR', 'RUNNING', 'NOT_RUN', 'UNSUPPORTED', 'NOT_IMPLEMENTED']
const ASSURANCE: AssuranceStatus[] = ['pass', 'fail', 'not_assessable', 'not_applicable', 'attested']
const VERIFY: VerificationState[] = ['internally_verified', 'externally_anchored', 'failed', 'not_assessable']
const PALETTE: Array<[string, Array<[string, string]>]> = [
  ['Brand', [['navy', 'lab chrome, primary buttons'], ['navy-soft', 'primary hover'], ['teal', 'interactive'], ['teal-ink', 'links, small interactive text'], ['mint', 'lab hairline, labels on navy'], ['mint-50', 'selected rows']]],
  ['Surface & text', [['canvas', 'app background'], ['surface', 'panels, tables'], ['line', 'hairlines'], ['ink', 'body text'], ['muted', 'secondary text'], ['faint', 'tertiary text']]],
  ['Status', [['success', 'PASS · ALLOW · live'], ['critical', 'FAIL · DENY'], ['critical-ink', 'failure text on white'], ['warning', 'ERROR · approval · baseline'], ['warning-ink', 'warning text'], ['neutral', 'not run · unsupported']]],
]
const EXTEND: Array<[string, string, string, string]> = [
  ['Corporate website', 'Full-bleed, own header', 'Editorial sections, 1200px container, documentary photography', 'Synthetic-enterprise disclosure on every page; no logos or certifications'],
  ['Enterprise OS', 'White rail zone', 'Department overview → list → record drawer', 'Agent action and committed change shown as two separate strips'],
  ['Stress Lab', 'Navy lab zone', 'Config form + results; unexpected effects outweigh throughput', 'Charts only from returned data; pinned scope label'],
  ['Assurance Dashboard', 'Navy lab zone', 'Control inventory table + side-panel detail', 'Five statuses kept apart; no overall percentage'],
]

import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { FINDINGS } from '../data/findings'
import { UNSUPPORTED_SUMMARY } from '../data/report'
import { PageHeader } from '../components/PageHeader'
import { SeverityTag, StatusPill } from '../components/Status'
import { FindingDetail } from '../components/FindingDetail'
import { UnsupportedDetail } from '../components/UnsupportedDetail'

export function FindingsCenter() {
  const { findingId } = useParams()
  const selectedId = findingId ?? FINDINGS[0].id
  const finding = FINDINGS.find((f) => f.id === selectedId)
  const unsupported = UNSUPPORTED_SUMMARY.find((u) => u.id === selectedId)
  const failures = FINDINGS.filter((f) => f.kind === 'failure')
  const limitations = FINDINGS.filter((f) => f.kind === 'limitation')

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Security Findings"
        description="Two implemented authorization checks failed against ARC Control. Reproduced limitations and unsupported capabilities are listed beneath them so the failures are not read as the whole risk picture."
      />
      <div className="flex min-h-0 flex-1">
        <aside className="w-[320px] shrink-0 overflow-y-auto border-r border-line bg-surface">
          <Group title="Open failures" count={failures.length} tone="fail">
            {failures.map((f) => (
              <Item key={f.id} to={`/findings/${f.id}`} active={selectedId === f.id}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-subtle">{f.code}</span>
                  <SeverityTag severity={f.severity} />
                </div>
                <div className="mt-1 text-[13px] font-medium text-ink">{f.title}</div>
                <div className="mt-0.5 text-[12px] text-fail">
                  Expected {f.expectedValue} · observed {f.observedValue}
                </div>
              </Item>
            ))}
          </Group>
          <Group title="Reproduced limitations" count={limitations.length}>
            {limitations.map((f) => (
              <Item key={f.id} to={`/findings/${f.id}`} active={selectedId === f.id}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-subtle">{f.code}</span>
                  <StatusPill status="limitation" label="Limitation" />
                </div>
                <div className="mt-1 text-[13px] font-medium text-ink">{f.title}</div>
              </Item>
            ))}
          </Group>
          <Group title="Unsupported in this ARC build" count={UNSUPPORTED_SUMMARY.length}>
            {UNSUPPORTED_SUMMARY.map((u) => (
              <Item key={u.id} to={`/findings/${u.id}`} active={selectedId === u.id}>
                <div className="text-[13px] font-medium text-ink">{u.title}</div>
                <div className="mt-0.5 line-clamp-1 text-[12px] text-subtle">{u.why}</div>
              </Item>
            ))}
          </Group>
        </aside>
        <section className="min-w-0 flex-1 overflow-y-auto">
          {finding ? <FindingDetail finding={finding} /> : unsupported ? <UnsupportedDetail item={unsupported} /> : <div className="p-8 text-muted">Finding not found.</div>}
        </section>
      </div>
    </div>
  )
}

function Group({ title, count, tone, children }: { title: string; count: number; tone?: 'fail'; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-2">
      <div className="flex items-center justify-between px-5 py-2 text-[11.5px] font-medium text-subtle">
        <span>{title}</span>
        <span className={`tnum ${tone === 'fail' ? 'font-semibold text-fail' : ''}`}>{count}</span>
      </div>
      <ul>{children}</ul>
    </div>
  )
}

const Item: React.FC<{ to: string; active: boolean; children?: React.ReactNode }> = ({ to, active, children }) => {
  return (
    <li>
      <Link
        to={to}
        className={`block border-l-2 px-5 py-2.5 transition-colors duration-150 ${active ? 'border-teal-600 bg-teal-50' : 'border-transparent hover:bg-canvas'}`}
      >
        {children}
      </Link>
    </li>
  )
}

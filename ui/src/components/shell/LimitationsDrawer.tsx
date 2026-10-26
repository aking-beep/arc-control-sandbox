import { Drawer } from '../ui/Drawer'
import { useUI } from './UIContext'
import { LIMITATIONS } from '../../data/findingDocs'

export function LimitationsDrawer() {
  const { limitationsOpen, setLimitationsOpen } = useUI()
  return (
    <Drawer open={limitationsOpen} onClose={() => setLimitationsOpen(false)} width={480}
      title="Known limitations"
      subtitle="Documented constraints of ARC Control 2.0 and this sandbox. These stay visible regardless of test results.">
      <ol className="divide-y divide-line">
        {LIMITATIONS.map((l, i) => (
          <li key={l.title} className="py-3.5">
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[11px] text-faint">L{i + 1}</span>
              <span className="text-[13px] font-medium text-ink">{l.title}</span>
              {l.control && <span className="ml-auto font-mono text-[11px] text-teal-ink">{l.control}</span>}
            </div>
            <p className="mt-1 pl-7 text-[12.5px] leading-relaxed text-muted">{l.detail}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-md bg-canvas px-3 py-2.5 text-[12px] leading-relaxed text-muted">
        Sources: README.md, DAY_1_RUNBOOK.md, CLAUDE_CODE_PROMPT.md and MASTER_BUILD_PLAN.md in arc-control-sandbox, plus the project brief.
        A UI prototype does not prove enforcement.
      </p>
    </Drawer>
  )
}

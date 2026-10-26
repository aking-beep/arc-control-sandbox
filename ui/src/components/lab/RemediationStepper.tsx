import type { FindingStage } from '../../data/findingDocs'

const STEPS: Array<{ id: FindingStage; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'fix_proposed', label: 'Fix proposed' },
  { id: 'regression_passing', label: 'Regression passing' },
  { id: 'resolved', label: 'Resolved' },
]

export function RemediationStepper({ stage }: { stage: FindingStage }) {
  const at = STEPS.findIndex(s => s.id === stage)
  return (
    <ol className="grid grid-cols-4 gap-1">
      {STEPS.map((s, i) => (
        <li key={s.id}>
          <div className={`h-1 rounded-full ${i <= at ? (stage === 'resolved' ? 'bg-success' : i === 0 ? 'bg-critical' : 'bg-teal') : 'bg-line'}`} />
          <div className={`mt-1.5 text-[11px] leading-tight ${i === at ? 'font-medium text-ink' : 'text-faint'}`}>{s.label}</div>
        </li>
      ))}
    </ol>
  )
}

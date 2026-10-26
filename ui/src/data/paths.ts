/**
 * ARC decision paths — how the 17 repository scenarios group by the behaviour
 * ARC Control is supposed to exhibit. Grouping is a UI reading of scenarios.mjs
 * (expected outcome + assertion), not something ARC reports.
 *
 * `knownBreak` links a path to a finding whose current state is read live from
 * the Phase 2 harness.
 */
export type ArcPath = 'allow' | 'approval' | 'deny' | 'refuse' | 'planned'

export interface PathDef {
  id: ArcPath
  label: string
  /** What ARC is contracted to do on this path, in one line. */
  contract: string
  scenarios: string[]
  knownBreak?: { findingId: string; summary: string }
}

export const PATHS: PathDef[] = [
  {
    id: 'allow',
    label: 'Allow and execute once',
    contract: 'Authorize, call the connector, produce exactly one effect per action.',
    scenarios: ['refund-allow', 'support-allow', 'development-deploy', 'idempotency'],
    knownBreak: { findingId: 'ARC-SEC-001', summary: '8 parallel requests with one key → 8 refunds' },
  },
  {
    id: 'approval',
    label: 'Hold for human approval',
    contract: 'Hold with zero effect until approved; execute once; never replay.',
    scenarios: ['refund-pending', 'refund-approve', 'export-pending', 'approval-replay'],
    knownBreak: { findingId: 'ARC-SEC-002', summary: 'Approved refund executed after a deny policy took effect' },
  },
  {
    id: 'deny',
    label: 'Deny by policy',
    contract: 'Match a DENY rule, write evidence, produce zero effect.',
    scenarios: ['refund-deny', 'wrong-agent', 'protected-deploy'],
  },
  {
    id: 'refuse',
    label: 'Refuse before policy',
    contract: 'Reject bad identity, tool, input, lifecycle state or bypass before any rule runs.',
    scenarios: ['unknown-tool', 'wrong-type', 'suspend-agent', 'disable-tool', 'operator-isolation', 'direct-bypass'],
  },
]

const EXTRA: Record<string, ArcPath> = {
  'concurrent-idempotency': 'allow',
  'concurrent-distinct-refunds': 'allow',
  'REG-SEC-001': 'allow',
  'policy-change-before-release': 'approval',
  'approval-consume-race': 'approval',
  'approval-expires': 'approval',
  'REG-SEC-002': 'approval',
  'retired-agent-final': 'refuse',
}

export function pathOf(id: string): ArcPath {
  return PATHS.find(p => p.scenarios.includes(id))?.id ?? EXTRA[id] ?? 'planned'
}

export const PATH_LABEL: Record<ArcPath, string> = {
  allow: 'Allow and execute once',
  approval: 'Hold for human approval',
  deny: 'Deny by policy',
  refuse: 'Refuse before policy',
  planned: 'Planned — no scenario code',
}

/** Untested master-plan scenarios that sit next to each finding. They are NOT IMPLEMENTED, not passes. */
export const ADJACENT_UNTESTED: Record<string, string[]> = {
  'ARC-SEC-001': ['MP-36', 'MP-34'],
  'ARC-SEC-002': ['MP-31', 'MP-20', 'MP-35'],
  'ARC-SEC-003': ['MP-21', 'MP-22', 'MP-23'],
}

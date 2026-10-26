/**
 * ARC decision paths — how the 17 repository scenarios group by the behaviour
 * ARC Control is supposed to exhibit. Grouping is a UI reading of scenarios.mjs
 * (expected outcome + assertion), not something ARC reports.
 *
 * `knownBreak` links a path to a finding reproduced by a Phase 2 check.
 */
import { PHASE2_CATALOG } from './phase2Catalog'

export type ArcPath = 'allow' | 'approval' | 'deny' | 'refuse' | 'phase2' | 'planned'

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
    knownBreak: { findingId: 'ARC-SEC-002', summary: 'Held refund released after a deny policy was published' },
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
    knownBreak: { findingId: 'ARC-SEC-003', summary: 'Retired agent reactivated (activate → 200)' },
  },
]

const PHASE2_IDS = new Set(PHASE2_CATALOG.map(c => c.id))

export function pathOf(id: string): ArcPath {
  return PATHS.find(p => p.scenarios.includes(id))?.id ?? (PHASE2_IDS.has(id) ? 'phase2' : 'planned')
}

export const PATH_LABEL: Record<ArcPath, string> = {
  allow: 'Allow and execute once',
  approval: 'Hold for human approval',
  deny: 'Deny by policy',
  refuse: 'Refuse before policy',
  phase2: 'Phase 2 security, reliability and evidence checks',
  planned: 'Master plan — partial coverage',
}

/** Phase 2 checks that exercise the same path as each finding. Their results are shown next to it, not merged into it. */
export const ADJACENT_CHECKS: Record<string, string[]> = {
  'ARC-SEC-001': ['approval-consume-race', 'concurrent-distinct-refunds', 'connector-timeout-after-effect'],
  'ARC-SEC-002': ['policy-tightening-new-actions', 'approval-expires', 'kill-switch-blocks-new-work'],
  'ARC-SEC-003': ['revoked-credential', 'key-rotation', 'draft-agent-cannot-act'],
}

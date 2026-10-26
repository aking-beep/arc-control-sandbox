import type { AssuranceStatus, LoadRun } from '../lib/types'

// Transcribed from docs/PHASE_2_READINESS.md at repository commit 8fc43b8.
export const REPORT = {
  source: 'docs/PHASE_2_READINESS.md',
  repoCommit: '8fc43b8',
  measuredAt: '26 Oct 2026, 11:21 AM PT',
  sandboxRevision: '6ae25141a0c9f567a239fdd417e5d3ef3621065d',
  arcRevision: 'aa2f37c97410427338600e47c913fd6aa51aa5d3',
  node: '22.23.4',
  environment: 'Single Node process · loopback · MemoryStore',
  enterpriseReady: false,
  integrationRecheck: { passed: 17, total: 17 },
  phase2: { pass: 31, fail: 2, unsupported: 5, notImplemented: 1, limitationReproduced: 3 },
}

// Assurance totals as reported. The report only names per-control statuses for
// ARC-AI-006, -007 and -009; the 3 pass / 3 fail split across the other six is
// NOT attributed per control, so the UI must not attribute it either.
export const ASSURANCE_TOTALS: Record<AssuranceStatus, number> = {
  pass: 3,
  fail: 3,
  not_assessable: 2,
  not_applicable: 1,
  attested: 0,
}

export interface AssuranceControl {
  id: string
  status: AssuranceStatus | 'unattributed'
  note: string
}

export const ASSURANCE_CONTROLS: AssuranceControl[] = [
  { id: 'ARC-AI-001', status: 'unattributed', note: 'One of 3 pass / 3 fail — per-control split not recorded' },
  { id: 'ARC-AI-002', status: 'unattributed', note: 'One of 3 pass / 3 fail — per-control split not recorded' },
  { id: 'ARC-AI-003', status: 'unattributed', note: 'One of 3 pass / 3 fail — per-control split not recorded' },
  { id: 'ARC-AI-004', status: 'unattributed', note: 'Operator identity is header-asserted; cannot identify a person' },
  { id: 'ARC-AI-005', status: 'unattributed', note: 'One of 3 pass / 3 fail — per-control split not recorded' },
  { id: 'ARC-AI-006', status: 'not_assessable', note: 'MemoryStore records no external audit head' },
  { id: 'ARC-AI-007', status: 'not_applicable', note: 'No MCP server is pinned into the gateway' },
  { id: 'ARC-AI-008', status: 'unattributed', note: 'One of 3 pass / 3 fail — per-control split not recorded' },
  { id: 'ARC-AI-009', status: 'not_assessable', note: 'Connector token is application-level, not network isolation' },
]

export const ASSURANCE_FAIL_CONTEXT =
  'The fails are consistent with this harness: throwaway agents have no governance record, and probe tools are left disabled after their temporary policies are removed.'

const run = (requested: number, concurrency: number, seed: number, rps: number, p50: number, p95: number, p99: number): LoadRun => ({
  pass: true,
  requested,
  concurrency,
  seed,
  requestsPerSecond: rps,
  p50Ms: p50,
  p95Ms: p95,
  p99Ms: p99,
  expectedEffects: requested / 2,
  observedEffects: requested / 2,
  otherMutations: 0,
  unexpectedOutcomes: 0,
})

export const RECORDED_STRESS: LoadRun[] = [
  run(100, 5, 1, 819.67, 6, 9, 10),
  run(100, 5, 2, 892.86, 6, 8, 10),
  run(100, 5, 3, 934.58, 5, 9, 10),
  run(500, 10, 1, 1118.57, 9, 15, 16),
  run(500, 10, 2, 1366.12, 8, 12, 13),
  run(500, 10, 3, 1269.04, 8, 13, 17),
  run(1000, 20, 1, 1285.35, 15, 30, 35),
  run(1000, 20, 2, 1497.01, 13, 22, 24),
  run(1000, 20, 3, 1592.36, 12, 21, 31),
]

export interface AgentProfile {
  name: string
  department: string
  tool: string
  policyId: string
  effect: 'irreversible' | 'write' | 'read'
  tier: 'critical' | 'high' | 'medium'
  profile: { label: string; tone: 'allow' | 'hold' | 'deny' }[]
}

// Seeded in src/start.mjs — six deterministic agent identities (not LLM-driven).
export const AGENTS: AgentProfile[] = [
  { name: 'finance-agent', department: 'Finance', tool: 'finance.refund', policyId: 'MER-FIN-001', effect: 'irreversible', tier: 'critical', profile: [{ label: '< $500', tone: 'allow' }, { label: '≤ $2,500', tone: 'hold' }, { label: '> $2,500', tone: 'deny' }] },
  { name: 'support-agent', department: 'Support', tool: 'support.ticket_update', policyId: 'MER-SUP-001', effect: 'write', tier: 'medium', profile: [{ label: 'Ticket update', tone: 'allow' }] },
  { name: 'it-agent', department: 'IT', tool: 'it.deploy', policyId: 'MER-IT-001', effect: 'write', tier: 'high', profile: [{ label: 'Dev branch', tone: 'allow' }, { label: 'main / release', tone: 'deny' }] },
  { name: 'sales-agent', department: 'Sales', tool: 'sales.export_customers', policyId: 'MER-SALES-001', effect: 'write', tier: 'critical', profile: [{ label: 'Security review', tone: 'hold' }] },
  { name: 'hr-agent', department: 'HR', tool: 'hr.salary_read', policyId: 'MER-HR-001', effect: 'read', tier: 'high', profile: [{ label: 'HR approval', tone: 'hold' }] },
  { name: 'security-agent', department: 'Security', tool: 'security.quarantine', policyId: 'MER-SEC-001', effect: 'write', tier: 'high', profile: [{ label: 'Human approval', tone: 'hold' }] },
]

export const UNSUPPORTED_SUMMARY = [
  { id: 'cross-tenant-isolation', title: 'Cross-tenant isolation', why: 'One organization. No second tenant boundary refuses foreign records.' },
  { id: 'external-anchor-persistence', title: 'External anchor persistence', why: 'Nothing writes the audit head to a store ARC does not control.' },
  { id: 'sso-operator-identity', title: 'SSO and individual operator credentials', why: 'One shared bearer token. Identity and roles are headers.' },
  { id: 'network-segmentation', title: 'Network segmentation', why: 'The connector token is an application check on loopback.' },
  { id: 'mcp-drift-runtime-enforcement', title: 'MCP drift as a runtime block', why: 'detectDrift reports the change. The gateway does not pin a manifest or suspend the tool.' },
]

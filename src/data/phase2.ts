import type { Phase2Spec, Phase2Status } from '../lib/types'

// Verbatim CATALOGUE from src/phase2.mjs (commit 8fc43b8): 33 implemented, 5 unsupported, 1 not implemented.
export const PHASE2_CATALOGUE: Phase2Spec[] = [
  { id: 'wrong-role-approval', label: 'Wrong-role operator cannot approve', family: 'approvals', track: 'security', kind: 'implemented' },
  { id: 'owner-self-approval', label: 'Agent owner cannot approve own action', family: 'approvals', track: 'security', kind: 'implemented' },
  { id: 'operator-role-header-asserted', label: 'Operator role is taken from a request header', family: 'identity', track: 'security', kind: 'implemented', disposition: 'limitation_reproduced' },
  { id: 'agent-cannot-administer', label: 'Agent credential cannot call operator APIs', family: 'identity', track: 'security', kind: 'implemented' },
  { id: 'approval-expires', label: 'Expired approval cannot execute', family: 'approvals', track: 'reliability', kind: 'implemented' },
  { id: 'revoked-credential', label: 'Rotated-away credential is rejected', family: 'lifecycle', track: 'security', kind: 'implemented' },
  { id: 'key-rotation', label: 'Primary key rotation invalidates the old key', family: 'lifecycle', track: 'security', kind: 'implemented' },
  { id: 'retired-agent-final', label: 'Retired agent cannot be reactivated', family: 'lifecycle', track: 'security', kind: 'implemented' },
  { id: 'draft-agent-cannot-act', label: 'Draft agent cannot act', family: 'lifecycle', track: 'security', kind: 'implemented' },
  { id: 'undeclared-parameter', label: 'Undeclared parameter is rejected', family: 'input', track: 'security', kind: 'implemented' },
  { id: 'tool-reregistration-rejected', label: 'Existing tool name cannot be replaced', family: 'tools', track: 'security', kind: 'implemented' },
  { id: 'mcp-poisoned-metadata', label: 'Malicious MCP tool metadata is flagged', family: 'mcp', track: 'security', kind: 'implemented' },
  { id: 'mcp-manifest-drift', label: 'Pinned MCP manifest drift is detected', family: 'mcp', track: 'security', kind: 'implemented' },
  { id: 'mcp-plaintext-endpoint', label: 'Plaintext MCP endpoint is flagged', family: 'mcp', track: 'security', kind: 'implemented' },
  { id: 'connector-host-allowlist', label: 'Off-allowlist connector URL is rejected at registration', family: 'connector', track: 'security', kind: 'implemented' },
  { id: 'connector-redirect-refused', label: 'Connector refuses a redirect off the allowlist', family: 'connector', track: 'security', kind: 'implemented' },
  { id: 'unapproved-export-not-executed', label: 'Held CRM export does not run without approval', family: 'approvals', track: 'security', kind: 'implemented' },
  { id: 'connector-http-500-write', label: 'HTTP 500 on a write is a failure, not an effect', family: 'connector', track: 'reliability', kind: 'implemented' },
  { id: 'connector-http-500-read-retry', label: 'Retryable read failure is retried and still fails closed', family: 'connector', track: 'reliability', kind: 'implemented' },
  { id: 'connector-timeout-after-effect', label: 'Timeout after a backend effect is not reported as success', family: 'connector', track: 'reliability', kind: 'implemented', disposition: 'limitation_reproduced' },
  { id: 'connector-recovery-after-fault', label: 'A later authorized action still runs after a connector fault', family: 'connector', track: 'reliability', kind: 'implemented' },
  { id: 'kill-switch-blocks-new-work', label: 'Kill switch blocks new work while an in-flight call may finish', family: 'kill-switch', track: 'reliability', kind: 'implemented' },
  { id: 'approval-consume-race', label: 'Concurrent approval release executes once', family: 'concurrency', track: 'reliability', kind: 'implemented' },
  { id: 'concurrent-idempotency', label: 'Concurrent identical idempotency keys execute once', family: 'concurrency', track: 'reliability', kind: 'implemented' },
  { id: 'concurrent-distinct-refunds', label: 'Concurrent distinct refunds each take effect once', family: 'concurrency', track: 'reliability', kind: 'implemented' },
  { id: 'policy-tightening-new-actions', label: 'A stricter policy denies a new action', family: 'policy', track: 'reliability', kind: 'implemented' },
  { id: 'policy-change-before-release', label: 'A stricter policy stops a queued action before release', family: 'policy', track: 'reliability', kind: 'implemented' },
  { id: 'policy-disable-fails-closed', label: 'Disabling the only matching policy fails closed', family: 'policy', track: 'reliability', kind: 'implemented' },
  { id: 'evidence-bundle-tamper', label: 'A tampered evidence bundle fails verification', family: 'evidence', track: 'evidence', kind: 'implemented' },
  { id: 'audit-chain-detects-edit', label: 'An edited audit record breaks chain verification', family: 'evidence', track: 'evidence', kind: 'implemented' },
  { id: 'audit-self-check-limit', label: 'Self-check verifies the chain and discloses the truncation limit', family: 'evidence', track: 'evidence', kind: 'implemented', disposition: 'limitation_reproduced' },
  { id: 'audit-supplied-head-detects-truncation', label: 'A supplied audit head detects a shorter chain', family: 'evidence', track: 'evidence', kind: 'implemented' },
  { id: 'assurance-categories-not-collapsed', label: 'Assurance keeps non-pass results distinct from pass', family: 'governance', track: 'evidence', kind: 'implemented' },
  { id: 'cross-tenant-isolation', label: 'Cross-tenant record isolation', family: 'tenancy', track: 'security', kind: 'unsupported', reason: "This ARC build has one organization in the sandbox store and no tenant boundary that refuses another organization's records." },
  { id: 'external-anchor-persistence', label: 'Audit head stored outside ARC', family: 'evidence', track: 'evidence', kind: 'unsupported', reason: 'MemoryStore does not record an audit head, and nothing in this build writes that head to a store ARC does not control.' },
  { id: 'sso-operator-identity', label: 'Operator SSO and individual credentials', family: 'identity', track: 'security', kind: 'unsupported', reason: 'Operator authentication is one shared bearer token. Identity and roles are request headers.' },
  { id: 'network-segmentation', label: 'Network-level isolation of internal endpoints', family: 'connector', track: 'security', kind: 'unsupported', reason: 'The internal token check is application-level on loopback. This harness does not prove there is no other network path.' },
  { id: 'mcp-drift-runtime-enforcement', label: 'Drift automatically suspends the affected tool', family: 'mcp', track: 'security', kind: 'unsupported', reason: 'detectDrift reports a changed manifest. The gateway does not pin a manifest onto a tool or refuse calls when that pin breaks.' },
  { id: 'restart-mid-approval', label: 'Restart while an approval is pending', family: 'reliability', track: 'reliability', kind: 'not_implemented', reason: 'Not run here. It would stop the shared API process, and MemoryStore would drop the approval with it. The original integration scenarios are rechecked against this same process.' },
]

/** The two implemented checks that FAILED in the measured run (docs/PHASE_2_READINESS.md). */
export const RECORDED_FAILURES = new Set(['concurrent-idempotency', 'policy-change-before-release'])

export function recordedPhase2Status(spec: Phase2Spec): Phase2Status {
  if (spec.kind === 'unsupported') return 'unsupported'
  if (spec.kind === 'not_implemented') return 'not_implemented'
  return RECORDED_FAILURES.has(spec.id) ? 'fail' : 'pass'
}

// What PHASE_2_READINESS.md says was observed. Only checks the doc describes get a note.
export const PHASE2_RECORDED_NOTES: Record<string, string> = {
  'wrong-role-approval': 'Wrong-role operator vote refused. No refund.',
  'owner-self-approval': "Agent's own owner vote refused. No refund.",
  'operator-role-header-asserted': 'Shared token presenting unrelated-person@example.com + security-manager successfully rejected a CRM-export approval. No directory consulted.',
  'agent-cannot-administer': 'Agent key got HTTP 401 on policy publish, key issue, suspend, audit read and approval vote.',
  'approval-expires': 'One-second window expired. Release returned approval_expired; probe backend not called.',
  'revoked-credential': 'Rotating a credential rejected the old key.',
  'key-rotation': 'Old primary key rejected after rotation; new key executed one refund.',
  'retired-agent-final': 'Retire refused reactivation.',
  'draft-agent-cannot-act': 'Draft agent refused before any refund.',
  'undeclared-parameter': 'Undeclared parameter rejected (invalid_parameters).',
  'tool-reregistration-rejected': 'Registering finance.refund again returned HTTP 409.',
  'mcp-poisoned-metadata': 'POST /v1/mcp/scan flagged MCP-SEC-001, -002, -006, -022.',
  'mcp-manifest-drift': 'detectDrift reported MCP-SEC-030 (critical) for a changed description and MCP-SEC-031 for a new tool.',
  'mcp-plaintext-endpoint': 'Plaintext off-loopback endpoint flagged MCP-SEC-021.',
  'connector-host-allowlist': 'Registration of http://169.254.169.254/… rejected; tool not stored.',
  'connector-redirect-refused': '302 off the allowlist returned redirect_refused after one attempt.',
  'unapproved-export-not-executed': 'Release without a vote returned approval_required; no export written.',
  'connector-http-500-write': 'Write returning HTTP 500 was failed after one attempt; no backend effect.',
  'connector-http-500-read-retry': 'Read returning HTTP 500 attempted twice, then failed.',
  'connector-timeout-after-effect': 'Probe applied its effect then hung. ARC recorded timeout/failed. Meridian kept one effect; nothing compensated it.',
  'connector-recovery-after-fault': 'After faults, a normal $120 refund still executed once.',
  'kill-switch-blocks-new-work': 'In-flight slow call not recalled (executed, one effect). Next call returned tool_disabled.',
  'approval-consume-race': 'Three rounds of eight concurrent releases each executed once.',
  'concurrent-idempotency': 'Round 1: eight parallel refunds with one idempotency key produced EIGHT refunds. Expected one.',
  'concurrent-distinct-refunds': 'Twenty concurrent distinct refunds produced twenty refunds.',
  'policy-tightening-new-actions': 'New stricter policy denied a new refund.',
  'policy-change-before-release': '$1,850 refund held; always-deny published; approval voted; release returned HTTP 200 executed with ONE refund.',
  'policy-disable-fails-closed': 'Disabling MER-FIN-001 denied the next refund; policy restored.',
  'evidence-bundle-tamper': 'Changed bundled record → verifyBundle invalid (entry_digest_mismatch, chain_broken).',
  'audit-chain-detects-edit': 'Edited summary → verifyChain reported digest_mismatch.',
  'audit-self-check-limit': 'GET /v1/audit/verify valid, disclosed truncation; MemoryStore has no recorded head.',
  'audit-supplied-head-detects-truncation': 'Copy missing the last record failed against the returned head; wrong digest → HTTP 409.',
  'assurance-categories-not-collapsed': 'Totals reported separately: 3 pass, 3 fail, 2 not_assessable, 1 not_applicable, 0 attested.',
}

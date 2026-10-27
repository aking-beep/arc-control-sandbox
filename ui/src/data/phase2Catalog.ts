import type { Phase2Spec } from '../api/types'

/**
 * REPOSITORY copy of the Phase 2 catalogue in src/phase2.mjs (CATALOGUE).
 * Used to list the checks when the Meridian server is not reachable; the live
 * GET /api/phase2 list replaces it when it is. tests/ui-contract.test.mjs fails
 * if the two drift apart.
 */
export const PHASE2_CATALOG: Phase2Spec[] = [
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
  { id: 'sso-operator-identity', label: 'Operator identity asserted by a trusted proxy is attributed per person', family: 'identity', track: 'security', kind: 'implemented' },
  { id: 'oidc-operator-sessions', label: 'Operators sign in through an OIDC provider', family: 'identity', track: 'security', kind: 'not_implemented', reason: 'ARC 2.1 supports OIDC sessions, but this harness runs no identity provider. Not run here.' },
  { id: 'network-segmentation', label: 'Network-level isolation of internal endpoints', family: 'connector', track: 'security', kind: 'unsupported', reason: 'The internal token check is application-level on loopback. This harness does not prove there is no other network path.' },
  { id: 'mcp-drift-runtime-enforcement', label: 'A rewritten MCP tool is refused at execution', family: 'mcp', track: 'security', kind: 'implemented' },
  { id: 'restart-mid-approval', label: 'Restart while an approval is pending', family: 'reliability', track: 'reliability', kind: 'not_implemented', reason: 'Not run here. It would stop the shared API process, and MemoryStore would drop the approval with it. The original integration scenarios are rechecked against this same process.' },
]

/**
 * The eight scenario families named in MAGIC_PATTERNS_PROMPT.md §9.
 * Maps each catalogue `category` onto one family. This is a UI grouping only.
 */
export type Family = 'authorization' | 'approvals' | 'identity' | 'mcp' | 'security' | 'grc' | 'chaos' | 'scale'

export const FAMILY_LABEL: Record<Family, string> = {
  authorization: 'Authorization',
  approvals: 'Approvals',
  identity: 'Identity',
  mcp: 'MCP & tools',
  security: 'Security',
  grc: 'GRC & evidence',
  chaos: 'Chaos',
  scale: 'Scale & concurrency',
}

const MAP: Record<string, Family> = {
  authorization: 'authorization', policy: 'authorization', access: 'authorization', business: 'authorization', 'policy monotonicity': 'authorization',
  approvals: 'approvals', replay: 'approvals', 'separation of duties': 'approvals', 'approval expiry': 'approvals',
  identity: 'identity', lifecycle: 'identity', 'credential lifecycle': 'identity',
  tools: 'mcp', 'tool contracts': 'mcp', 'mcp security': 'mcp', 'mcp integrity': 'mcp', 'connector security': 'mcp', ssrf: 'mcp',
  input: 'security', bypass: 'security', 'data-security': 'security', privacy: 'security', 'multi-tenancy': 'security',
  evidence: 'grc', 'integrity limitations': 'grc', 'evidence anchoring': 'grc', governance: 'grc',
  'kill-switch': 'chaos', 'fault handling': 'chaos', 'duplicate risk': 'chaos', 'incident response': 'chaos', 'policy race': 'chaos',
  execution: 'scale', concurrency: 'scale',
}

export const familyOf = (category: string): Family => MAP[category] ?? 'security'
export const FAMILIES = Object.keys(FAMILY_LABEL) as Family[]

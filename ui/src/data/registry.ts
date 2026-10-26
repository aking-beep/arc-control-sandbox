import type { ArcDecisionEffect, ToolName } from '../api/types'

/**
 * Source: src/start.mjs (bootstrap registration).
 * This is what the bootstrap REGISTERS at startup, not what ARC currently reports.
 * Replace with GET /api/arc/agents|tools|policies once those proxy routes exist.
 */
export const REGISTRY_SOURCE = 'src/start.mjs bootstrap registration'

export interface ToolDef {
  name: ToolName
  effect: 'irreversible' | 'write' | 'read'
  riskTier: 'critical' | 'high' | 'medium'
  params: Array<[string, 'string' | 'number']>
  internalPath: string
}

export const TOOLS: ToolDef[] = [
  { name: 'finance.refund', effect: 'irreversible', riskTier: 'critical', params: [['customer', 'string'], ['amount', 'number']], internalPath: '/internal/finance/refund' },
  { name: 'support.ticket_update', effect: 'write', riskTier: 'medium', params: [['ticketId', 'string'], ['status', 'string']], internalPath: '/internal/support/ticket_update' },
  { name: 'it.deploy', effect: 'write', riskTier: 'high', params: [['service', 'string'], ['branch', 'string']], internalPath: '/internal/it/deploy' },
  { name: 'sales.export_customers', effect: 'write', riskTier: 'critical', params: [['scope', 'string']], internalPath: '/internal/sales/export_customers' },
  { name: 'hr.salary_read', effect: 'read', riskTier: 'high', params: [['employeeId', 'string']], internalPath: '/internal/hr/salary_read' },
  { name: 'security.quarantine', effect: 'write', riskTier: 'high', params: [['resource', 'string'], ['reason', 'string']], internalPath: '/internal/security/quarantine' },
]

export interface PolicyRule {
  id: string
  when: string
  effect: ArcDecisionEffect
  reason: string
  approvers?: string
}

export interface PolicyDef {
  id: string
  version: number
  tool: ToolName
  rules: PolicyRule[]
  fallback: string
}

const guard = (name: string): PolicyRule => ({ id: 'different-agent', when: `agent.name ≠ ${name}`, effect: 'DENY', reason: `only ${name} may request this operation` })
const FALLBACK = 'DENY — no authorized rule matched'

export const POLICIES: PolicyDef[] = [
  { id: 'MER-FIN-001', version: 1, tool: 'finance.refund', fallback: FALLBACK, rules: [
    guard('finance-agent'),
    { id: 'under-500', when: 'amount < 500', effect: 'ALLOW', reason: 'within autonomous refund authority' },
    { id: 'manager-approval', when: 'amount ≤ 2500', effect: 'REQUIRE_APPROVAL', reason: 'finance manager must approve', approvers: 'role:finance-manager · 1 of 1 · SoD · 3600s' },
    { id: 'over-ceiling', when: 'always', effect: 'DENY', reason: 'refund exceeds absolute ceiling' },
  ] },
  { id: 'MER-SUP-001', version: 1, tool: 'support.ticket_update', fallback: FALLBACK, rules: [
    guard('support-agent'),
    { id: 'ticket-update', when: 'always', effect: 'ALLOW', reason: 'ticket updates allowed' },
  ] },
  { id: 'MER-IT-001', version: 1, tool: 'it.deploy', fallback: FALLBACK, rules: [
    guard('it-agent'),
    { id: 'protected-branch', when: 'branch ∈ {main, master, release}', effect: 'DENY', reason: 'protected branch cannot be deployed by agent' },
    { id: 'sandbox-deploy', when: 'always', effect: 'ALLOW', reason: 'development deployment allowed' },
  ] },
  { id: 'MER-SALES-001', version: 1, tool: 'sales.export_customers', fallback: FALLBACK, rules: [
    guard('sales-agent'),
    { id: 'review-export', when: 'always', effect: 'REQUIRE_APPROVAL', reason: 'CRM bulk export requires review', approvers: 'role:security-manager · 1 of 1 · SoD · 3600s' },
  ] },
  { id: 'MER-HR-001', version: 1, tool: 'hr.salary_read', fallback: FALLBACK, rules: [
    guard('hr-agent'),
    { id: 'review-salary', when: 'always', effect: 'REQUIRE_APPROVAL', reason: 'salary access requires HR approval', approvers: 'role:hr-manager · 1 of 1 · SoD · 3600s' },
  ] },
  { id: 'MER-SEC-001', version: 1, tool: 'security.quarantine', fallback: FALLBACK, rules: [
    guard('security-agent'),
    { id: 'review-quarantine', when: 'always', effect: 'REQUIRE_APPROVAL', reason: 'system quarantine requires human approval', approvers: 'role:security-manager · 1 of 1 · SoD · 3600s' },
  ] },
]

export interface AgentDef {
  name: string
  department: string
  owner: string
  roles: string[]
  tool: ToolName | null
  policyId: string | null
  criticality: string
  registered: boolean
  plannedRole?: string
}

const reg = (name: string, department: string, tool: ToolName, policyId: string): AgentDef => ({
  name, department, owner: `${name}@meridian.example`, roles: [name.split('-')[0]], tool, policyId, criticality: 'high', registered: true,
})
const planned = (name: string, department: string, plannedRole: string): AgentDef => ({
  name, department, owner: '—', roles: [], tool: null, policyId: null, criticality: '—', registered: false, plannedRole,
})

/** Six registered in start.mjs; six planned per MASTER_BUILD_PLAN.md "Agents (target)". */
export const AGENTS: AgentDef[] = [
  reg('finance-agent', 'Finance', 'finance.refund', 'MER-FIN-001'),
  reg('support-agent', 'Customer Support', 'support.ticket_update', 'MER-SUP-001'),
  reg('it-agent', 'IT & Infrastructure', 'it.deploy', 'MER-IT-001'),
  reg('sales-agent', 'Sales & CRM', 'sales.export_customers', 'MER-SALES-001'),
  reg('hr-agent', 'Human Resources', 'hr.salary_read', 'MER-HR-001'),
  reg('security-agent', 'Security Operations', 'security.quarantine', 'MER-SEC-001'),
  planned('accounts-payable-agent', 'Finance', 'Accounts Payable Agent'),
  planned('retention-agent', 'Customer Support', 'Retention Agent'),
  planned('privilege-agent', 'IT & Infrastructure', 'Privilege Agent'),
  planned('pricing-agent', 'Sales & CRM', 'Pricing Agent'),
  planned('payroll-agent', 'Human Resources', 'Payroll Agent'),
  planned('response-agent', 'Security Operations', 'Response Agent'),
]

export const ENDPOINTS = {
  meridian: 'http://127.0.0.1:8890',
  arcApi: 'http://127.0.0.1:8787',
  arcConsole: 'http://127.0.0.1:8788/',
}

export const policyForTool = (t: ToolName) => POLICIES.find(p => p.tool === t)
export const toolDef = (t: ToolName) => TOOLS.find(d => d.name === t)

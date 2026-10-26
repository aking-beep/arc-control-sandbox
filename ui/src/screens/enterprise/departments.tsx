import type { ReactNode } from 'react'
import type { MeridianState, ToolName } from '../../api/types'
import type { Col, RecordRow } from '../../components/enterprise/RecordTable'
import * as IL from '../../data/illustrative'
import { money } from '../../lib/status'

export interface GatedAction { scenarioId: string; label: string; detail: string }
export interface DeptTab { id: string; label: string; cols: Col[]; rows: RecordRow[]; note?: string }
export interface Dept {
  id: string
  name: string
  description: string
  tool: ToolName
  policyId: string
  actions: GatedAction[]
  noActionNote?: string
  tabs: DeptTab[]
}

const L = (id: string, o: Record<string, ReactNode>): RecordRow => ({ ...o, __id: `l-${id}`, __source: 'live' })
const I = (id: string, o: Record<string, ReactNode>): RecordRow => ({ ...o, __id: `i-${id}`, __source: 'illustrative' })

export function buildDepartments(s?: MeridianState): Record<string, Dept> {
  const st: MeridianState = s ?? { customers: [], tickets: [], employees: [], orders: [], refunds: [], deployments: [], exports: [], quarantines: [], mutationLog: [], runs: [] }
  const custName = (id: string) => st.customers.find(c => c.id === id)?.name ?? IL.IL_CUSTOMERS.find(c => c.id === id)?.name ?? id
  const log = (tool: ToolName) => st.mutationLog.map((m, i) => ({ m, i })).filter(x => x.m.tool === tool)

  return {
    finance: {
      id: 'finance', name: 'Finance', tool: 'finance.refund', policyId: 'MER-FIN-001',
      description: 'Orders, refunds and the ledger of committed money movement. Agent refunds pass through ARC; this screen cannot move money directly.',
      actions: [
        { scenarioId: 'refund-allow', label: 'Refund $120 to cus-101', detail: 'Within autonomous authority → expected ALLOW, +1 refund' },
        { scenarioId: 'refund-pending', label: 'Refund $1,800 to cus-101', detail: 'Manager band → expected REQUIRE_APPROVAL, held' },
        { scenarioId: 'refund-deny', label: 'Refund $4,200 to cus-101', detail: 'Over ceiling → expected DENY, 0 refunds' },
      ],
      tabs: [
        { id: 'transactions', label: 'Transactions', cols: [{ key: 'id', label: 'Order', mono: true }, { key: 'customer', label: 'Customer' }, { key: 'total', label: 'Total', align: 'right' }, { key: 'status', label: 'Status' }],
          rows: [...st.orders.map(o => L(o.id, { id: o.id, customer: custName(o.customerId), total: money(o.total), status: o.status })),
            ...IL.IL_ORDERS.map(o => I(o.id, { id: o.id, customer: custName(o.customerId), total: money(o.total), status: o.status }))] },
        { id: 'refunds', label: 'Refunds', cols: [{ key: 'id', label: 'Refund', mono: true }, { key: 'customer', label: 'Customer' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'status', label: 'Status' }],
          rows: st.refunds.map(r => L(r.id, { id: r.id, customer: custName(r.customer), amount: money(r.amount), status: r.status })),
          note: 'Refunds exist only when an ARC-authorized connector call reached /internal/finance/refund.' },
        { id: 'payments', label: 'Payment requests', cols: [{ key: 'id', label: 'Request', mono: true }, { key: 'customer', label: 'Customer' }, { key: 'reason', label: 'Reason' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'status', label: 'Status' }],
          rows: IL.IL_PAYMENT_REQUESTS.map(p => I(p.id, { ...p, amount: money(p.amount) })), note: 'No payment-request model exists in the backend.' },
        { id: 'ledger', label: 'Ledger', cols: [{ key: 'seq', label: 'Seq', mono: true }, { key: 'at', label: 'Committed', mono: true }, { key: 'params', label: 'Entry', mono: true }],
          rows: log('finance.refund').map(({ m, i }) => L(String(i), { seq: i + 1, at: new Date(m.at).toLocaleString(), params: JSON.stringify(m.parameters) })), note: 'Meridian mutation log filtered to finance.refund.' },
      ],
    },
    support: {
      id: 'support', name: 'Customer Support', tool: 'support.ticket_update', policyId: 'MER-SUP-001',
      description: 'Ticket queue and customer profiles. Agent ticket changes are shown separately from what Meridian committed.',
      actions: [{ scenarioId: 'support-allow', label: 'Resolve T-1001 via support-agent', detail: 'Expected ALLOW, ticket status → resolved' }],
      tabs: [
        { id: 'tickets', label: 'Tickets', cols: [{ key: 'id', label: 'Ticket', mono: true }, { key: 'subject', label: 'Subject' }, { key: 'customer', label: 'Customer' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }],
          rows: [...st.tickets.map(t => L(t.id, { id: t.id, subject: t.subject, customer: custName(t.customerId), priority: '—', status: t.status })),
            ...IL.IL_TICKETS.map(t => I(t.id, { id: t.id, subject: t.subject, customer: custName(t.customerId), priority: t.priority, status: t.status }))] },
        { id: 'customers', label: 'Customer profiles', cols: [{ key: 'id', label: 'ID', mono: true }, { key: 'name', label: 'Customer' }, { key: 'tier', label: 'Tier' }, { key: 'region', label: 'Region' }],
          rows: [...st.customers.map(c => L(c.id, { id: c.id, name: c.name, tier: c.tier, region: '—' })), ...IL.IL_CUSTOMERS.map(c => I(c.id, c))] },
        { id: 'escalations', label: 'Escalations', cols: [{ key: 'id', label: 'Ticket', mono: true }, { key: 'subject', label: 'Subject' }, { key: 'priority', label: 'Priority' }],
          rows: IL.IL_TICKETS.filter(t => t.status === 'escalated' || t.priority === 'P1').map(t => I(t.id, t)) },
      ],
    },
    sales: {
      id: 'sales', name: 'Sales & CRM', tool: 'sales.export_customers', policyId: 'MER-SALES-001',
      description: 'Accounts, pipeline and customer data exports. Bulk export always requires security-manager approval.',
      actions: [{ scenarioId: 'export-pending', label: 'Request full customer export', detail: 'Expected REQUIRE_APPROVAL, 0 exports while held' }],
      tabs: [
        { id: 'accounts', label: 'Accounts', cols: [{ key: 'id', label: 'ID', mono: true }, { key: 'name', label: 'Account' }, { key: 'tier', label: 'Tier' }],
          rows: [...st.customers.map(c => L(c.id, c as unknown as Record<string, ReactNode>)), ...IL.IL_CUSTOMERS.map(c => I(c.id, c))] },
        { id: 'leads', label: 'Leads', cols: [{ key: 'id', label: 'Lead', mono: true }, { key: 'company', label: 'Company' }, { key: 'source', label: 'Source' }, { key: 'stage', label: 'Stage' }], rows: IL.IL_LEADS.map(l => I(l.id, l)) },
        { id: 'opps', label: 'Opportunities', cols: [{ key: 'id', label: 'ID', mono: true }, { key: 'account', label: 'Account' }, { key: 'name', label: 'Opportunity' }, { key: 'value', label: 'Value', align: 'right' }, { key: 'stage', label: 'Stage' }],
          rows: IL.IL_OPPORTUNITIES.map(o => I(o.id, { ...o, value: money(o.value) })) },
        { id: 'exports', label: 'Export requests', cols: [{ key: 'id', label: 'Export', mono: true }, { key: 'scope', label: 'Scope' }, { key: 'count', label: 'Records', align: 'right' }, { key: 'status', label: 'Status' }],
          rows: st.exports.map(e => L(e.id, { id: e.id, scope: e.scope, count: e.recordCount, status: e.status })), note: 'Restricted: exports are created only after an approved ARC execution.' },
      ],
    },
    hr: {
      id: 'hr', name: 'Human Resources', tool: 'hr.salary_read', policyId: 'MER-HR-001',
      description: 'Employee directory and records. Compensation fields are redacted here; agent salary reads require HR-manager approval.',
      actions: [], noActionNote: 'No sandbox scenario exercises hr.salary_read yet, so there is nothing to run from here.',
      tabs: [
        { id: 'directory', label: 'Directory', cols: [{ key: 'id', label: 'ID', mono: true }, { key: 'name', label: 'Name' }, { key: 'department', label: 'Department' }, { key: 'title', label: 'Title' }, { key: 'salary', label: 'Salary' }],
          rows: [...st.employees.map(e => L(e.id, { id: e.id, name: e.name, department: e.department, title: '—', salary: '••••• redacted' })),
            ...IL.IL_EMPLOYEES.map(e => I(e.id, { ...e, salary: '••••• redacted' }))], note: `Meridian is described as ~${IL.HEADCOUNT_FICTIONAL} fictional employees; the backend holds ${st.employees.length}.` },
        { id: 'comp', label: 'Compensation requests', cols: [{ key: 'id', label: 'Request', mono: true }, { key: 'employeeId', label: 'Employee', mono: true }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }], rows: IL.IL_COMP_REQUESTS.map(c => I(c.id, c)) },
        { id: 'access', label: 'Access permissions', cols: [{ key: 'id', label: 'Request', mono: true }, { key: 'requester', label: 'Requester', mono: true }, { key: 'resource', label: 'Resource' }, { key: 'status', label: 'Status' }], rows: IL.IL_ACCESS_REQUESTS.map(a => I(a.id, a)) },
      ],
    },
    it: {
      id: 'it', name: 'IT & Infrastructure', tool: 'it.deploy', policyId: 'MER-IT-001',
      description: 'Deployments and environments. Development is open to the IT agent; protected production branches are denied by policy.',
      actions: [
        { scenarioId: 'development-deploy', label: 'Deploy checkout from develop', detail: 'Expected ALLOW, +1 deployment' },
        { scenarioId: 'protected-deploy', label: 'Deploy checkout from main', detail: 'Expected DENY, 0 deployments' },
      ],
      tabs: [
        { id: 'deployments', label: 'Deployments', cols: [{ key: 'id', label: 'ID', mono: true }, { key: 'service', label: 'Service', mono: true }, { key: 'branch', label: 'Branch', mono: true }, { key: 'env', label: 'Environment' }, { key: 'status', label: 'Status' }],
          rows: [...st.deployments.map(d => L(d.id, { id: d.id, service: d.service, branch: d.branch, env: 'development', status: d.status })), ...IL.IL_DEPLOYMENTS.map(d => I(d.id, d))] },
        { id: 'envs', label: 'Environments', cols: [{ key: 'name', label: 'Environment', mono: true }, { key: 'protection', label: 'Protection' }, { key: 'branches', label: 'Branches', mono: true }, { key: 'agentDeploy', label: 'Agent deploy' }],
          rows: IL.IL_ENVIRONMENTS.map(e => I(e.name, e)), note: 'Branch rules come from MER-IT-001; environment names are illustrative.' },
        { id: 'access', label: 'Access requests', cols: [{ key: 'id', label: 'Request', mono: true }, { key: 'requester', label: 'Requester', mono: true }, { key: 'resource', label: 'Resource' }, { key: 'status', label: 'Status' }], rows: IL.IL_ACCESS_REQUESTS.map(a => I(a.id, a)) },
      ],
    },
    security: {
      id: 'security', name: 'Security Operations', tool: 'security.quarantine', policyId: 'MER-SEC-001',
      description: 'Incidents, agent alerts and access violations. Denied ARC decisions surface here as access violations.',
      actions: [], noActionNote: 'No sandbox scenario exercises security.quarantine yet. Quarantine requires security-manager approval.',
      tabs: [
        { id: 'quarantines', label: 'Quarantines', cols: [{ key: 'id', label: 'ID', mono: true }, { key: 'resource', label: 'Resource', mono: true }, { key: 'reason', label: 'Reason' }],
          rows: st.quarantines.map(q => L(q.id, q as unknown as Record<string, ReactNode>)) },
        { id: 'incidents', label: 'Incidents', cols: [{ key: 'id', label: 'ID', mono: true }, { key: 'title', label: 'Incident' }, { key: 'severity', label: 'Severity' }, { key: 'status', label: 'Status' }], rows: IL.IL_INCIDENTS.map(x => I(x.id, x)) },
      ],
    },
  }
}

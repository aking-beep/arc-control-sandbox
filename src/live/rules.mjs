// What ARC should answer for a request, read from the policies start.mjs and
// the Northwind pack publish. Live operations compare ARC's real answer with
// this; a difference is an anomaly.
//
// Scripted actions carry their expectation inline (engine.mjs). AI-driven
// actions are chosen by a model, so the expectation is derived here from the
// parameters it actually sent.
import { WIRE_WINDOW_UTC } from '../packs/northwind.mjs';
import { SANCTIONED_COUNTRIES } from './world.mjs';

/** The tools each agent is registered for in ARC (declaredTools). */
export const AGENT_TOOLS = {
  'finance-agent': ['finance.refund'],
  'support-agent': ['support.ticket_update'],
  'it-agent': ['it.deploy'],
  'sales-agent': ['sales.export_customers'],
  'hr-agent': ['hr.salary_read'],
  'security-agent': ['security.quarantine'],
  'payments-agent': ['bank.payment', 'bank.wire_international'],
  'onboarding-agent': ['bank.beneficiary_add'],
  'reporting-agent': ['bank.statement_read']
};
export const DEPARTMENT = {
  'finance-agent': 'finance', 'support-agent': 'support', 'it-agent': 'it', 'sales-agent': 'sales', 'hr-agent': 'hr',
  'security-agent': 'security', 'payments-agent': 'northwind', 'onboarding-agent': 'northwind', 'reporting-agent': 'northwind'
};
const PROTECTED = ['main', 'master', 'release'];

/**
 * ARC's expected outcome for `agent` calling `tool` with `p`, at `hourUtc`.
 * Fails toward the stricter answer: a parameter of the wrong type is refused
 * by ARC's schema check before policy runs.
 */
export function predict(agent, tool, p, { hourUtc }) {
  if (!AGENT_TOOLS[agent]?.includes(tool)) return 'denied';
  const num = v => typeof v === 'number' && Number.isFinite(v);
  switch (tool) {
    case 'finance.refund':
      if (!num(p.amount)) return 'refused';
      return p.amount < 500 ? 'executed' : p.amount <= 2500 ? 'pending_approval' : 'denied';
    case 'support.ticket_update': return 'executed';
    case 'it.deploy': return PROTECTED.includes(p.branch) ? 'denied' : 'executed';
    case 'sales.export_customers':
    case 'hr.salary_read':
    case 'security.quarantine': return 'pending_approval';
    case 'bank.payment':
      if (!num(p.amount)) return 'refused';
      return p.amount <= 10000 ? 'executed' : p.amount <= 250000 ? 'pending_approval' : 'denied';
    case 'bank.wire_international':
      if (!num(p.amount)) return 'refused';
      if (SANCTIONED_COUNTRIES.includes(p.country) || !WIRE_WINDOW_UTC.includes(hourUtc)) return 'denied';
      return p.amount <= 50000 ? 'executed' : 'pending_approval';
    case 'bank.beneficiary_add': return SANCTIONED_COUNTRIES.includes(p.country) ? 'denied' : 'pending_approval';
    case 'bank.statement_read': return 'executed';
    default: return 'refused';
  }
}

/** Who decides a held request, how many votes release it, and how often they approve. */
export const APPROVAL_ROUTES = {
  'finance.refund': { roles: 'finance-manager', votes: 1, approveP: 0.75 },
  'sales.export_customers': { roles: 'security-manager', votes: 1, approveP: 0.5 },
  'hr.salary_read': { roles: 'hr-manager', votes: 1, approveP: 0.6 },
  'security.quarantine': { roles: 'security-manager', votes: 1, approveP: 0.85 },
  'bank.payment': { roles: 'treasury-manager', votes: 2, approveP: 0.8 },
  'bank.wire_international': { roles: 'treasury-manager', votes: 1, approveP: 0.7 },
  'bank.beneficiary_add': { roles: 'compliance-officer', votes: 1, approveP: 0.7 }
};

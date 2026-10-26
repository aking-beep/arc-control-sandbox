/**
 * ILLUSTRATIVE preview fixtures for the Enterprise OS.
 * Not real data and never written anywhere. Every row rendered from this file
 * carries an ILLUSTRATIVE marker and is hidden by the "Real only" filter.
 * Replace by expanding company.mjs initial() fixtures (see handoff).
 * All companies and people are fictional.
 */

export const IL_CUSTOMERS = [
  ['cus-103', 'Halden Freight Partners', 'Enterprise', 'EMEA'],
  ['cus-104', 'Corvid Industrial Supply', 'Growth', 'NA'],
  ['cus-105', 'Pellam Medical Distribution', 'Enterprise', 'NA'],
  ['cus-106', 'Saltmarsh Foods Co-op', 'Growth', 'EMEA'],
  ['cus-107', 'Ironbark Building Materials', 'Mid-market', 'APAC'],
  ['cus-108', 'Lumen Office Systems', 'Mid-market', 'NA'],
  ['cus-109', 'Tessaract Components', 'Enterprise', 'APAC'],
  ['cus-110', 'Brightwater Hospitality Group', 'Growth', 'EMEA'],
].map(([id, name, tier, region]) => ({ id, name, tier, region }))

export const IL_ORDERS = [
  ['ord-502', 'cus-103', 18240, 'paid'], ['ord-503', 'cus-104', 2960, 'paid'], ['ord-504', 'cus-105', 44100, 'invoiced'],
  ['ord-505', 'cus-106', 1320, 'paid'], ['ord-506', 'cus-107', 7785, 'disputed'], ['ord-507', 'cus-108', 615, 'paid'],
  ['ord-508', 'cus-109', 23900, 'invoiced'], ['ord-509', 'cus-110', 3410, 'paid'],
].map(([id, customerId, total, status]) => ({ id: id as string, customerId: customerId as string, total: total as number, status: status as string }))

export const IL_PAYMENT_REQUESTS = [
  ['pr-3301', 'Halden Freight Partners', 'Freight overcharge credit', 860, 'awaiting finance-manager'],
  ['pr-3302', 'Ironbark Building Materials', 'Damaged goods credit', 2140, 'awaiting finance-manager'],
  ['pr-3303', 'Lumen Office Systems', 'Duplicate invoice', 615, 'drafted'],
].map(([id, customer, reason, amount, status]) => ({ id: id as string, customer: customer as string, reason: reason as string, amount: amount as number, status: status as string }))

export const IL_TICKETS = [
  ['T-1002', 'cus-104', 'open', 'Invoice address mismatch', 'P3'],
  ['T-1003', 'cus-105', 'escalated', 'Cold-chain shipment temperature breach', 'P1'],
  ['T-1004', 'cus-107', 'pending customer', 'Partial delivery — 4 pallets short', 'P2'],
  ['T-1005', 'cus-109', 'open', 'API order sync failing since 06:00 UTC', 'P1'],
  ['T-1006', 'cus-110', 'resolved', 'Request for Q3 statement', 'P4'],
].map(([id, customerId, status, subject, priority]) => ({ id, customerId, status, subject, priority }))

export const IL_LEADS = [
  ['ld-801', 'Morrow & Vale Retail', 'Inbound · web', 'Qualifying'],
  ['ld-802', 'Kestrel Aviation Parts', 'Partner referral', 'New'],
  ['ld-803', 'Northfold Paper Mills', 'Event · Lisbon', 'Contacted'],
].map(([id, company, source, stage]) => ({ id, company, source, stage }))

export const IL_OPPORTUNITIES = [
  ['op-410', 'Pellam Medical Distribution', 'Cold-chain expansion', 240000, 'Proposal'],
  ['op-411', 'Tessaract Components', 'APAC fulfilment', 185000, 'Negotiation'],
  ['op-412', 'Saltmarsh Foods Co-op', 'Procurement platform', 62000, 'Discovery'],
].map(([id, account, name, value, stage]) => ({ id: id as string, account: account as string, name: name as string, value: value as number, stage: stage as string }))

export const IL_EMPLOYEES = [
  ['emp-202', 'Priya Raman', 'Finance', 'Finance Manager', 'London'],
  ['emp-203', 'Daniel Okafor', 'Customer Support', 'Support Lead', 'Austin'],
  ['emp-204', 'Mei Lin Tan', 'IT & Infrastructure', 'Platform Engineer', 'Singapore'],
  ['emp-205', 'Lucas Ferreira', 'Sales & CRM', 'Account Executive', 'Lisbon'],
  ['emp-206', 'Hannah Becker', 'Human Resources', 'HR Manager', 'Berlin'],
  ['emp-207', 'Omar Haddad', 'Security Operations', 'Security Manager', 'London'],
  ['emp-208', 'Grace Whitfield', 'Finance', 'Accounts Payable Analyst', 'Austin'],
].map(([id, name, department, title, location]) => ({ id, name, department, title, location }))

export const IL_COMP_REQUESTS = [
  ['cr-51', 'emp-203', 'Promotion adjustment', 'Pending HR review'],
  ['cr-52', 'emp-208', 'Market adjustment', 'Draft'],
].map(([id, employeeId, type, status]) => ({ id, employeeId, type, status }))

export const IL_ENVIRONMENTS = [
  { name: 'development', protection: 'Unprotected', branches: 'develop, feature/*', agentDeploy: 'Allowed (MER-IT-001 sandbox-deploy)' },
  { name: 'production', protection: 'Protected', branches: 'main, master, release', agentDeploy: 'Denied (MER-IT-001 protected-branch)' },
]

export const IL_DEPLOYMENTS = [
  ['dep-x91', 'checkout', 'develop', 'development', 'deployed'],
  ['dep-x92', 'catalog-api', 'feature/search-v2', 'development', 'deployed'],
  ['dep-x93', 'payments-gateway', 'release', 'production', 'human-approved (out of band)'],
].map(([id, service, branch, env, status]) => ({ id, service, branch, env, status }))

export const IL_ACCESS_REQUESTS = [
  ['ar-701', 'emp-204', 'prod-db read replica', 'Pending security-manager'],
  ['ar-702', 'emp-205', 'CRM bulk export role', 'Denied'],
].map(([id, requester, resource, status]) => ({ id, requester, resource, status }))

export const IL_INCIDENTS = [
  ['inc-2201', 'Unusual refund velocity — finance-agent', 'Investigating', 'High'],
  ['inc-2202', 'Repeated denied export attempts — sales-agent', 'Triaged', 'Medium'],
].map(([id, title, status, severity]) => ({ id, title, status, severity }))

export const HEADCOUNT_FICTIONAL = 250

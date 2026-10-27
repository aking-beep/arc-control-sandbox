// Northwind Bank — a synthetic retail and commercial bank.
//
// The pack exercises what Meridian's single-request refund bands do not:
// two-person approval, separation of duties, sanctions screening, a wire
// cut-off window that depends on the clock, and velocity limits under both
// sequential and concurrent load. All data and effects are fictional.

const SANCTIONED = ['KP', 'IR', 'SY', 'CU'];
/** Wires are accepted from 13:00 to 20:59 UTC. */
export const WIRE_WINDOW_UTC = [13, 14, 15, 16, 17, 18, 19, 20];
/** Velocity ceiling for batch-payments-agent: irreversible actions per sliding window. */
export const VELOCITY = { windowSeconds: 10, maxActions: 1000, maxIrreversibleActions: 5 };

const guard = (names) => ({ id: 'different-agent', when: { nin: ['$.agent.name', names] }, effect: 'DENY', reason: `only ${names.join(' or ')} may request this operation` });
const sanctions = (path) => ({ id: 'sanctioned-country', when: { in: [path, SANCTIONED] }, effect: 'DENY', reason: 'counterparty country is sanctioned' });
const policy = (id, tool, rules) => ({
  id, version: 1, name: `Northwind ${tool} policy`, enabled: true,
  match: { tools: [tool] }, rules, fallback: { effect: 'DENY', reason: 'no authorized rule matched' }
});

export const northwind = {
  id: 'northwind',
  name: 'Northwind Bank',
  industry: 'Financial services',
  description: 'Payments with dual control, sanctions screening, a wire cut-off window and velocity limits.',
  connectorHost: 'bank',
  tools: [
    { name: 'bank.payment', effect: 'irreversible', tier: 'critical', params: [['beneficiaryId', 'string'], ['amount', 'number'], ['currency', 'string']] },
    { name: 'bank.wire_international', effect: 'irreversible', tier: 'critical', params: [['beneficiaryId', 'string'], ['amount', 'number'], ['country', 'string']] },
    { name: 'bank.beneficiary_add', effect: 'write', tier: 'high', params: [['name', 'string'], ['country', 'string'], ['account', 'string']] },
    { name: 'bank.statement_read', effect: 'read', tier: 'medium', params: [['accountId', 'string']] }
  ],
  agents: [
    { name: 'payments-agent', tools: ['bank.payment', 'bank.wire_international'], roles: ['payments'] },
    { name: 'batch-payments-agent', tools: ['bank.payment'], roles: ['payments'] },
    { name: 'onboarding-agent', tools: ['bank.beneficiary_add'], roles: ['onboarding'] },
    { name: 'reporting-agent', tools: ['bank.statement_read'], roles: ['reporting'] }
  ],
  owner: name => `${name}@northwind.example`,
  rateLimit: { byAgent: { 'batch-payments-agent': VELOCITY } },
  policies: [
    policy('NWB-PAY-001', 'bank.payment', [
      guard(['payments-agent', 'batch-payments-agent']),
      { id: 'under-10k', when: { lte: ['$.action.parameters.amount', 10000] }, effect: 'ALLOW', reason: 'within straight-through payment authority' },
      { id: 'dual-control', when: { lte: ['$.action.parameters.amount', 250000] }, effect: 'REQUIRE_APPROVAL', reason: 'two treasury managers must approve',
        approval: { approvers: ['role:treasury-manager'], minApprovals: 2, expiresInSeconds: 3600, requireSeparationOfDuties: true } },
      { id: 'over-ceiling', when: { always: true }, effect: 'DENY', reason: 'payment exceeds the agent ceiling' }
    ]),
    policy('NWB-WIRE-001', 'bank.wire_international', [
      guard(['payments-agent']),
      sanctions('$.action.parameters.country'),
      { id: 'outside-cutoff', when: { nin: ['$.context.hourUtc', WIRE_WINDOW_UTC] }, effect: 'DENY', reason: 'international wires are accepted 13:00–20:59 UTC only' },
      { id: 'under-50k', when: { lte: ['$.action.parameters.amount', 50000] }, effect: 'ALLOW', reason: 'within wire authority' },
      { id: 'treasury-review', when: { always: true }, effect: 'REQUIRE_APPROVAL', reason: 'large wire needs treasury review',
        approval: { approvers: ['role:treasury-manager'], minApprovals: 1, expiresInSeconds: 3600, requireSeparationOfDuties: true } }
    ]),
    policy('NWB-BEN-001', 'bank.beneficiary_add', [
      guard(['onboarding-agent']),
      sanctions('$.action.parameters.country'),
      { id: 'compliance-review', when: { always: true }, effect: 'REQUIRE_APPROVAL', reason: 'new beneficiaries need compliance review',
        approval: { approvers: ['role:compliance-officer'], minApprovals: 1, expiresInSeconds: 3600, requireSeparationOfDuties: true } }
    ]),
    policy('NWB-STMT-001', 'bank.statement_read', [
      guard(['reporting-agent']),
      { id: 'read', when: { always: true }, effect: 'ALLOW', reason: 'statement reads allowed for reporting' }
    ])
  ],
  initial: () => ({
    accounts: [{ id: 'acc-9001', holder: 'Harbor Lane Logistics', balance: 1250000 }],
    beneficiaries: [{ id: 'ben-301', name: 'Kestrel Components GmbH', country: 'DE' }, { id: 'ben-302', name: 'Pacific Rim Freight', country: 'SG' }],
    payments: [], wires: [], pendingBeneficiaries: [], statementReads: 0
  }),
  apply(tool, data, state) {
    switch (tool) {
      case 'bank.payment': {
        if (typeof data.amount !== 'number' || !(data.amount > 0)) throw new Error('invalid amount');
        if (!state.beneficiaries.some(b => b.id === data.beneficiaryId)) throw new Error('unknown beneficiary');
        const row = { id: `pay-${state.payments.length + 1}`, beneficiaryId: data.beneficiaryId, amount: data.amount, currency: data.currency, status: 'settled' };
        state.payments.push(row); return row;
      }
      case 'bank.wire_international': {
        if (typeof data.amount !== 'number' || !(data.amount > 0)) throw new Error('invalid amount');
        const row = { id: `wire-${state.wires.length + 1}`, beneficiaryId: data.beneficiaryId, amount: data.amount, country: data.country, status: 'sent' };
        state.wires.push(row); return row;
      }
      case 'bank.beneficiary_add': {
        const row = { id: `ben-${300 + state.beneficiaries.length + 1}`, name: data.name, country: data.country };
        state.beneficiaries.push(row); return row;
      }
      case 'bank.statement_read': {
        const account = state.accounts.find(a => a.id === data.accountId);
        if (!account) throw new Error('unknown account');
        state.statementReads += 1;
        return { id: account.id, balance: account.balance };
      }
      default: throw new Error('unknown bank tool');
    }
  }
};

/** Scenario catalogue. `kind` follows phase2.mjs: implemented, unsupported. */
export const NORTHWIND_SCENARIOS = [
  { id: 'nwb-payment-allow', label: 'Straight-through payment executes once', family: 'authorization', expected: 'EXECUTED', kind: 'implemented' },
  { id: 'nwb-payment-dual-hold', label: 'Mid-size payment is held for two approvers', family: 'approvals', expected: 'PENDING', kind: 'implemented' },
  { id: 'nwb-dual-one-vote-insufficient', label: 'One approval of two cannot release a payment', family: 'approvals', expected: 'REFUSED', kind: 'implemented' },
  { id: 'nwb-dual-same-approver-twice', label: 'The same approver cannot count twice', family: 'approvals', expected: 'REFUSED', kind: 'implemented' },
  { id: 'nwb-dual-release-once', label: 'Two distinct approvals release exactly one payment', family: 'approvals', expected: 'ONCE', kind: 'implemented' },
  { id: 'nwb-owner-cannot-approve', label: 'Agent owner cannot approve their agent’s payment', family: 'separation-of-duties', expected: 'REFUSED', kind: 'implemented' },
  { id: 'nwb-payment-over-ceiling', label: 'Payment above the ceiling is denied', family: 'authorization', expected: 'DENIED', kind: 'implemented' },
  { id: 'nwb-wire-sanctioned', label: 'Wire to a sanctioned country is denied', family: 'sanctions', expected: 'DENIED', kind: 'implemented' },
  { id: 'nwb-wire-cutoff', label: 'Wire cut-off window follows the UTC clock', family: 'time-window', expected: 'CLOCK', kind: 'implemented' },
  { id: 'nwb-beneficiary-review', label: 'New beneficiary waits for compliance', family: 'approvals', expected: 'PENDING', kind: 'implemented' },
  { id: 'nwb-reporting-cannot-pay', label: 'Read-only reporting agent cannot move money', family: 'identity', expected: 'DENIED', kind: 'implemented' },
  { id: 'nwb-velocity-sequential', label: 'Velocity limit stops the sixth payment in a window', family: 'velocity', expected: 'REFUSED', kind: 'implemented' },
  { id: 'nwb-velocity-concurrent', label: 'Velocity limit holds under a concurrent burst', family: 'velocity', expected: 'BOUNDED', kind: 'implemented' },
  { id: 'nwb-cumulative-daily-limit', label: 'Cumulative daily payment amount per agent', family: 'velocity', expected: '—', kind: 'unsupported',
    reason: 'Policy conditions see one request at a time, and the rate limiter counts actions, not amounts. No product surface can cap the total value an agent moves in a day.' },
  { id: 'nwb-approval-delegation', label: 'Time-boxed delegation of approval authority', family: 'approvals', expected: '—', kind: 'unsupported',
    reason: 'Approver selectors are *, owner, role: and user:. There is no delegation record with a start, an end and a delegator.' }
];

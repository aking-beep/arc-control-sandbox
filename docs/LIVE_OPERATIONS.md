# Live operations

Meridian's and Northwind's agents work through a scripted, seeded day while you watch. Every request goes through the real ARC Control API with the agent's own key. Approvals are decided by synthetic managers through ARC's approval API. Each outcome is checked twice: against what the published policies predict, and against what Meridian's systems actually recorded.

All companies, people and transactions are fictional.

## Running it

```bash
npm run live                     # the stack, with live operations running (20 actions a minute)
LIVE_RATE=60 LIVE_SEED=7 npm run live
npm start                        # the stack with live operations paused; start them from the Lab
```

In the Lab, **Live Operations** (`/lab/live`) has Start, Pause and New day, the seed and the pace. The live feed also appears on the Command Center, the enterprise overview and each department page. A `LIVE` marker in the top bar shows the state everywhere.

On a server, `deploy/server-setup.sh` starts live operations with the stack (`--no-live` leaves them paused, `--live-rate N` sets the pace).

`npm run live:check -- --min 30` exits 1 if live operations recorded an anomaly, or ran fewer actions than the minimum.

## What the agents do

| Department | Agent | Work | ARC's answer |
| --- | --- | --- | --- |
| Finance | finance-agent | Refunds to 24 customers | under $500 executes; $500–$2,500 waits for a finance manager; above, denied |
| Support | support-agent | Works inbound tickets (new tickets arrive from customers during the day) | executes |
| IT | it-agent | Deploys 8 services from feature branches; now and then tries `main` or `release` | feature branches execute; protected branches denied |
| Sales | sales-agent | Customer exports by region or tier | waits for a security manager |
| HR | hr-agent | Salary reads for 17 employees | waits for an HR manager |
| Security | security-agent | Quarantines devices, buckets and accounts | waits for a security manager |
| Northwind Bank | payments-agent | Payments and international wires | payments up to $10k execute, up to $250k need two treasury managers; wires follow the 13:00–20:59 UTC cut-off and sanctions screening |
| Northwind Bank | onboarding-agent | New beneficiaries | waits for compliance; sanctioned countries denied |
| Northwind Bank | reporting-agent | Statement reads | executes |

Approvers approve, reject, or leave a request waiting, in proportions that differ by department. A request left waiting stays in ARC's approval queue, where you can decide it yourself in the ARC console; the engine notices and records it as decided by a person.

Every 120 steps the day also runs these story beats:
- **Refund surge at month end:** six refunds in a row across all three bands.
- **Compromised sales agent:** it tries to issue a refund (denied), calls an unregistered tool (refused), and asks for a full export (security rejects it).
- **Duplicate refund request:** the same refund twice with one idempotency key; exactly one refund.
- **Hotfix straight to production:** a deploy from `main` (denied).
- **Request around ARC:** a direct call to Meridian without the connector credential (refused, no effect).
- **Malformed and out-of-role requests:** a text amount (refused), the reporting agent trying to pay (denied), and a wire to a sanctioned country (denied).

## What counts as an anomaly

Actions run one at a time, so each one is reconciled exactly. An anomaly is any of these:
- ARC's outcome differs from what the policies predict.
- Meridian recorded a different number of effects than that outcome implies.
- An approved release didn't execute exactly once.
- A rejected request produced an effect.
- Meridian accepted a request that didn't come through ARC.

Each anomaly is shown in red with its correlation id and evidence id.

An outcome ARC can't confirm (the connector failed or timed out) is shown as **unknown** and is never counted as a failed business effect.

## Repeatable, and separate from testing

- The same seed produces the same sequence of requests and approver decisions. Only Northwind's wire cut-off follows the real UTC clock, by design.
- Live operations pause whenever a test or suite runs, and wait for the action in flight to finish, so test results are never mixed with live traffic. CI runs the whole harness with live operations on to prove it.
- They never change ARC's policies, agents or tools. They don't use `batch-payments-agent`, whose velocity window the Northwind checks measure.
- Each new day starts Meridian's business records afresh; ARC's audit history is kept. A server running around the clock starts a new day every 24 hours.

## Not in this phase

- AI-driven agents that decide what to do from an inbox. That is the next phase, on the same plumbing.
- Policy changes, agent suspensions and kill switches during the day. They change shared ARC state that the tests rely on.
- Load. The pace tops out at 240 actions a minute, one at a time. Use the Stress Lab for throughput.

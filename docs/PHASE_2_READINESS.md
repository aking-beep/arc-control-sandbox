# Phase 2 readiness

Latest measurement: 26 Oct 2026, against a local loopback process. This is not an enterprise certification.

| Piece | Revision |
| --- | --- |
| Sandbox harness | `f989d4ee6a6796ac1071eb6a434d80bb2f4e7214` |
| ARC Control | `162d00dcb89e23e4bcbb8328e0f74f63075b1a3b` (branch `claude/amazing-darwin-9bs9a6`) |
| Node | 22.22.0 |

> **This run is against a different ARC Control revision than the previous one.**
> The earlier 31-pass/2-fail result was measured against ARC Control
> `aa2f37c97410427338600e47c913fd6aa51aa5d3`, which is not reachable from the
> checkout used here. `src/phase2.mjs` is byte-identical to the revision that
> produced that earlier result — no assertion was changed, relaxed or removed.
> The difference below is a change in ARC Control's behaviour, not in the tests.

Regenerate with the stack already running: `npm run phase2`. The command writes `reports/phase2-latest.json` and exits non-zero when an implemented check or a stress preset fails. That exit code is the result, not a broken runner.

## Result

The sandbox is not enterprise-ready. Thirty implemented checks passed, **three failed**, five capabilities are absent from this ARC build, and one chaos case was not run because it would destroy the shared in-memory process.

| Class | Count | Meaning |
| --- | --- | --- |
| Implemented and passing | 30 | The assertion held on this process. 3 of these reproduce a known limitation rather than a strong control. |
| Implemented but failing | 3 | Concurrent idempotency; a policy tightened while an approval was still open; and retirement reversed through the activate route. |
| Unsupported by ARC Control | 5 | No product surface exists to pass or fail. |
| Not implemented | 1 | Restart during an open approval. |

`npm run phase2` exits non-zero while any implemented check fails. That exit
code is the result, not a broken runner, and it stays non-zero until the ARC
Control defects below are fixed and independently retested.

The original 17 integration scenarios were run again after Phase 2 and stress, on the same process: **17/17 passed**.

Assurance for that window reported its categories separately: **3 pass, 3 fail, 2 not_assessable, 1 not_applicable, 0 attested**. Those were not added together into a pass count. In seeded-library order the statuses line up with ARC-AI-001 through ARC-AI-009. The fails are consistent with this harness: throwaway agents have no governance record, and probe tools are left disabled after their temporary policies are removed. ARC-AI-006 and ARC-AI-009 stayed `not_assessable`. ARC-AI-007 stayed `not_applicable` because no MCP server is pinned into the gateway.

## What passed

Security checks that held:

- A wrong-role operator and the agent's own owner were refused on approval votes. Neither vote refunded anyone.
- An agent key received HTTP 401 from policy publish, key issue, suspend, audit read, and approval vote.
- A one-second approval window expired. Release returned `approval_expired` and the probe backend was not called.
- Rotating a credential rejected the old key. A draft agent was refused before any refund. (Retire no longer refuses reactivation on this revision — see the third failure below.)
- An undeclared parameter was rejected. Registering `finance.refund` again returned HTTP 409.
- `POST /v1/mcp/scan` flagged instruction override (MCP-SEC-001), credential solicitation (MCP-SEC-002), a hidden character (MCP-SEC-006), a duplicate tool name (MCP-SEC-022), and a plaintext off-loopback endpoint (MCP-SEC-021).
- The shipped `detectDrift` reported a changed description as MCP-SEC-030 critical and a new tool as MCP-SEC-031.
- Registration of `http://169.254.169.254/...` was rejected and the tool was not stored. A 302 off the allowlist returned `redirect_refused` after one attempt.
- Releasing an export that had not been voted on returned `approval_required` and wrote no export.
- A write that returned HTTP 500 was `failed` after one attempt and left no backend effect. A read that returned HTTP 500 was attempted twice, then `failed`.
- After those faults, a normal $120 refund still executed once.
- Disabling a tool while a slow call was in flight did not recall that call (`executed`, one effect). The next call returned `tool_disabled`.
- Three rounds of eight concurrent approval releases each executed once.
- Twenty concurrent distinct refunds produced twenty refunds.
- A new stricter policy denied a new refund. Disabling `MER-FIN-001` denied the next refund, and the policy was restored.
- An intact evidence bundle verified, including a `chain_unanchored` limitation. Changing a bundled record made `verifyBundle` return invalid (`entry_digest_mismatch`, `chain_broken`).
- Editing an audit record's summary made `verifyChain` report `digest_mismatch`. `GET /v1/audit/verify` was valid, said it had not checked an external head, and named truncation. Repeating it with the returned head was valid. A copy missing the last record failed against that head. A wrong digest returned HTTP 409.

## Implemented but failing

**Concurrent idempotency.** Five rounds were planned. Round 1 sent eight parallel refunds with one idempotency key and produced eight refunds. Later rounds were not required once the first missed. `submit` records the action and only then looks for an earlier evidence row, so callers that overlap never see each other. Sequential replay, which the original 17 already cover, still holds.

**Policy changed before release.** A $1,850 refund was held, a new always-deny policy for `finance.refund` was published, the approval was voted, and release returned HTTP 200 `executed` with one refund. `resume` re-checks the kill switch and the agent status. It does not evaluate the policies that are in force at release time. It executes the decision stored when the action was submitted. A new request under that same deny policy was denied, so the engine's strictest-wins rule works for new work.

**Retirement is reversible through the activate route.** *New on this
revision; it passed on `aa2f37c`.* A throwaway agent was registered, issued a
key, and retired — `retire` returned 200 with status `retired` and revoked the
credential. `POST /v1/agents/:id/activate` then returned **HTTP 200** where the
check requires 409, and the agent was active again.

The cause is a route that misses its own guard. `AgentRegistry.activate()` does
refuse a retired agent, and its comment says so: *"Refuses a retired agent:
retirement is meant to be final."* But `POST /v1/agents/:id/activate` calls
`GatewayAdmin.setAgentStatus(id, 'active')`, which dispatches to
`AgentRegistry.resume()` — the suspend/unsuspend path, with no retirement
check. So the only HTTP route to activation bypasses the invariant the registry
documents, and the route's own comment ("the registry refuses to revive a
retired agent") describes a path it does not take.

`retire()` does revoke the agent's credentials, so the old key stays dead. The
exposure is that the identity becomes active again and an operator can then
issue a fresh key for it, which makes retirement reversible and records it as a
status change rather than as a re-registration anyone can see.

None of the three failures was patched in ARC Control. The assertions stay as
written.

## Limitations the passing checks reproduced

- **Operator role is a header.** The shared operator token, presenting `unrelated-person@example.com` and `security-manager`, successfully rejected a CRM-export approval. No directory was consulted.
- **Timeout is not exactly-once.** The probe applied its effect and then hung. ARC recorded `timeout` and `failed`. Meridian kept one effect. Nothing compensated it. The write was not retried.
- **Audit self-check cannot see a missing tail.** The live verify response was valid and carried the truncation notice. MemoryStore has no recorded head. A caller-supplied head does detect a short copy; that head lived only in the test, not in an outside store.

## Unsupported

| Check | Why it cannot pass here |
| --- | --- |
| Cross-tenant isolation | One organization. No second tenant boundary refuses foreign records. |
| External anchor persistence | Nothing writes the audit head to a store ARC does not control. |
| SSO and individual operator credentials | One shared bearer token. Identity and roles are headers. |
| Network segmentation | The connector token is an application check on loopback. |
| MCP drift as a runtime block | `detectDrift` reports the change. The gateway does not pin a manifest or suspend the tool. |

## Not implemented

**Restart while an approval is pending.** Stopping this process would drop MemoryStore, including the approval and the audit chain, and would take the original 17's recheck with it. That case was not run.

## Stress

Presets are 100 requests at concurrency 5, 500 at 10, and 1,000 at 20. Each preset ran with seeds 1, 2, and 3. The table below is from the earlier run; the figures in `reports/phase2-latest.json` are the current ones. Throughput moves with the host, so treat both as shape, not as a number to hold ARC to. The mix is deterministic. Two of the four residues are allowed refunds, so every seed on these counts is half executed, a quarter held, and a quarter denied. The seed changes order, which is why latency moved between seeds while the effect counts did not. Percentiles use `floor(p × (n − 1))` on sorted request latencies. This is one Node process on loopback with MemoryStore. It is not a service-level objective.

| Preset | Seed | Requests/s | p50 (ms) | p95 (ms) | p99 (ms) | Refunds | Other mutations | Unexpected outcomes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 1 | 819.67 | 6 | 9 | 10 | 50/50 | 0 | 0 |
| 100 | 2 | 892.86 | 6 | 8 | 10 | 50/50 | 0 | 0 |
| 100 | 3 | 934.58 | 5 | 9 | 10 | 50/50 | 0 | 0 |
| 500 | 1 | 1,118.57 | 9 | 15 | 16 | 250/250 | 0 | 0 |
| 500 | 2 | 1,366.12 | 8 | 12 | 13 | 250/250 | 0 | 0 |
| 500 | 3 | 1,269.04 | 8 | 13 | 17 | 250/250 | 0 | 0 |
| 1,000 | 1 | 1,285.35 | 15 | 30 | 35 | 500/500 | 0 | 0 |
| 1,000 | 2 | 1,497.01 | 13 | 22 | 24 | 500/500 | 0 | 0 |
| 1,000 | 3 | 1,592.36 | 12 | 21 | 31 | 500/500 | 0 | 0 |

All nine runs passed their own assertions: every response matched the seeded outcome, evidence was present, and the refund log moved only for executed refunds.

## Product improvements worth making in ARC Control

0. Route `POST /v1/agents/:id/activate` through `AgentRegistry.activate()` so the
   retirement guard actually runs, and add a regression test that a retired
   agent cannot be activated over HTTP. The guard exists; nothing reaches it.
1. Make idempotency atomic. Two callers with the same agent, tool, and key must not both pass the replay check. The duplicate refunds above are the case to lock with a regression test.
2. Re-evaluate current policy inside `resume` before the connector runs. A deny published while the approval is open should win, as it already does for a new request. Keep the kill-switch and agent-status checks that already run there.
3. Treat a timeout after a possible effect as an operator reconciliation item. The failed outcome is honest. There is still no compensation, and writes correctly are not retried.
4. Replace the shared operator token and role headers with individual credentials before any shared deployment. The header test shows why ARC-AI-004 cannot identify a person.
5. Pin MCP manifests onto tools and suspend or hold on MCP-SEC-030. The scanner already sees poisoned text and drift. Nothing in the gateway consumes that result.
6. Keep an audit head outside the process that serves the API. A caller-supplied digest works. MemoryStore does not record one, so ARC-AI-006 stays `not_assessable` on this store.
7. Add an organization boundary that refuses cross-tenant reads and writes, and a deployment check for network paths that never reach ARC. Neither exists in this build, so they are not marked passing.

## How to run

```bash
npm test                 # company boundary + stress-plan math, no servers needed
npm run preflight        # Node version, ARC sibling build, free ports
npm start                # the three-server stack (leave running)
npm run validate         # the original 17 -> reports/latest.json
npm run phase2           # Phase 2 + 9 stress runs + the 17 -> reports/phase2-latest.json
```

`npm run phase2` currently exits 1 because three implemented checks fail. That
is the correct current result.

`npm test` covers the company boundary and the stress-plan math. `npm run validate` is only the original 17. `npm run phase2` repeats Phase 2, the nine stress runs, and the 17. The command center can run one Phase 2 check, or one stress preset with seed 1. The three-seed matrix is the report command.

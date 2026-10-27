# ARC Control whole-product harness

One harness tests ARC Control as a product: every API route, every capability it claims, and how it behaves in front of more than one kind of business. It runs locally, in CI on both repositories, and in a private hosted environment.

Everything is synthetic. A pass means an independent target system observed exactly the effect ARC's decision implied. It is not a certification.

## What runs

| Suite | Source | What it proves |
| --- | --- | --- |
| Original integration (17) | `src/scenarios.mjs` | Allow, hold, deny, refuse before policy, bypass and replay, each checked against Meridian's mutation log. |
| Phase 2 (40) | `src/phase2.mjs` | Security, reliability and evidence: approvals, identity, lifecycle, connectors, MCP, concurrency, policy changes, audit chain, assurance. |
| Stress | `src/scenarios.mjs` `stress()` | 100 / 500 / 1,000 refunds × 3 seeds; expected and recorded effects must match exactly. |
| ARC product surface (24) | `src/product.mjs` | The routes the other suites do not reach, such as explain, decisions, simulate, policy history, connector kill switch, credential inventory, approval queue, evidence bundles, assurance catalogue and attestations, risks, notifications, scheduler and who-am-I. |
| Northwind Bank pack (15) | `src/packs/northwind.mjs`, `src/packs/runner.mjs` | Financial services: two-person approval, separation of duties, sanctions, a clock-dependent wire cut-off, and velocity limits under sequential and concurrent load. |
| Coverage | `src/coverage.mjs` | Reads ARC's routes from its source and maps each one to a check, or to a stated gap. A route with neither is `unmapped` and fails the run. |

Unsupported and not-implemented entries are listed with a reason and never counted as passes.

## Commands

```bash
npm test                 # unit + contract tests (no stack needed)
npm run coverage         # route and capability map from ARC source; --strict fails on unmapped routes
npm start                # stack: Meridian + Northwind + ARC API + ARC console
npm run product          # every suite, then coverage → reports/product-latest.json (exit 1 on any failure)
npm run product -- --quick   # one stress seed per preset
npm run showcase         # read-only static page from the last product run → showcase/index.html
```

`npm run product` also writes `reports/latest.json` and `reports/phase2-latest.json` in their existing formats, so the Validation Lab's recorded views show the same run.

In the Lab: **Suites & Industry Packs** (`/lab/suites`) runs the product suite and packs, and **Product Coverage** (`/lab/coverage`) shows the route and capability map, live or from the last product run.

## Results: 27 Oct 2026, ARC Control `main` `887dd2f`

`npm run product` on one loopback process, Node 22.22.0. Exit 0.

| Suite | Result |
| --- | --- |
| Original 17 | 17/17, and 17/17 again after every other suite |
| Phase 2 | 35 pass · 0 fail · 3 unsupported · 2 not implemented (3 passes reproduce a documented limitation) |
| Stress | 9/9 runs, refunds expected = recorded |
| ARC product surface | 22 pass · 2 unsupported |
| Northwind Bank | 13 pass · 2 unsupported |
| Route coverage | 76 routes: 68 verified · 8 stated gaps · 0 unmapped |
| Capabilities | 22 verified · 5 unsupported · 1 not implemented |

Stress throughput on this run (one process, in-memory store; not an SLO): 100 requests ≈ 446–521 req/s, p95 16–18 ms; 1,000 requests ≈ 671–741 req/s, p95 44–49 ms.

### Correction to the earlier "three failures" result

The run recorded on 26 Oct against ARC `162d00d` (3 Phase 2 failures, one called a regression) used the repository's **default branch**, which is `claude/elegant-curie-o8tgs9` at `162d00d`, not `main`. `162d00d` is older than `aa2f37c`, so the "regression" was a comparison running backwards in time. On `main`:

| Finding | Check | Status | Fix |
| --- | --- | --- | --- |
| ARC-SEC-001 concurrent idempotency | `concurrent-idempotency` | resolved: 5 rounds × 8 parallel → 1 refund each | arc-control#11 (issue #13 closed) |
| ARC-SEC-002 release ignores current policy | `policy-change-before-release` | resolved: release denied, 0 refunds | arc-control#11 (issue #14 closed) |
| ARC-SEC-003 retired agent reactivated | `retired-agent-final`, `product:retired-agent-resume-refused` | resolved at the API: activate and resume → 409 | aa2f37c; `registry.resume()` hardening in arc-control#16 (issue #15) |

All three were retested independently: once by a separate agent on unmodified harness code, and again by this product run. They stay listed in the Lab as resolved, with that evidence. If a check fails again, the finding shows as a regression.

**Action for the repository owner:** set `aking-beep/arc-control`'s default branch to `main`. Every plain `git clone` currently gets `162d00d`.

### Labels corrected by real checks

Two Phase 2 entries were static `unsupported` labels that `main` had overtaken. Both are now implemented checks, which adds assertions rather than removing any:

- `sso-operator-identity`: with ARC 2.1's trusted identity proxy, votes are attributed per person (`asserted_by_proxy`), a wrong proxy secret is refused (401), an unmapped group grants nothing (403), and shared-token votes are recorded as `claimed`. OIDC itself needs an identity provider and is a separate `not_implemented` entry.
- `mcp-drift-runtime-enforcement`: a tool on ARC's mock MCP server, rewritten after registration, is refused at execution with `manifest_drift` and evidenced as failed.

### New product finding

[arc-control#17](https://github.com/aking-beep/arc-control/issues/17): one unreachable MCP connector makes `GET /health/enforcement` return 503 for the whole gateway, even when every tool on it is disabled, and there is no way to remove a connector. Used as a load-balancer probe, one vendor outage would take a healthy instance out of rotation. The fix (arc-control PR for #17) counts a connector only while an enabled tool routes to it, and reports `inService` per connector. `product:health-enforcement-separate` asserts whichever contract the ARC build declares, strictly: before #17, 200 only when every connector is healthy; from #17, 200 only when every in-service connector is healthy, with `inService` recomputed from `GET /v1/tools` rather than taken from ARC. The check failed against the #17 build until it was updated, and passes against both builds now.

## Industry packs

A pack is data plus scenarios, run by the shared runner on the same ARC process:

```text
src/packs/<pack>.mjs   tools, policies, agents, rate limits, initial state, apply(), scenario catalogue
src/packs/runner.mjs   scenario bodies; same result contract as the 17 and Phase 2
```

`start.mjs` registers each pack's tools on the existing `meridian-http` connector (`/internal/<system>/<tool>`), publishes its policies, registers its agents with governance records and keys, and merges its `rateLimit` into ARC's options. The pack's records live in `state.packs[id]`; its effects go to the same mutation log, so reconciliation is identical.

To add a pack, copy `northwind.mjs`, give it a distinct tool namespace and agent names, add its scenarios to the runner (or a new runner module), and register it in `start.mjs`'s `packs` list. Pick a second pack for the policy shapes it forces. For example, healthcare would bring purpose-of-use, break-glass and consent.

What Northwind showed about ARC:

- Two-person approval, same-approver refusal, owner refusal and single release all hold.
- Hour-of-day policy conditions work, and are tested deterministically in `product:time-window-condition`.
- The rate limiter holds under a concurrent burst (15 parallel → exactly 5 executed). It counts actions, not money.
- **Not expressible in ARC today:** a cumulative amount limit per agent per period, and time-boxed delegation of approval authority.

## CI

- **This repository:** `.github/workflows/arc-integration.yml` runs on push to `main`, on pull requests, nightly at 06:17 UTC, on demand (`arc_ref` input), and on `repository_dispatch` (`arc-control-updated`). It builds ARC at the given ref (default `main`, never the default branch), then runs `npm test`, the UI build, `npm run coverage -- --strict`, the stack and `npm run product`, and uploads the reports. A second job, `hosted`, builds the Docker image, brings it up behind the Caddy gate and runs `deploy/smoke.sh`.
- **arc-control:** `.github/workflows/sandbox.yaml` (PR `claude/sandbox-harness-ci`) runs the same harness from this repository's `main` against every ARC pull request. It needs this repository's product harness on `main` first.

`repository_dispatch` from arc-control to here needs a token with access to this repository, stored as an arc-control secret. It is not configured. Until it is, the nightly run and the arc-control workflow cover ARC changes.

## Hosting

- **Read-only showcase:** `npm run showcase` builds a static page from the last product run. It has no API calls and no controls, and is safe to host anywhere.
- **Private test environment:** `deploy/` (see `deploy/README.md`). One container with a pinned ARC ref, behind an authenticating Caddy proxy. The ARC API is never published. `/hooks/*` is refused at the edge. The servers bind beyond loopback only with `SANDBOX_ALLOW_REMOTE_BIND=1`. Built and brought up on 27 Oct 2026: `deploy/smoke.sh` checks the gate (11 checks) and runs the whole harness inside the container, and the `hosted` CI job runs it on every change.
- **Not built yet:** splitting ARC and Meridian into separate containers on separate networks. That is what makes the network-segmentation capability testable; today they share one process.

## Remaining gaps

1. Network segmentation, tenant isolation and an external audit anchor are unsupported in ARC or not testable in one process.
2. OIDC sign-in is not exercised (`/auth/*` and `/v1/operator-sessions*` are stated gaps).
3. Editing or resolving assurance findings is deliberately not exercised.
4. Route coverage for the 17, Phase 2 and pack runners is per suite (read from runner source); product checks declare routes per check.
5. The hosted environment is verified locally behind loopback (`deploy/smoke.sh`, also in CI), but TLS with a real public domain has not been exercised.
6. Cumulative amount limits and approval delegation need ARC product work before they can be tested.

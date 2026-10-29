# ARC Control Sandbox — operating contract for agents

This file is read by every agent working in this repository. It states what
must always be true and where to look.

## What this is

The sandbox runs Meridian Commerce and Northwind Bank as fictional companies
next to a real ARC Control build (sibling checkout `../arc-control`). It has
two jobs:

- **Independent validation of ARC Control.** The 17 integration scenarios,
  Phase 2 security checks, the product suite, the Northwind pack, stress and
  coverage. ARC's own repository runs them on every enforcement change.
- **The Validation Lab.** Dashboards for the synthetic company and for ARC.
  Live operations run there: agents working a scripted or AI-driven day in
  real time, every action through ARC.

All companies, people and data are fictional.

## Rules — never break these

1. **Never bypass ARC Control authorization.** Every agent action goes to
   ARC's `/v1/actions` with the agent's own key. Only the `bypass` story beat
   calls Meridian directly, and it exists to prove that such a call is refused.
2. **Never manufacture successful test results.** A check reports what ARC and
   Meridian actually did. A stand-in (for example `tools/stand-in-model.mjs`)
   is always labelled as one, and never presented as evidence of real
   behaviour.
3. **Do not change the expected outcome of an existing check** to make it
   pass. Expected outcomes encode ARC's published policies.
4. **Do not remove, skip or disable a failing test.** Find the cause.
5. **Preserve evidence ids and correlation ids** on every record.
6. **Never expose a credential to the browser**: agent keys, the operator
   token, the connector token or `ANTHROPIC_API_KEY`. The browser talks only to
   the Meridian server (`ui/src/api/client.ts`).
7. **An unknown execution outcome is unknown**, never a failed business effect.
8. **Live operations never change shared ARC state**: no policies, agent
   status or tools. They do not use `batch-payments-agent`. Tests always run
   under `withTests` (`src/company.mjs`), which pauses live traffic first.
9. **Do not merge pull requests or push to `main`.** The user merges, or says
   "merge N" for a specific pull request.

## Commands

```bash
npm ci && npm run ui:install && npm run ui:build   # once; ARC built at ../arc-control
npm run lab                  # the whole company, agents firing in real time, prints every dashboard link
npm run lab -- --stand-in    # AI screens with the stand-in model (no key, no cost)
npm run lab -- --ai          # real AI agents; needs ANTHROPIC_API_KEY in the environment
npm run lab:links            # dashboard addresses only
npm test                     # unit tests (node:test)
npm run product              # whole-product harness; needs the stack running
npm run live:check -- --min 30 --min-episodes 5   # exit 1 on any live anomaly
bash deploy/smoke.sh         # the Docker image behind the login gate, harness inside
```

The full gate list, matching CI, is `.claude/skills/verify/SKILL.md`.

## Definition of done

- `npm test`, `npm run ui:typecheck`, `npm run coverage -- --strict` pass.
- The stack runs with live operations on (AI mode against the stand-in, as in
  CI), `npm run product` passes, and `live:check` reports 0 anomalies before
  and after.
- A change to the UI is looked at in a browser, with no page errors.
- A change to `deploy/` passes `deploy/smoke.sh`.
- Docs say what changed and what it does **not** establish.

## Where things are

| Need | Look at |
| --- | --- |
| Start the lab and open the dashboards | `.claude/skills/lab/SKILL.md`, `tools/lab.mjs` |
| Run every gate CI runs | `.claude/skills/verify/SKILL.md` |
| Add an agent behaviour, inbox item or story beat | `.claude/skills/extend-live-ops/SKILL.md`, `docs/LIVE_OPERATIONS.md` |
| The hosted lab on a server | `.claude/skills/deploy-lab/SKILL.md`, `deploy/README.md` |
| Which agent does what | `.claude/agents/` |
| Suites, packs, CI, hosting | `docs/PRODUCT_HARNESS.md` |
| The stack: ARC + Meridian bootstrap | `src/start.mjs`, `src/company.mjs` |
| Live operations | `src/live/` (engine, world, rules, inbox, ai) |

# Magic Patterns prompt — Meridian Commerce Group visual system

Paste into Magic Patterns after giving it the `arc-control-sandbox` project files and current ARC Control console screenshots or source if available.

---

Design a visually exceptional yet credible **enterprise operating environment** for a fictional multinational B2B company named **Meridian Commerce Group**. Its purpose is to stress-test ARC Control 2.0, an AI agent authorization, action control, audit evidence, and governance assurance platform.

**Output required:** production-quality responsive React + TypeScript UI files (or equivalent export supported by Magic Patterns) that Claude Code can integrate with the REST endpoints of an existing Node-based sandbox. This design is NOT a standalone product and must NOT invent an alternate policy engine, API responses, or tests.

Create these interactive application areas:

1. Public-facing company site: Home, About, Services, Global Operations, Contact. Make the branding believable and professional, not sci-fi.
2. Authenticated-looking *demo-only* employee portal shell with department navigation: Finance, Customer Support, IT/Cloud, Sales/CRM, HR, Security. Do not claim an actual authentication system is implemented.
3. Finance module: mock orders, invoices, refunds, request workflows, explicit risk and authorization labels.
4. IT module: environment/branch deployments, protected changes, access requests and approvals.
5. Customer service module: ticket queues, tickets linked to customers, agent-created updates.
6. CRM module: account lists and controlled export requests.
7. HR module: redacted synthetic employee records, access controlled actions.
8. Security module: alert feed, MCP risk register, policy review and incident containment workflow.
9. **Scenario Lab:** 40-scenario catalogue with an initial 17 executable cases. Filter by authorization, approvals, identity, MCP, security, GRC, chaos, and scale. Run controls and result panels must be wired to APIs, never hard-coded green. Show expected effect, observed ARC decision, actual target-side effect count, evidence link, elapsed time and explicit FAILED/NOT RUN/PENDING statuses.
10. **Stress Lab:** test configuration for 100/500/1000 requests, bounded concurrency, distribution of allow/deny/approval, p50/p95/p99 latency, throughput, refused-call count, mismatched outcomes and target-system mutations. No generated charts with fake results.
11. **Assurance Lab:** render the nine ARC controls as assessed, with pass/fail/not_assessable/not_applicable/attested as separate semantic statuses; show evidence windows and documented limitations. Never compute a misleading overall compliance score.
12. ARC Control handoff: link to the existing ARC Console, not a reconstructed fake console.

Design language: quiet high-end enterprise SaaS, editorial spacing, balanced typography, elegant restrained navy/stone/soft-green palette, crisp tables, informative badges, responsive grids. Figma-level fit and finish. No neon hacker design and no random charts. Use realistic seeded synthetic labels throughout and clearly distinguish simulated backend effects from live ARC authorization decisions.

Current backend endpoints: `GET /api/state`, `GET /api/scenarios`, `POST /api/scenarios/:id`, `POST /api/scenarios/all`, `POST /api/load`, `POST /api/assurance`, `POST /api/reset`. Do not assume any unlisted endpoint exists. Use adapter functions for future expansion.

For every interface component document: source API, required fields, loading state, empty state, error state, and what displays before any test has been run. Never count a test as PASS based solely on receiving HTTP 200. Preserve the existing Node backend and ARC integration; UI is a replaceable layer.

Output a repository compatibility report, an integration map, complete UI source files, and a no-mock claims checklist. Do not mark designs as executable until the real Node APIs have been wired and tested.

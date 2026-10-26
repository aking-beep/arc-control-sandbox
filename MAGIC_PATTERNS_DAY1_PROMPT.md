# Paste into Magic Patterns — first three Meridian screens

Create a high-fidelity, enterprise-grade React + TypeScript visual redesign for an EXISTING LOCAL app: **Meridian Commerce — ARC Control Synthetic Enterprise**. Use `arc-control-sandbox` files as source context. Target buyers/users: security engineers, platform teams, CISOs, compliance operators. The corporate Meridian company is fictional. ARC Control is the real authorization product under test.

**Today design ONLY the three core screens** (not 40 screens, and not a marketing homepage):

1. **Command Center** — premium enterprise overview showing environment status, live ARC API connectivity, company state, configured agents, available scenarios, recent actual results, latest observed target mutations, and a primary CTA to run the real suite. Distinguish NOT RUN, RUNNING, PASS, FAIL, API UNAVAILABLE. Never fill charts with fake performance metrics.

2. **Scenario Lab** — data-dense searchable table of the existing 17 executable scenarios; row fields: scenario ID, category, expected decision, last actual outcome, target effect count, evidence status, latency, test time and run button. Use concise side drawer for details and a run-all control. Add a PLANNED section for expansion toward 40 scenarios, clearly not executable.

3. **Live Action Inspector** — signature 3-column layout: (LEFT) agent identity, tool and requested parameters; (CENTER) ARC policy, decision, rule, approval and evidence; (RIGHT) Meridian backend observed effects and record state. Add execution chronology, evidence link, raw JSON drawer and failure analysis panel. A denied action with zero mutations should be visually obvious, without suggesting that all possible bypass routes were tested.

Visual design: premium modern technical SaaS inspired by Stripe's transaction clarity, Linear's dense navigation and Vercel's platform UI. Palette: navy `#173C4F`, slate `#192B35`, off-white `#F6F8FA`, restrained teal `#477C78`, status amber/red/green. Great typography, real dense tables, compact filters, deliberate responsive behavior. NO sci-fi/neon dashboards, glass gradients, giant KPI cards, or placeholder charts.

Backend truth comes ONLY from current app endpoints: GET `/api/health`, GET `/api/state`, GET `/api/scenarios`, POST `/api/scenarios/:id`, POST `/api/scenarios/all`, POST `/api/load`, POST `/api/assurance`, POST `/api/reset`. Read actual returned shapes from source. The existing app is plain HTML/CSS/JS and Node, so export complete portable React/TypeScript components and a typed REST adapter separately; do not claim the React design is wired until Claude integrates it.

No generated design may invent an authorization result, compliance certification, or sample pass record represented as live. Static preview examples must be labeled **ILLUSTRATIVE ONLY**. Do not introduce client-side ARC operator/agent credentials. Show loading, error, empty and blocked states. Use the existing ARC console for governance deep links rather than replicating its UI.

Deliver: full UI source export; design tokens; three responsive screens; component inventory; endpoint-to-view mapping; integration guide for Claude Code; explicit "design only vs connected" status checklist. The objective is to show a true action chain: **agent asks → ARC evaluates → tool executes or is stopped → target effect is independently observed → evidence is inspectable**.

---
name: extend-live-ops
description: Adds or changes what the live-operations agents do (a routine action, an inbox item, an adversarial probe, a story beat, a department) without breaking reconciliation or test isolation. Use for any change under src/live/.
---

# Extend live operations

Read `docs/LIVE_OPERATIONS.md` first.

1. **Place it.**
   - A scripted action goes in `routine()` or `STORIES` (`src/live/engine.mjs`).
   - An AI inbox item goes in `ROUTINE` or `ADVERSARIAL` (`src/live/inbox.mjs`).
   - People, customers and systems go in `src/live/world.mjs`. Append new records; the originals stay first.
2. **Expected outcome from the policy, not from a run.**
   - Scripted actions carry `expect`.
   - AI actions are predicted by `predict()` in `src/live/rules.mjs`.
   - Both must follow the policies published in `src/start.mjs` and `src/packs/`. Never set an expectation to what ARC happened to return.
3. **Adversarial items** name their `bait`: a test on one attempted action, with `baitMin` for splits.
4. **Keep shared ARC state alone.** No policy, agent-status or tool changes. No `batch-payments-agent`.
5. **Test it.**
   - Add to `tests/live.test.mjs` or `tests/live-ai.test.mjs`, counting effects in the fake company's mutation log, not only responses.
   - The same seed must still give the same day.
6. **Run it for real.** `npm run lab -- --stand-in`, then `live:check` with 0 anomalies. Then run the verify skill.
7. **Document it.** Update the tables in `docs/LIVE_OPERATIONS.md`.

An anomaly after the change means the prediction, the policy or ARC disagree.
Investigate it from its evidence id. Do not loosen the check.

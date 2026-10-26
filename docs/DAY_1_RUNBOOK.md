# ARC Control x Meridian — same-day launch runbook

**Today's result:** a LOCAL synthetic enterprise running against the real ARC gateway, 17 independently observed integration scenarios, saved JSON report, and a first UI prototype specification. This is an experimental test environment, not a production or customer-hosted security deployment.

## A. Get ready

Use a desktop/laptop with Git and Node **22 or newer**, plus Claude Code and your existing Magic Patterns account. Open Terminal (Mac/Linux) or Git Bash/WSL (Windows). If Node is missing, install Node 22+ from nodejs.org. Verify:

```bash
node --version
git --version
```

Install Claude Code if needed using the installer instructions at https://code.claude.com/docs/en/overview, then run `claude --version`.

## B. Unpack and arrange repositories

Download `arc-control-sandbox-day1-kit.zip` from ChatGPT. Unzip it so the folder structure is:

```text
arc-workspace/
  arc-control/               <-- existing canonical ARC Control repository
  arc-control-sandbox/       <-- this starter, containing src/, docs/, public/
```

From inside `arc-workspace/`:

```bash
git clone https://github.com/aking-beep/arc-control.git
cd arc-control
npm install
npm run verify
cd ../arc-control-sandbox
npm test
npm run preflight
```

If you already have the ARC repo locally, copy it to the sibling directory rather than cloning again. If your GitHub access requires authentication, authenticate GitHub CLI (`gh auth login`) or Git credentials first. If `npm run preflight` fails, inspect the named missing built file/port rather than bypassing the check.

## C. Run the real connected environment

Terminal 1, from `arc-control-sandbox/`:

```bash
npm start
```

Leave it open. It starts all three servers on localhost:
- Meridian workplace: http://127.0.0.1:8890
- ARC Control API: http://127.0.0.1:8787
- ARC Control Console: http://127.0.0.1:8788

Terminal 2, again from `arc-control-sandbox/`:

```bash
npm run validate
```

This triggers 17 real ARC request scenarios and saves `reports/latest.json` plus a timestamped report. Expected release gate: **17/17** with no unauthorized business mutations. On a failure, keep the red status and have Claude fix the actual cause.

## D. Have Claude Code fix integration gaps first

From `arc-control-sandbox/` run `claude`. Tell it to read `docs/CLAUDE_DAY1_PROMPT.md` and `docs/CLAUDE_CODE_PROMPT.md`, inspect the sibling ARC repo, then run all checks and fix integration issues on a feature branch. **No redesign until tests are trustworthy.**

## E. Design in Magic Patterns

Import/link `arc-control-sandbox`, and paste the prompt in `docs/MAGIC_PATTERNS_DAY1_PROMPT.md`. Start with only three screens: **Command Center**, **Scenario Lab**, and **Live Action Inspector**. Review the design. Export source/code via Magic Patterns or its official integration into Claude Code. Keep generated UI in a new folder/branch; never overwrite the running server or policies as a first step.

## F. Integrate a single UI screen at a time

Have Claude implement the Magic Patterns layout against actual JSON from Meridian API (`/api/state`, `/api/scenarios`, `/api/scenarios/:id`). Verify the new UI isn't displaying invented success data, and re-run `npm run validate` after each merge.

## G. Stress after correctness is proven

Use the local UI's Stress Lab only after the 17 integration checks pass. Execute 100 requests/concurrency 5 first, then 500/concurrency 10, then 1000/concurrency 20. These workloads use local process and in-memory fixtures; they **do not** establish distributed throughput or production SLA. Record observed effects, denied side-effects (must be zero), latency and errors. Avoid running load and scenario suite simultaneously while verifying deterministic counts.

## H. Optional new GitHub repository

Create a **private, empty** GitHub repo `aking-beep/arc-control-sandbox`. Do not initialize it with a README because the starter already has one. From the unpacked sandbox folder, on your machine:

```bash
git init
git checkout -b main
git add .
git commit -m "Add local Meridian synthetic enterprise test harness"
git remote add origin https://github.com/aking-beep/arc-control-sandbox.git
git push -u origin main
```

If the repo or remote already exists, ask Claude to inspect `git status` and `git remote -v` rather than rerunning these commands blindly. No ARC production secrets in Git; `.gitignore` excludes `.env` and `reports/`.

## I. Stop criteria and safety

Do **not** deploy this starter to Vercel/public hosting: test-operator API endpoints have no browser authentication and must remain loopback-only. Do not publish tokens, use live money, real PII, or real destructive cloud access. Strong network isolation, identity, session handling and CSRF checks are required for any hosted pilot.

The sandbox never proves independent certification or full production readiness. The current ARC 2.0 operator identity comes from request headers behind a shared token, ARC-AI-006 needs an independent audit head for a pass, and ARC-AI-009 requires external network/credential checks and attestation.

## End-of-day proof package

- Git branch/commit for the sandbox starter and any verified repairs.
- `npm run verify` output from ARC.
- `npm test` and `npm run validate` output from Meridian.
- `reports/latest.json`, attached privately to your own validation record.
- Screenshots of real Meridian/ARC screens with *synthetic* data.
- List of failures / gaps / items not tested.
- First approved three-screen Magic Patterns concept.

**Do not claim end-to-end green until you have personally executed it or have actual machine output from Claude Code's local terminal.**

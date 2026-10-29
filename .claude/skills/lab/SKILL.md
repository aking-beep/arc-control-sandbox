---
name: lab
description: Starts the whole synthetic company (Meridian, Northwind, ARC Control) with agents firing in real time, and gives the user every dashboard link. Use whenever the user asks to see, open, run, test or demo the dashboards, the lab, live operations or the agents.
---

# Lab

## Start it

From the repository root, Node 22+, with ARC Control built at `../arc-control`.

| The user wants | Command |
| --- | --- |
| Agents firing, repeatable | `npm run lab` (add `--seed N`, `--rate 60`) |
| AI agents with a real model | `export ANTHROPIC_API_KEY=...` then `npm run lab -- --ai` |
| AI screens, no key or cost | `npm run lab -- --stand-in` |
| Only the links | `npm run lab:links` |

`npm run lab` refuses to start if ports 8890, 8787 or 8788 are taken, and
prints the command that frees them. Ctrl+C stops everything it started.

First time on a machine:

```bash
cd ../arc-control && npm install && npm run build && cd -
npm ci && npm run ui:install && npm run ui:build
```

## On the user's own computer

Cloud sessions cannot open a browser on the user's computer. When the user
wants to look at the dashboards themselves, give them the commands above to
run in their own terminal, then the links from `npm run lab:links`. Say which
mode they will see. Say plainly that `--stand-in` is not a real model.

## In this session

Run `npm run lab -- --stand-in` in the background, wait for "Ctrl+C stops it",
then check with `npm run live:check -- --min 20 --min-episodes 3`. To look at a
page, use Playwright (preinstalled) against `http://127.0.0.1:8890/#/...`, and
report page errors. Stop with `lsof -ti tcp:8890,8787,8788,9911 | xargs kill`.

## What to tell the user to try

- Live Operations (`/#/lab/live`): the Mode switch (Scripted / AI agents), and
  the feed. A robot-icon row opens the inbox item, what the agent tried, ARC's
  answers and the reasoning summary.
- The ARC Console (`http://127.0.0.1:8788`): approve or reject a held request.
  The feed records it as decided by a person.
- Suites & Industry Packs: run a suite. Live traffic pauses and then resumes,
  and Anomalies stays at 0.

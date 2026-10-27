# Private hosted test environment

Runs the Validation Lab, the Northwind pack and ARC Control in one container, behind a login. Use it for a small private test group. It is not for public access: the sandbox's own `/api/*` routes have no authentication, and the login in front of them is the only gate.

```bash
# 1. A password hash for the gate
docker run --rm caddy:2.8 caddy hash-password --plaintext 'choose-a-long-password'

# 2. Build and start. Pin ARC to a commit for reproducible runs.
export ARC_REF=8b0eb4beacc7fba51274483a839ece52b17aa88f
export LAB_USER=tester LAB_PASSWORD_HASH='<output of step 1>'
docker compose -f deploy/docker-compose.yml up -d --build
```

- **Lab:** `http://127.0.0.1:8080` (login required)
- **ARC console:** `http://127.0.0.1:8081` (login required)

The ARC API (8787) and the lab's own port (8890) are not published.

## On a server (one command)

1. Create an Ubuntu 22.04 or 24.04 server with at least 2 vCPU and 4 GB memory, for example Hetzner CX22 or a DigitalOcean 4 GB droplet. Note its public IPv4 address.
2. In your domain's DNS, add two **A** records pointing at that address, for example `lab` and `console` under `arctransformationgroup.com`. Wait until they resolve (`dig +short lab.arctransformationgroup.com`).
3. On the server:

```bash
git clone https://github.com/aking-beep/arc-control-sandbox.git
cd arc-control-sandbox
sudo bash deploy/server-setup.sh \
  --domain lab.arctransformationgroup.com \
  --console-domain console.arctransformationgroup.com
```

The script installs Docker, opens only ports 22, 80 and 443, adds swap on small servers, checks that both names point at this server (so certificate issuance is not wasted), pins ARC Control to the current `main` commit, generates the shared login, builds, starts, waits until the gateway is configured, and prints the addresses and the password once. The login is stored only as a bcrypt hash in `deploy/.env` (mode 600, ignored by git).

- **Update to the latest code:** `git pull && sudo bash deploy/server-setup.sh --domain ... --console-domain ...` (the login is kept).
- **New password:** add `--new-password`.
- **Different ARC build:** add `--arc-ref <branch, tag or commit>`.
- **Logs:** `docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs -f`.
- **Live operations** start with the stack: the agents work through a scripted, seeded day you can watch on every dashboard (see [`docs/LIVE_OPERATIONS.md`](../docs/LIVE_OPERATIONS.md)). Add `--no-live` to leave them paused, or `--live-rate 60` for a faster day.

Plain links such as `https://lab.example.com/lab/suites` redirect to the in-app address (`/#/lab/suites`), so any page can be shared directly.

With hostnames set, Caddy serves both sites on 443, obtains certificates itself, and redirects port 80 to HTTPS. The 8080/8081 ports stay on loopback. For more than a handful of testers, put your SSO in front instead of basic auth: Cloudflare Access, Tailscale, or oauth2-proxy.

**Behind a TLS-inspecting proxy:** the build fetches ARC from GitHub and packages from npm. Pass the proxy's CA as a build secret; it is used only during the build steps and is not stored in the image:

```bash
docker build -f deploy/Dockerfile --build-arg ARC_REF=$ARC_REF \
  --secret id=extra_ca,src=/path/to/proxy-ca.pem -t arc-validation-lab:local .
docker compose -f deploy/docker-compose.yml up -d     # uses the image you built
```

## Checking it

```bash
ARC_REF=<sha> bash deploy/smoke.sh     # build, bring up, check, run the harness, tear down
KEEP=1 bash deploy/smoke.sh            # same, but leave it running and print the login
SMOKE_PASSWORD=... KEEP=1 bash deploy/smoke.sh   # choose the login password yourself
SKIP_BUILD=1 bash deploy/smoke.sh      # use an image you already built
```

`smoke.sh` checks that:
- the lab and the console refuse a missing or wrong login (401) and serve with one (200);
- `/hooks/*` and `/internal/*` are refused at the edge (404), even with a login;
- the ARC API and the lab's own port are not published;
- the live event stream passes the gate unbuffered, and is refused without a login;
- live operations run with no anomaly before and after the harness.

It then runs `npm run product -- --quick` inside the lab container and copies the report to `reports/product-docker.json`. CI runs it on every push and pull request (`hosted` job in `.github/workflows/arc-integration.yml`).

To run the suites by hand, open **Suites & Industry Packs**, or:

```bash
docker exec deploy-lab-1 npm run product
```

## Last verified

27 Oct 2026, ARC Control `main` `8b0eb4b`, Docker 29.9 with Compose 5.6, built behind a TLS-inspecting proxy with the `extra_ca` secret:
- `smoke.sh`: all 12 gate checks pass, including the gateway being configured behind the gate before anything else runs.
- With live operations on (27 Oct, ARC `main` `3781be7`): the live stream reaches the browser through the gate and is refused without a login; live operations ran 48 actions with 0 anomalies before the harness, the harness passed with them running, and they were still clean afterwards (53 actions, 0 anomalies).
- `server-setup.sh --no-tls`: comes up healthy, the printed login works (401 without it), a second run keeps the login, `deploy/.env` is mode 600 and ignored by git, and plain links such as `/lab/suites` open the right page in a browser with no console errors. The `--domain` path (DNS check, certificates) needs a real server and was not run here.
- Harness inside the container: original 17/17; Phase 2 35 pass / 0 fail / 3 unsupported / 2 not implemented; stress pass; product 22 pass; Northwind 13 pass; 17/17 recheck; 76 routes, 0 unmapped.
- Northwind run through the gate from the browser-facing port: 13 pass, 2 unsupported.
- The report records both commits (`ARC_REVISION` / `SANDBOX_REVISION` are set in the image, which has no `.git`).
- The CA secret is not in the image: no `/run/secrets`, and `NODE_EXTRA_CA_CERTS` is unset at runtime.

TLS with a real domain was not exercised; that needs a public DNS name.

## What this does and does not give you

- **Gives:** a shared environment that persists while it runs, real TLS and latency between your browser and the Lab, and a pinned ARC build.
- **Does not:**
  - **Network separation.** ARC and Meridian still share one process and loopback, so the network-segmentation capability stays untestable.
  - **Durable state.** MemoryStore loses everything on restart.
  - **Isolation between testers.** A Phase 2 or product run changes ARC state that everyone sees. Suite runs are queued, so two testers' runs never overlap.
  - **Protection from the Docker host itself.** The `internal` network has no published ports and no route to the outside, but a process on the Docker host can still reach the lab on its bridge address. Other machines cannot.

The next step is two containers on separate networks, with Meridian's `/internal/*` reachable only from ARC's network. That needs `start.mjs` to run ARC and Meridian as separate processes.

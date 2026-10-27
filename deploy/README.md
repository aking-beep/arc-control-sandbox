# Private hosted test environment

Runs the Validation Lab, the Northwind pack and ARC Control in one container, behind a login. Use it for a small private test group. It is not for public access: the sandbox's own `/api/*` routes have no authentication, and the login in front of them is the only gate.

```bash
# 1. A password hash for the gate
docker run --rm caddy:2.8 caddy hash-password --plaintext 'choose-a-long-password'

# 2. Build and start. Pin ARC to a commit for reproducible runs.
export ARC_REF=887dd2f1b12ffa4985cc1d3ea8de62cd370dbd56
export LAB_USER=tester LAB_PASSWORD_HASH='<output of step 1>'
docker compose -f deploy/docker-compose.yml up -d --build
```

- **Lab:** `http://127.0.0.1:8080` (login required)
- **ARC console:** `http://127.0.0.1:8081` (login required)

The ARC API (8787) is not published.

**On a server:** set `LAB_DOMAIN=lab.example.com` and `CONSOLE_DOMAIN=console.example.com` so Caddy obtains TLS certificates, and bind the ports publicly with `LAB_BIND=0.0.0.0 TLS_BIND=0.0.0.0`. For more than a handful of testers, put your SSO in front instead of basic auth: Cloudflare Access, Tailscale, or oauth2-proxy.

**Running the suites:** open **Suites & Industry Packs**, or exec into the container:

```bash
docker compose -f deploy/docker-compose.yml exec lab npm run product
```

## What this does and does not give you

- **Gives:** a shared, persistent-while-running environment, real TLS and latency between your browser and the Lab, and a pinned ARC build.
- **Does not:**
  - **Network separation.** ARC and Meridian still share one process and loopback, so the network-segmentation capability stays untestable.
  - **Durable state.** MemoryStore loses everything on restart.
  - **Isolation between testers.** A Phase 2 or product run changes ARC state that everyone sees.

The next step is two containers on separate networks, with Meridian's `/internal/*` reachable only from ARC's network. That needs `start.mjs` to run ARC and Meridian as separate processes.

**Status:** these files were written alongside a CI-verified build process (same commands as `.github/workflows/arc-integration.yml`). They have not been built or run here, because the build environment had no Docker daemon.

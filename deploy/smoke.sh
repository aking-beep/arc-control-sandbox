#!/usr/bin/env bash
# Brings up deploy/docker-compose.yml and checks the gate, then runs the whole
# product harness inside the lab container. Used by CI and by hand:
#
#   ARC_REF=<sha> bash deploy/smoke.sh            # build, check, tear down
#   KEEP=1 bash deploy/smoke.sh                   # leave the stack running
#
# Behind a TLS-inspecting proxy, build the image first with
# --secret id=extra_ca,... (see deploy/README.md) and set SKIP_BUILD=1.
set -euo pipefail
cd "$(dirname "$0")/.."

compose=(docker compose -f deploy/docker-compose.yml)
export LAB_USER=smoke
# A fresh password per run unless one is given; KEEP=1 prints it at the end.
password="${SMOKE_PASSWORD:-smoke-$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')}"
LAB_PASSWORD_HASH="$(docker run --rm caddy:2.8 caddy hash-password --plaintext "$password")"
export LAB_PASSWORD_HASH
export SANDBOX_REF="${SANDBOX_REF:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"

failures=0
check() { # label expected actual
  if [ "$2" = "$3" ]; then echo "ok    $1 ($3)"; else echo "FAIL  $1: expected $2, got $3"; failures=$((failures + 1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$@" || true; }

[ "${SKIP_BUILD:-}" = 1 ] || "${compose[@]}" build
"${compose[@]}" up -d
[ "${KEEP:-}" = 1 ] || trap '"${compose[@]}" down -v >/dev/null 2>&1' EXIT

lab="$("${compose[@]}" ps -q lab)"
for _ in $(seq 1 60); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$lab")" = healthy ] && break
  sleep 2
done
check "lab container healthy" healthy "$(docker inspect -f '{{.State.Health.Status}}' "$lab")"
# Healthy means the lab port answers; ready means ARC, the console and the
# seeded agents are up, which /api/health reports as gatewayConfigured.
ready=no
for _ in $(seq 1 60); do
  if curl -fs --max-time 5 -u "smoke:$password" http://127.0.0.1:8080/api/health | grep -q '"gatewayConfigured":true'; then ready=yes; break; fi
  sleep 2
done
check "ARC gateway configured behind the gate" yes "$ready"

auth=(-u "smoke:$password")
check "lab refuses no login"          401 "$(code http://127.0.0.1:8080/)"
check "lab refuses a wrong password"  401 "$(code -u smoke:wrong http://127.0.0.1:8080/api/health)"
check "console refuses no login"      401 "$(code http://127.0.0.1:8081/)"
check "lab serves with a login"       200 "$(code "${auth[@]}" http://127.0.0.1:8080/)"
check "lab API with a login"          200 "$(code "${auth[@]}" http://127.0.0.1:8080/api/health)"
check "console serves with a login"   200 "$(code "${auth[@]}" http://127.0.0.1:8081/)"
check "/hooks blocked at the edge"    404 "$(code "${auth[@]}" -X POST http://127.0.0.1:8080/hooks/arc -d '{}')"
check "/internal blocked at the edge" 404 "$(code "${auth[@]}" -X POST http://127.0.0.1:8080/internal/bank/payment -d '{}')"
check "ARC API not published"         000 "$(code http://127.0.0.1:8787/health)"
check "lab not published directly"    000 "$(code http://127.0.0.1:8890/api/health)"

echo "== npm run product -- --quick inside the lab container"
if docker exec "$lab" npm run product -- --quick; then echo "ok    product harness"; else echo "FAIL  product harness"; failures=$((failures + 1)); fi
mkdir -p reports && docker cp "$lab:/opt/arc-control-sandbox/reports/product-latest.json" reports/product-docker.json 2>/dev/null || true

echo "== $failures failure(s)"
[ "${KEEP:-}" = 1 ] && echo "Left running: http://127.0.0.1:8080 and http://127.0.0.1:8081, user smoke, password $password"
[ "$failures" = 0 ]

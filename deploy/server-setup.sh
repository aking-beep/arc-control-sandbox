#!/usr/bin/env bash
# Sets up (or updates) the private hosted Lab on a fresh Ubuntu 22.04/24.04 server.
#
#   sudo bash deploy/server-setup.sh \
#     --domain lab.example.com --console-domain console.example.com
#
# Run it again at any time to update to the latest code; the login is kept
# unless you pass --new-password. What it does:
#   1. installs Docker and opens only ports 22, 80 and 443 (ufw);
#   2. adds swap on small servers so the build does not run out of memory;
#   3. checks that both names resolve to this server, so certificates can be issued;
#   4. pins ARC Control to the current commit of its main branch;
#   5. writes deploy/.env (mode 600) with a generated login, builds and starts
#      the stack, and waits until the gateway is configured;
#   6. prints the addresses and the login.
#
# Live operations (agents working through a scripted, seeded day) start with
# the stack; --no-live leaves them paused, --live-rate sets actions per minute.
#
# --no-tls serves plain HTTP on 127.0.0.1:8080/8081 instead (for trying the
# script on a machine with no public name). --skip-install skips step 1.
set -euo pipefail

domain='' console='' arc_ref='main' new_password=0 tls=1 install=1 user='' live=1 live_rate=20
while [ $# -gt 0 ]; do
  case "$1" in
    --domain) domain="$2"; shift 2 ;;
    --console-domain) console="$2"; shift 2 ;;
    --arc-ref) arc_ref="$2"; shift 2 ;;
    --user) user="$2"; shift 2 ;;
    --new-password) new_password=1; shift ;;
    --no-tls) tls=0; shift ;;
    --skip-install) install=0; shift ;;
    --no-live) live=0; shift ;;
    --live-rate) live_rate="$2"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
if [ "$tls" = 1 ] && { [ -z "$domain" ] || [ -z "$console" ]; }; then
  echo "usage: $0 --domain lab.example.com --console-domain console.example.com  (or --no-tls)" >&2; exit 2
fi
[ "$(id -u)" = 0 ] || { echo "run with sudo" >&2; exit 2; }
cd "$(dirname "$0")/.."
say() { printf '\n== %s\n' "$*"; }

if [ "$install" = 1 ]; then
  say "Docker and firewall"
  if ! command -v docker >/dev/null; then
    apt-get update -q
    apt-get install -yq ca-certificates curl git ufw
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    . /etc/os-release
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -q
    apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
  if command -v ufw >/dev/null; then
    ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
    ufw --force enable >/dev/null
    echo "firewall: only 22, 80 and 443 are open"
  fi
  mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
  if [ "$mem_mb" -lt 3500 ] && [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "added 2 GB swap (server has ${mem_mb} MB memory)"
  fi
fi

if [ "$tls" = 1 ]; then
  say "DNS"
  # Certificates are issued only when both names already point here; a failed
  # attempt counts against the certificate authority's rate limit.
  mine="$(curl -fsS --max-time 10 https://checkip.amazonaws.com || true)"
  for name in "$domain" "$console"; do
    resolved="$(getent ahostsv4 "$name" | awk 'NR==1 {print $1}')"
    if [ -z "$resolved" ]; then echo "$name does not resolve yet. Add an A record for it pointing at ${mine:-this server}, wait a few minutes, and run this again." >&2; exit 1; fi
    if [ -n "$mine" ] && [ "$resolved" != "$mine" ]; then echo "$name resolves to $resolved, but this server is $mine. Fix the A record and run this again." >&2; exit 1; fi
    echo "$name → $resolved"
  done
fi

say "ARC Control version"
if [[ "$arc_ref" =~ ^[0-9a-f]{40}$ ]]; then sha="$arc_ref"; else
  sha="$(git ls-remote https://github.com/aking-beep/arc-control.git "refs/heads/$arc_ref" "refs/tags/$arc_ref" | awk 'NR==1 {print $1}')"
fi
[ -n "$sha" ] || { echo "could not resolve arc-control ref $arc_ref" >&2; exit 1; }
echo "arc-control $arc_ref → $sha"

say "Login"
env_file=deploy/.env
password=''
stored_user="$( [ -f "$env_file" ] && grep '^LAB_USER=' "$env_file" | cut -d= -f2- || true)"
user="${user:-${stored_user:-tester}}"
if [ -f "$env_file" ] && [ "$new_password" = 0 ] && grep -q '^LAB_PASSWORD_HASH=' "$env_file"; then
  echo "keeping the existing login for $user (pass --new-password to replace it)"
  hash_line="$(grep '^LAB_PASSWORD_HASH=' "$env_file")"
else
  password="$(od -An -N18 -tx1 /dev/urandom | tr -d ' \n')"
  hash="$(docker run --rm caddy:2.8 caddy hash-password --plaintext "$password")"
  # Single quotes: Compose must not expand the $ signs in a bcrypt hash.
  hash_line="LAB_PASSWORD_HASH='$hash'"
  # Shown now, not only at the end: if a later step fails, a re-run keeps this
  # login, and it is stored only as a hash.
  echo "New login: user $user, password $password"
  echo "Save it now. It is not stored anywhere in plain text."
fi
if [ "$tls" = 1 ]; then
  sites="LAB_DOMAIN=$domain
CONSOLE_DOMAIN=$console
TLS_BIND=0.0.0.0"
else
  sites="TLS_BIND=127.0.0.1"
fi
umask 077
cat > "$env_file" <<EOF
# Written by deploy/server-setup.sh. Holds the login hash: keep it private.
ARC_REF=$sha
SANDBOX_REF=$(git rev-parse HEAD 2>/dev/null || echo unknown)
LAB_USER=$user
$hash_line
LAB_BIND=127.0.0.1
LIVE_OPS=$live
LIVE_RATE=$live_rate
$sites
EOF
chmod 600 "$env_file"

say "Build and start (a few minutes the first time)"
compose=(docker compose -f deploy/docker-compose.yml --env-file "$env_file")
# SKIP_BUILD=1 uses an image already built (for example with --secret id=extra_ca).
if [ "${SKIP_BUILD:-}" = 1 ]; then "${compose[@]}" up -d; else "${compose[@]}" up -d --build; fi

say "Waiting for the gateway"
lab="$("${compose[@]}" ps -q lab)"
for _ in $(seq 1 90); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$lab")" = healthy ] && break
  sleep 2
done
status="$(docker inspect -f '{{.State.Health.Status}}' "$lab")"
[ "$status" = healthy ] || { echo "the lab did not become healthy ($status); see: ${compose[*]} logs lab" >&2; exit 1; }

if [ "$tls" = 1 ]; then lab_url="https://$domain"; console_url="https://$console"; else lab_url="http://127.0.0.1:8080"; console_url="http://127.0.0.1:8081"; fi
say "Ready"
echo "Lab:          $lab_url/lab"
echo "ARC console:  $console_url"
echo "User:         $user"
if [ -n "$password" ]; then
  echo "Password:     $password"
  echo "(Shown once. It is stored only as a hash; run again with --new-password to replace it.)"
fi
echo "ARC Control:  ${sha:0:7}"
echo "Logs:         ${compose[*]} logs -f"

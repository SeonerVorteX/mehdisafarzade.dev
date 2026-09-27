#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Exercises deploy/checks/verify-api-isolation.sh against stub containers on local
# Docker networks that mirror the IP plan (deploy/ip-plan.env). The API's own
# behaviour is proven by api/test/admin-trust.e2e-spec.ts; this proves the deploy
# check DETECTS a broken setup and passes a correct one.
#
# The stub API implements the same contract as the real one: X-Admin-Device is
# honored only when the TCP peer is in ADMIN_TRUSTED_SOURCES (exact IPs).
# "Host nginx" is simulated from the admin IP (10.231.0.31, also trusted), because a
# container can't take the bridge gateway address.
#
# Usage: deploy/checks/test/run.sh   (Docker; works in Git Bash)
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
export MSYS_NO_PATHCONV=1

here="$(cd "$(dirname "$0")" && pwd)"
check="$here/../verify-api-isolation.sh"
pnet=pf-iso-portfolio
bnet=pf-iso-backend
api=pf-iso-api-blue
web=pf-iso-web-blue
trust="10.231.0.1,10.231.0.31,10.231.0.32"

cleanup() {
    docker rm -f "$api" "$web" >/dev/null 2>&1 || true
    docker network rm "$pnet" "$bnet" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

docker network create --subnet 10.231.0.0/24 --gateway 10.231.0.1 "$pnet" >/dev/null
docker network create --subnet 10.232.0.0/24 "$bnet" >/dev/null
docker pull -q curlimages/curl:8.10.1 >/dev/null

# stub_api <trust-env> <trust-all:0|1> [extra docker run args…]
stub_api() {
    local trust_env=$1 trust_all=$2
    shift 2
    docker rm -f "$api" >/dev/null 2>&1 || true
    docker run -d --name "$api" --network "$pnet" --ip 10.231.0.11 -e "ADMIN_TRUSTED_SOURCES=$trust_env" \
        -e "TRUST_ALL=$trust_all" "$@" node:22-alpine node -e '
const trusted = new Set(process.env.ADMIN_TRUSTED_SOURCES.split(",").map((s) => s.trim()));
const norm = (a) => (a || "").replace(/^::ffff:/, "");
require("http").createServer((req, res) => {
  const peerOk = process.env.TRUST_ALL === "1" || trusted.has(norm(req.socket.remoteAddress));
  const ok = req.url === "/v1/admin/auth/pending" && peerOk && /^[a-z0-9][a-z0-9-]{0,31}$/.test(req.headers["x-admin-device"] || "");
  res.statusCode = ok ? 200 : 404;
  res.end();
}).listen(3000, "0.0.0.0");' >/dev/null
    docker network connect "$bnet" "$api"
    sleep 2
}

docker run -d --name "$web" --network "$pnet" --ip 10.231.0.21 node:22-alpine sleep 3600 >/dev/null

run_check() {
    PF_API_CONTAINER="$api" PF_WEB_CONTAINER="$web" PF_BACKEND_NETWORK="$bnet" PF_NETWORK_NAME="$pnet" PF_SKIP_NGINX=1 \
        PF_HOST_CURL="docker run --rm --network $pnet --ip 10.231.0.31 curlimages/curl:8.10.1" \
        sh "$check" blue 2>&1
}

pass=0
fail=0
expect() { # <name> <expected-exit> <exit> <output> <must-contain>
    if [ "$2" = "$3" ] && grep -qF -- "$5" <<<"$4"; then
        pass=$((pass + 1)); printf '  \033[32m✓\033[0m %s\n' "$1"
    else
        fail=$((fail + 1)); printf '  \033[31m✗\033[0m %s (exit %s)\n%s\n' "$1" "$3" "$4"
    fi
}

echo "▸ correct setup"
stub_api "$trust" 0
out=$(run_check); code=$?
expect "passes: no published port, fixed IP, exact trust list, only gateway/admin accepted" 0 "$code" "$out" "all checks passed"

echo "▸ API publishes a host port"
stub_api "$trust" 0 -p 127.0.0.1:39999:3000
out=$(run_check); code=$?
expect "fails the deploy" 1 "$code" "$out" "FAIL  publishes no host port"

echo "▸ API trusts every peer (e.g. a subnet-wide rule)"
stub_api "$trust" 1
out=$(run_check); code=$?
expect "detects the web container being trusted" 1 "$code" "$out" "FAIL  X-Admin-Device from the web container → 404"
expect "detects another portfolio address being trusted" 1 "$code" "$out" "FAIL  X-Admin-Device from 10.231.0.250 → 404"
expect "detects the backend network being trusted" 1 "$code" "$out" "FAIL  X-Admin-Device from the $bnet network → 404"

echo "▸ trust list includes the web container"
stub_api "$trust,10.231.0.21" 0
out=$(run_check); code=$?
expect "fails on the trust list itself" 1 "$code" "$out" "FAIL  ADMIN_TRUSTED_SOURCES"
expect "…and on the web container probe" 1 "$code" "$out" "FAIL  X-Admin-Device from the web container → 404"

echo
printf '%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

#!/usr/bin/env sh
# ─────────────────────────────────────────────────────────────────────────────
# Deploy-time check: the admin trust boundary (PLAN.md §9.2, DEPLOY.md).
#
# Run by deploy-api.yml on the server AFTER the new colour is up and BEFORE the
# nginx flip. Any failure aborts the deploy (exit 1), and the old colour keeps serving.
#
#   verify-api-isolation.sh <blue|green>
#
# Proves, against the running containers:
#   1. the API container publishes NO host port
#   2. it sits on the portfolio network at its planned fixed IP
#   3. its ADMIN_TRUSTED_SOURCES equals the plan (exact IPs: gateway + admin blue/green)
#   4. X-Admin-Device from host nginx's address (the bridge gateway) is ACCEPTED
#   5. X-Admin-Device from any other address on the portfolio network → 404
#   6. X-Admin-Device from the live web container → 404
#   7. X-Admin-Device from the backend network (Examination's containers) → 404
#   8. nginx pins X-Real-IP to $remote_addr in every portfolio location
#   9. nothing listens on the old loopback-publish ports
#
# Every name can be overridden (for deploy/checks/test/run.sh, which exercises this
# script against stub containers).
# ─────────────────────────────────────────────────────────────────────────────
set -eu

COLOR="${1:?usage: verify-api-isolation.sh <blue|green>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../ip-plan.env
. "${PF_IP_PLAN:-$HERE/../ip-plan.env}"
PF_NETWORK="${PF_NETWORK_NAME:-$PF_NETWORK}" # override for the stub harness

case "$COLOR" in
    blue) API_IP="$PF_API_BLUE" ;;
    green) API_IP="$PF_API_GREEN" ;;
    *) echo "unknown colour: $COLOR" >&2; exit 2 ;;
esac

API_CONTAINER="${PF_API_CONTAINER:-portfolio-api-$COLOR}"
WEB_CONTAINER="${PF_WEB_CONTAINER:-}" # the live web container (optional; auto-detected below)
BACKEND_NETWORK="${PF_BACKEND_NETWORK:-backend}"
PROBE_IMAGE="${PF_PROBE_IMAGE:-curlimages/curl:8.10.1}"
PROBE_IP="${PF_PROBE_IP:-10.231.0.250}" # an unassigned address on the portfolio network
PORT="$PF_CONTAINER_PORT"
PATH_UNDER_TEST="/v1/admin/auth/pending"
# How "host nginx" reaches the container. Default: curl on this host (source = bridge gateway).
HOST_CURL="${PF_HOST_CURL:-curl}"

fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n        %s\n' "$1" "$2"; fails=$((fails + 1)); }

status_from_host() {
    $HOST_CURL -s -o /dev/null -m 5 -w '%{http_code}' -H 'X-Admin-Device: deploy-check' "http://$API_IP:$PORT$PATH_UNDER_TEST" || echo 000
}

status_from_network() { # <network> [--ip <ip>] <target-ip>
    net="$1"
    shift
    target=""
    ipflag=""
    if [ "$1" = "--ip" ]; then ipflag="--ip $2"; shift 2; fi
    target="$1"
    # shellcheck disable=SC2086
    docker run --rm --network "$net" $ipflag "$PROBE_IMAGE" -s -o /dev/null -m 5 -w '%{http_code}' \
        -H 'X-Admin-Device: deploy-check' "http://$target:$PORT$PATH_UNDER_TEST" 2>/dev/null || echo 000
}

echo "Admin trust boundary: $API_CONTAINER ($API_IP)"

# 1. no published host port
ports="$(docker port "$API_CONTAINER" 2>/dev/null || true)"
if [ -z "$ports" ]; then pass "publishes no host port"; else fail "publishes no host port" "docker port: $ports"; fi

# 2. fixed IP on the portfolio network
actual_ip="$(docker inspect -f "{{with index .NetworkSettings.Networks \"$PF_NETWORK\"}}{{.IPAddress}}{{end}}" "$API_CONTAINER" 2>/dev/null || true)"
if [ "$actual_ip" = "$API_IP" ]; then pass "on $PF_NETWORK at $API_IP"; else fail "on $PF_NETWORK at $API_IP" "found '${actual_ip:-none}'"; fi

# 3. trust list equals the plan (order-insensitive)
norm() { printf '%s' "$1" | tr ',' '\n' | sed 's/[[:space:]]//g' | grep -v '^$' | sort | tr '\n' ','; }
actual_trust="$(docker exec "$API_CONTAINER" printenv ADMIN_TRUSTED_SOURCES 2>/dev/null || true)"
if [ "$(norm "$actual_trust")" = "$(norm "$PF_ADMIN_TRUSTED_SOURCES")" ]; then
    pass "ADMIN_TRUSTED_SOURCES = $PF_ADMIN_TRUSTED_SOURCES"
else
    fail "ADMIN_TRUSTED_SOURCES = $PF_ADMIN_TRUSTED_SOURCES" "container has '${actual_trust:-<unset>}'"
fi

# 4. accepted from host nginx (bridge gateway)
code="$(status_from_host)"
if [ "$code" = 200 ]; then pass "X-Admin-Device from host nginx (gateway $PF_GATEWAY) accepted"; else fail "X-Admin-Device from host nginx accepted" "HTTP $code (expected 200)"; fi

# 5. rejected from another address on the portfolio network
code="$(status_from_network "$PF_NETWORK" --ip "$PROBE_IP" "$API_IP")"
if [ "$code" = 404 ]; then pass "X-Admin-Device from $PROBE_IP (portfolio network) → 404"; else fail "X-Admin-Device from $PROBE_IP → 404" "HTTP $code"; fi

# 6. rejected from the live web container
if [ -z "$WEB_CONTAINER" ]; then
    WEB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E '^portfolio-web-(blue|green)$' | head -1 || true)"
fi
if [ -n "$WEB_CONTAINER" ]; then
    code="$(docker exec "$WEB_CONTAINER" node -e "fetch('http://$API_IP:$PORT$PATH_UNDER_TEST',{headers:{'X-Admin-Device':'deploy-check'}}).then(r=>console.log(r.status)).catch(()=>console.log('000'))" 2>/dev/null || echo 000)"
    if [ "$code" = 404 ]; then pass "X-Admin-Device from the web container ($WEB_CONTAINER) → 404"; else fail "X-Admin-Device from the web container → 404" "HTTP $code"; fi
else
    echo "  SKIP  no running web container to probe from (first deploy)"
fi

# 7. rejected from the backend network
backend_ip="$(docker inspect -f "{{with index .NetworkSettings.Networks \"$BACKEND_NETWORK\"}}{{.IPAddress}}{{end}}" "$API_CONTAINER" 2>/dev/null || true)"
if [ -n "$backend_ip" ]; then
    code="$(status_from_network "$BACKEND_NETWORK" "$backend_ip")"
    if [ "$code" = 404 ]; then pass "X-Admin-Device from the $BACKEND_NETWORK network → 404"; else fail "X-Admin-Device from the $BACKEND_NETWORK network → 404" "HTTP $code"; fi
else
    fail "API is on the $BACKEND_NETWORK network (needs db/redis/rabbitmq)" "no $BACKEND_NETWORK address"
fi

# 8. nginx pins X-Real-IP (skippable for the stub harness, which has no host nginx)
if [ "${PF_SKIP_NGINX:-0}" != 1 ]; then
    conf="$(nginx -T 2>/dev/null || true)"
    snippet="$(printf '%s' "$conf" | awk '/# configuration file .*portfolio-proxy.conf/{f=1;next} /# configuration file /{f=0} f')"
    includes="$(printf '%s' "$conf" | grep -c 'include /etc/nginx/snippets/portfolio-proxy.conf;' || true)"
    if printf '%s' "$snippet" | grep -q 'proxy_set_header X-Real-IP[[:space:]]*\$remote_addr;' && [ "$includes" -ge 6 ]; then
        pass "nginx sets X-Real-IP \$remote_addr in every portfolio location ($includes)"
    else
        fail "nginx sets X-Real-IP \$remote_addr in every portfolio location" "snippet ok? includes=$includes"
    fi
fi

# 9. nothing on the old loopback-publish ports
if [ "${PF_SKIP_NGINX:-0}" != 1 ]; then
    legacy="$(ss -tlnH 2>/dev/null | awk '{print $4}' | grep -E ':(3101|3102|4301|4302|4311|4312)$' || true)"
    if [ -z "$legacy" ]; then pass "no listener on 3101/3102/4301/4302/4311/4312"; else fail "no listener on the old publish ports" "$legacy"; fi
fi

if [ "$fails" -gt 0 ]; then
    echo "Admin trust boundary: $fails check(s) FAILED: aborting the deploy."
    exit 1
fi
echo "Admin trust boundary: all checks passed."

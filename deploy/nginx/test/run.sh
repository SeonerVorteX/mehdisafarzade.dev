#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Device gate + vhost test harness (PLAN.md §10.4).
#
# Runs the REAL deploy/nginx files (conf.d/, snippets/device-gate.conf,
# snippets/portfolio-proxy.conf, sites-enabled/portfolio.conf) in nginx:1.24, the
# server's version. Only two things are swapped for test doubles:
#   - snippets/portfolio-origin-tls.conf → a self-signed cert, no client-cert check
#   - upstreams/*.conf                   → stub servers that echo what they received
#
# Usage: deploy/nginx/test/run.sh        (needs Docker, curl, openssl; works in Git Bash)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash: don't rewrite /etc/... arguments passed to docker

here="$(cd "$(dirname "$0")" && pwd)"
src="$(cd "$here/.." && pwd)"
work="$(mktemp -d)"
port="${PF_GATE_TEST_PORT:-18443}"
net=pf-gate-test-net
gate=pf-gate-test
stub=pf-gate-stub
host_admin=admin.mehdisafarzade.dev
host_api=api.mehdisafarzade.dev
host_www=www.mehdisafarzade.dev
host_apex=mehdisafarzade.dev

winpath() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }
cleanup() {
    docker rm -f "$gate" "$stub" >/dev/null 2>&1 || true
    docker network rm "$net" >/dev/null 2>&1 || true
    rm -rf "$work"
}
[ "${PF_GATE_KEEP:-}" = 1 ] || trap cleanup EXIT
secret() { openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\r\n'; }

pass=0
fail=0
ok() { pass=$((pass + 1)); printf '  \033[32m✓\033[0m %s\n' "$1"; }
ko() { fail=$((fail + 1)); printf '  \033[31m✗\033[0m %s\n      %s\n' "$1" "$2"; }
expect_eq() { if [ "$2" = "$3" ]; then ok "$1"; else ko "$1" "expected [$2] got [$3]"; fi; }
expect_has() { if grep -qF -- "$2" <<<"$3"; then ok "$1"; else ko "$1" "missing [$2] in [$3]"; fi; }
expect_not() { if grep -qF -- "$2" <<<"$3"; then ko "$1" "unexpected [$2] in [$3]"; else ok "$1"; fi; }

# req HOST PATH [curl args...] → sets STATUS, BODY, HEADERS
req() {
    local h=$1 p=$2
    shift 2
    : >"$work/body"
    : >"$work/headers"
    # curl on Git Bash is a native Windows binary: give it a Windows path.
    STATUS=$(curl -sk -o "$(winpath "$work/body")" -D "$(winpath "$work/headers")" -w '%{http_code}' --path-as-is \
        --resolve "$h:$port:127.0.0.1" "$@" "https://$h:$port$p" || true)
    BODY=$(cat "$work/body")
    HEADERS=$(tr -d '\r' <"$work/headers")
}
reload() { docker exec "$gate" sh -c 'nginx -t -q && nginx -s reload' 2>/dev/null; sleep 1; }

echo "▸ building test images"
tok_pc=$(secret)
tok_laptop=$(secret)
unlock_key=$(secret)
tok_new=$(secret)

mkdir -p "$work/gate"/{conf.d,snippets,sites-enabled,upstreams,device-gate,certs} "$work/stub"
cp "$src/conf.d/"*.conf "$work/gate/conf.d/"
cp "$src/snippets/device-gate.conf" "$src/snippets/portfolio-proxy.conf" "$work/gate/snippets/"
cp "$src/sites-enabled/portfolio.conf" "$work/gate/sites-enabled/"

# Generated in a container: identical in CI and on Windows (Git's openssl lacks a config file).
docker run --rm -v "$(winpath "$work/gate/certs"):/out" alpine/openssl req -x509 -nodes -newkey rsa:2048 -days 2 \
    -subj "/CN=mehdisafarzade.dev" -addext "subjectAltName=DNS:mehdisafarzade.dev,DNS:*.mehdisafarzade.dev" \
    -keyout /out/test.key -out /out/test.pem >/dev/null 2>&1
cat >"$work/gate/snippets/portfolio-origin-tls.conf" <<'EOF'
ssl_certificate     /etc/ssl/cloudflare/test.pem;
ssl_certificate_key /etc/ssl/cloudflare/test.key;
ssl_protocols       TLSv1.2 TLSv1.3;
EOF
for up in api:8001 web:8002 admin:8003; do
    printf 'server %s:%s;\n' "$stub" "${up#*:}" >"$work/gate/upstreams/portfolio_${up%%:*}_targets.conf"
done
cat >"$work/gate/device-gate/$host_admin.map" <<EOF
"$host_admin:$tok_pc" pc; # enrolled 2026-09-25T00:00:00Z
"$host_admin:$tok_laptop" laptop; # enrolled 2026-09-25T00:00:00Z
EOF
printf '"%s:%s" %s;\n' "$host_admin" "$unlock_key" "$tok_new" >"$work/gate/device-gate/$host_admin.unlock"
printf '"%s:%s" newdevice; # enrolled 2026-09-25T00:00:00Z\n' "$host_admin" "$tok_new" >>"$work/gate/device-gate/$host_admin.map"
tok_upper=$(secret)
printf '"%s:%s" LAPTOP; # enrolled 2026-09-25T00:00:00Z\n' "$host_admin" "$tok_upper" >>"$work/gate/device-gate/$host_admin.map"

cat >"$work/gate/nginx.conf" <<'EOF'
user nginx;
worker_processes 1;
error_log /dev/stderr warn;
pid /var/run/nginx.pid;
events { worker_connections 256; }
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    server_tokens off;
    limit_req_status 429;
    access_log /dev/stdout;
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF
cat >"$work/gate/Dockerfile" <<'EOF'
FROM nginx:1.24
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
COPY snippets/ /etc/nginx/snippets/
COPY sites-enabled/ /etc/nginx/sites-enabled/
COPY upstreams/ /etc/nginx/upstreams/
COPY certs/ /etc/ssl/cloudflare/
COPY device-gate/ /etc/nginx/device-gate/
RUN chmod 700 /etc/nginx/device-gate && chmod 600 /etc/nginx/device-gate/*
EOF

cat >"$work/stub/default.conf" <<'EOF'
map $server_port $upstream_name { 8001 api; 8002 web; 8003 admin; }
server {
    listen 8001; listen 8002; listen 8003;
    location / {
        default_type text/plain;
        return 200 "upstream=$upstream_name uri=$request_uri device=[$http_x_admin_device] realip=[$http_x_real_ip] xff=[$http_x_forwarded_for]\n";
    }
}
EOF
printf 'FROM nginx:1.24-alpine\nCOPY default.conf /etc/nginx/conf.d/default.conf\n' >"$work/stub/Dockerfile"

docker build -q -t pf-gate-test-img "$(winpath "$work/gate")" >/dev/null
docker build -q -t pf-gate-stub-img "$(winpath "$work/stub")" >/dev/null
docker network create "$net" >/dev/null
docker run -d --name "$stub" --network "$net" pf-gate-stub-img >/dev/null
docker run -d --name "$gate" --network "$net" -p "127.0.0.1:$port:443" pf-gate-test-img >/dev/null
for _ in $(seq 1 30); do
    if curl -sk -o /dev/null --resolve "$host_admin:$port:127.0.0.1" "https://$host_admin:$port/"; then break; fi
    sleep 0.5
done

echo "▸ nginx -t on the real config"
if docker exec "$gate" nginx -t -q >/dev/null 2>&1; then
    ok "configuration is valid"
else
    ko "configuration is valid" "nginx -t failed:"
    docker logs "$gate" 2>&1 | tail -20
    exit 1
fi

echo "▸ admin host: the gate"
req "$host_admin" /
expect_eq "no cookie → 404" 404 "$STATUS"
nocookie_body="$BODY"
expect_not "404 does not reach the admin app" "upstream=" "$BODY"
expect_has "404 is not cacheable" "cache-control: private, no-store" "${HEADERS,,}"

req "$host_admin" / -H "Cookie: __Host-dg=$(secret)"
expect_eq "unknown token → 404" 404 "$STATUS"
req "$host_admin" / -H "Cookie: __Host-dg=short"
expect_eq "malformed token → 404" 404 "$STATUS"
req "$host_admin" / -H "Cookie: x__Host-dg=$tok_pc"
expect_eq "look-alike cookie name → 404" 404 "$STATUS"
req "$host_admin" / -H "Cookie: __Host-dg=$tok_pc" -H "Host: $host_api"
expect_eq "token is bound to its host (sent to api.*) → not the admin app" "" "$(grep -o 'upstream=admin' <<<"$BODY" || true)"

req "$host_admin" / -H "Cookie: __Host-dg=$tok_pc"
expect_eq "enrolled device → 200" 200 "$STATUS"
expect_has "reaches the admin app with its device name" "upstream=admin uri=/ device=[pc]" "$BODY"
req "$host_admin" / -H "Cookie: a=1; __Host-dg=$tok_laptop; b=2"
expect_has "cookie among other cookies works (laptop)" "device=[laptop]" "$BODY"
req "$host_admin" /api/auth/me -H "Cookie: __Host-dg=$tok_upper"
expect_has "nginx forwards a mis-cased device name VERBATIM (so gate.ps1 must reject it; the API 404s it)" "device=[LAPTOP]" "$BODY"
req "$host_admin" / -H "Cookie: __Host-dg=$tok_pc" -H "X-Admin-Device: laptop"
expect_has "client-sent X-Admin-Device is overwritten" "device=[pc]" "$BODY"
expect_has "admin responses are not cacheable" "cache-control: private, no-store" "${HEADERS,,}"

for p in /_next/static/chunk.js /api/auth/me /api/ /favicon.ico; do
    req "$host_admin" "$p"
    expect_eq "no cookie on $p → 404" 404 "$STATUS"
done
req "$host_admin" "/%2e%2e/api/auth/me"
expect_eq "traversal above root is rejected by nginx itself (400)" 400 "$STATUS"
expect_not "…and never proxied" "upstream=" "$BODY"
req "$host_admin" /api/auth/me -H "Cookie: __Host-dg=$tok_pc"
expect_has "/api/* → portfolio-api /v1/admin/* with the device" "upstream=api uri=/v1/admin/auth/me device=[pc]" "$BODY"
req "$host_admin" "/api/posts?page=2" -H "Cookie: __Host-dg=$tok_pc"
expect_has "/api/* keeps the query string" "uri=/v1/admin/posts?page=2" "$BODY"
req "$host_admin" /_next/static/chunk.js -H "Cookie: __Host-dg=$tok_pc"
expect_has "/_next/* is gated and proxied to admin" "upstream=admin uri=/_next/static/chunk.js" "$BODY"

echo "▸ admin host: enrollment (unlock)"
req "$host_admin" "/__dg/unlock?k=$(secret)"
expect_eq "wrong unlock key → 404" 404 "$STATUS"
expect_eq "wrong unlock key sets no cookie" "" "$(grep -i '^set-cookie' <<<"$HEADERS" || true)"
expect_eq "unlock 404 body is identical to the gate 404" "$nocookie_body" "$BODY"
req "$host_admin" "/__dg/unlock"
expect_eq "no key → 404" 404 "$STATUS"

req "$host_admin" "/__dg/unlock?k=$unlock_key"
expect_eq "valid unlock key → 302" 302 "$STATUS"
expect_has "redirects to /" "location: /" "${HEADERS,,}"
cookie_line=$(grep -i '^set-cookie:' <<<"$HEADERS" || true)
expect_has "sets the device token" "__Host-dg=$tok_new" "$cookie_line"
for attr in "Path=/" "Max-Age=31536000" "Secure" "HttpOnly" "SameSite=Lax"; do
    expect_has "cookie attribute $attr" "$attr" "$cookie_line"
done
expect_not "cookie has no Domain" "Domain" "$cookie_line"
req "$host_admin" / -H "Cookie: __Host-dg=$tok_new"
expect_has "the handed-out cookie passes the gate" "device=[newdevice]" "$BODY"

log=$(docker exec "$gate" cat /var/log/nginx/device-gate.log 2>/dev/null || true)
expect_has "enrollment is logged with the device name" " $host_admin newdevice 302" "$log"
expect_not "log never contains the unlock key" "$unlock_key" "$log"
expect_not "log never contains the token" "$tok_new" "$log"
std_log=$(docker logs "$gate" 2>&1 || true)
expect_not "standard access log never sees the unlock key" "$unlock_key" "$std_log"

docker exec "$gate" sh -c ": > /etc/nginx/device-gate/$host_admin.unlock"
reload
req "$host_admin" "/__dg/unlock?k=$unlock_key"
expect_eq "used + removed unlock key → 404" 404 "$STATUS"

docker exec "$gate" sh -c "sed -i '/ laptop;/d' /etc/nginx/device-gate/$host_admin.map"
reload
req "$host_admin" / -H "Cookie: __Host-dg=$tok_laptop"
expect_eq "revoked device → 404" 404 "$STATUS"
req "$host_admin" / -H "Cookie: __Host-dg=$tok_pc"
expect_eq "other devices unaffected by a revoke" 200 "$STATUS"

echo "▸ api host"
for p in /v1/admin/auth/me /V1/Admin/auth/me /v1/ADMIN /v1//admin/auth/me /v1/%61dmin/auth/me /v1/./admin/x "/v1/x/../admin/auth/me" /v1/admin; do
    req "$host_api" "$p" -H "Cookie: __Host-dg=$tok_pc"
    expect_eq "api $p → 404 (never proxied)" 404 "$STATUS"
done
req "$host_api" /v1/profile -H "X-Admin-Device: pc"
expect_has "api forwards public routes" "upstream=api uri=/v1/profile" "$BODY"
expect_has "api clears a spoofed X-Admin-Device" "device=[]" "$BODY"
req "$host_api" /v1/profile -H "X-Forwarded-For: 6.6.6.6" -H "X-Real-IP: 6.6.6.6"
expect_not "client X-Forwarded-For is not passed through" "6.6.6.6" "$BODY"
req "$host_api" /v1/health
expect_eq "public /v1/health → 403" 403 "$STATUS"
req "$host_api" /v1/administrators-not-a-thing
expect_eq "api prefix match is anchored at a path segment (/v1/administrators… → proxied)" 200 "$STATUS"

echo "▸ www / apex"
req "$host_www" /en -H "X-Admin-Device: pc"
expect_has "www → web" "upstream=web uri=/en device=[]" "$BODY"
req "$host_www" /_next/static/app.js
expect_has "static assets are immutable" "cache-control: public, max-age=31536000, immutable" "${HEADERS,,}"
req "$host_apex" "/en/blog?x=1"
expect_eq "apex → 301" 301 "$STATUS"
expect_has "apex keeps path + query" "location: https://www.mehdisafarzade.dev/en/blog?x=1" "${HEADERS,,}"

echo
printf '%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]

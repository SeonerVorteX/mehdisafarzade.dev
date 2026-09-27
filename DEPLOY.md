# DEPLOY.md

Production deployment of mehdisafarzade.dev to the shared VPS (behind the existing nginx and Cloudflare).

> **Status:** skeleton. It holds the network/IP plan and the checks that already exist. The full runbook (images, compose, workflows, cutover) is written in **Phase 9**, and **nothing is changed on the server before you review it**.

## IP plan

Source of truth: [`deploy/ip-plan.env`](deploy/ip-plan.env). The compose files, the CI-generated nginx upstream files, the API's `ADMIN_TRUSTED_SOURCES` and the deploy check all read from it, so change them only together.

| | Address | Trusted to send `X-Admin-Device` / `X-Real-IP`? |
|---|---|---|
| Docker network `portfolio` | `10.231.0.0/24` | n/a |
| Gateway (host side of the bridge = **host nginx**) | `10.231.0.1` | **yes** |
| `portfolio-api-blue` / `-green` | `10.231.0.11` / `.12` | n/a (it's the API). Also on `backend` for db/redis/rabbitmq. |
| `portfolio-web-blue` / `-green` | `10.231.0.21` / `.22` | **no** |
| `portfolio-admin-blue` / `-green` | `10.231.0.31` / `.32` | **yes** |
| anything else on `portfolio`, anything on `backend` | | **no** |

- **No host ports are published** by any portfolio container. nginx (a host process) proxies to the bridge IPs above on port `3000`.
- The subnet was checked with a read-only `docker network inspect` on 2026-09-27: `bridge` 172.17.0.0/16 and `backend` 172.18.0.0/16 exist, with no custom Docker address pools. 10.231.0.0/24 is outside Docker's default pools and every host route.
- API env (production): `ADMIN_TRUSTED_SOURCES=10.231.0.1,10.231.0.31,10.231.0.32`. **Exact IPs only.** The API refuses to start if the value is missing, empty, a CIDR, or unparseable.

## One-time server preparation (Phase 9; each step shown to you before running)

1. `docker network create --driver bridge --subnet 10.231.0.0/24 --gateway 10.231.0.1 portfolio`
2. Postgres role/database, RabbitMQ vhost/user (PLAN.md §9.5).
3. Directories, env files (written by you from the `.env.example` files), Cloudflare origin certificate, and the initial upstream files `upstreams/portfolio_{api,web,admin}_targets.conf` (examples in `deploy/nginx/upstreams/`).
4. nginx files via the Examination VPS mirror (`deploy-nginx.sh`), as an approved diff (PLAN.md §10).

## Checks that run on every deploy

| Check | Where | Fails the deploy when |
|---|---|---|
| Admin trust boundary: `deploy/checks/verify-api-isolation.sh <colour>` | deploy-api.yml, after the new colour is healthy, **before** the nginx flip | the API publishes a host port · isn't at its planned IP · its `ADMIN_TRUSTED_SOURCES` ≠ the plan · host nginx (gateway) is NOT accepted · a probe from another `portfolio` IP, from the live web container, or from the `backend` network is NOT answered 404 · nginx doesn't pin `X-Real-IP $remote_addr` in every portfolio location · anything listens on the old ports 3101/3102/4301/4302/4311/4312 |
| API health | same, before the flip | `GET http://10.231.0.1x:3000/v1/health` isn't 200 |

The check is tested in CI against stub containers (`deploy/checks/test/run.sh`: correct setup passes; published-port, trust-everyone and web-in-trust-list setups fail). The API side is tested by `api/test/admin-trust.e2e-spec.ts`: web/backend → 404, nginx/admin → accepted, `X-Real-IP` only from trusted peers.

## Residual risks (accepted)

- Any process on the VPS host itself connects from the gateway address and is trusted. The host is single-owner (root). A shell there could read the device-gate maps anyway.
- Zone-level Authenticated Origin Pulls accepts any Cloudflare zone until per-hostname AOP is switched on (PLAN.md §9.6).

# Local development

Prerequisites: **Docker Desktop** (running), **Node 22+**, git, Windows PowerShell 5.1 or pwsh.

## One command

```powershell
.\deploy\dev.ps1 up
```

That does everything, in order:

1. **Env files.** Creates `api/.env.dev`, `frontend/apps/web/.env.local` and `frontend/apps/admin/.env.local` if they're missing, with fresh dev-only secrets. **Existing env files are never touched.** Your admin email defaults to `git config user.email` (override with `-AdminEmail you@example.com`), and a random password goes in `SEED_ADMIN_PASSWORD` in `api/.env.dev`.
2. **Dependencies.** Runs `yarn install` in `api/` and `frontend/` if `node_modules` is missing.
3. **Containers.** Starts Postgres, Redis, RabbitMQ, S3 (SeaweedFS) and Mailpit (`portfolio-*`, loopback-only ports).
4. **Database.** Runs migrations and the seed. The seed is idempotent and never overwrites CMS edits.
5. **Device gate.** Starts the local gate on `https://localhost:8443` (same nginx config as production).
6. **Apps.** Starts the API (`:3100`, watch mode) and both Next apps (web `:5600`, admin `:5603`) in the background, and waits until each answers.
7. **First run only.** Enrolls your default browser in the gate as `pc` (`-Device <name>` to change it, `-NoBrowser` to skip).

Then open **https://localhost:8443**, accept the self-signed certificate once, sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, and set up TOTP.

| URL | What |
|---|---|
| http://localhost:5600 | public site |
| https://localhost:8443 | admin, through the device gate (http://localhost:5603 directly has no gate device, so the admin API refuses it) |
| http://localhost:3100/v1 | API |
| http://localhost:8026 | Mailpit, catches every email |
| http://localhost:15673 | RabbitMQ UI (`portfolio` / `portfolio`) |

Other commands:

```powershell
.\deploy\dev.ps1 status   # containers, processes, and what each port answers
.\deploy\dev.ps1 down     # stop apps, gate and containers (data kept)
.\deploy\dev.ps1 reset    # wipe DB/Redis/RabbitMQ/S3 + logs after typing 'reset' (env files + enrolled devices kept)
.\deploy\dev.ps1 init     # only create missing env files
```

Logs from the background processes are in `deploy/.dev/logs/` (`api.log`, `next.log`). `up` refuses to start if ports 3100/5600/5603 are already taken by processes it didn't start. It never kills anything it doesn't own.

## Manual fallback

```bash
# API
cd api
cp .env.example .env.dev                                  # fill it in (comments explain each value)
node .yarn/releases/yarn-4.12.0.cjs install
node .yarn/releases/yarn-4.12.0.cjs start:dev             # containers + migrations + API in watch mode
node .yarn/releases/yarn-4.12.0.cjs prisma:dev:seed

# Frontend (web + admin)
cd frontend
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
node .yarn/releases/yarn-4.12.0.cjs install
node .yarn/releases/yarn-4.12.0.cjs dev
```

```powershell
# Device gate
.\deploy\device-gate\gate.ps1 up -Target local
.\deploy\device-gate\gate.ps1 enroll -Device pc -Target local
```

## Checks before committing

```bash
cd frontend && yarn ci                          # typecheck, lint, tests, i18n:check
cd api && yarn lint && yarn test && yarn test:e2e   # e2e uses a disposable Postgres (removed afterwards)
bash deploy/nginx/test/run.sh                   # nginx device gate + vhosts
powershell -File deploy/device-gate/test/test-gate.ps1   # gate.ps1 argument handling
```

## Troubleshooting

- **The browser shows a certificate warning** on https://localhost:8443. Expected (self-signed). Choose *Advanced → Proceed*.
- **The admin shows 404.** This browser isn't enrolled (or you're in a private window). Run `.\deploy\device-gate\gate.ps1 enroll -Device pc -Target local`.
- **The API won't start.** Check `deploy/.dev/logs/api.err.log`. A `FATAL: invalid environment` line names the variable to fix in `api/.env.dev`.
- **A yarn version mismatch.** A user-level `~/.yarnrc.yml` can pin another Yarn. The scripts always call the repo's pinned `node .yarn/releases/yarn-4.12.0.cjs`.

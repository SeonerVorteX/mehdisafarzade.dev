# mehdisafarzade.dev

The personal site of Mehdi Safarzade: a public portfolio + blog (az/en/ru), a separate admin CMS, and a NestJS API.

| Part | Path | Local URL |
|---|---|---|
| Public site | `frontend/apps/web` | http://localhost:5600 |
| Admin CMS | `frontend/apps/admin` | https://localhost:8443 (through the local device gate, Phase 3) |
| API | `api/` | http://localhost:3100/v1 |

## Quick start

Prerequisites: Node 22+, Docker Desktop.

```bash
# API
cd api
cp .env.example .env.dev        # fill in values (see comments in the file)
node .yarn/releases/yarn-4.12.0.cjs install
node .yarn/releases/yarn-4.12.0.cjs start:dev    # starts portfolio-* dev containers, migrates, runs the API
node .yarn/releases/yarn-4.12.0.cjs prisma:dev:seed   # once: profile/projects + your admin (SEED_ADMIN_*)

# Frontend (both apps)
cd frontend
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
node .yarn/releases/yarn-4.12.0.cjs install
node .yarn/releases/yarn-4.12.0.cjs dev
```

Admin (through the local device gate, exactly like production):

```powershell
cd deploy\device-gate
.\gate.ps1 up -Target local                  # nginx gate on https://localhost:8443
.\gate.ps1 enroll -Device pc -Target local   # opens the one-time link, sets the device cookie
# then open https://localhost:8443 → sign in with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD → set up TOTP
```

Checks: `yarn ci` in `frontend/` and in `api/`, and `bash deploy/nginx/test/run.sh` for the nginx gate. See `AGENTS.md` for conventions and `PLAN.md` for the architecture.

## License

Apache-2.0 (see `LICENSE`).

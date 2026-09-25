# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

> `AGENTS.md` holds the shared rules (layout, commands, conventions, safety). This file adds status and pointers. Where they disagree, fix the one that is wrong: they should never disagree.

## Where things stand

The phase plan is in `PLAN.md` §16. Every phase ends with `yarn ci` green in the half it touched and a conventional commit on `v2`. The owner approves at the ☑ checkpoints.

| Phase | Status |
|---|---|
| 0 Plan | done (`PLAN.md`, `SEED_REVIEW.md`) |
| 1 Scaffold | done |
| 2 Backend foundation | in progress |
| 3 Admin auth + device gate | not started |

## Read these first

- `PLAN.md` §0 (decisions), §8 (device gate + admin auth), §9 (infra), §15 (risks).
- `frontend/CLAUDE.md` for the frontend's app structure and styling rules.
- `api/CLAUDE.md` for the API's bootstrap, module layout, and auth realm.

## Environment gotchas (this machine)

- The shell is Git Bash on Windows. Long heredocs have been unreliable through the agent's Bash tool, so write files with the editor tools.
- The user-level `~/.yarnrc.yml` pins a different Yarn. Call `node .yarn/releases/yarn-4.12.0.cjs` inside `frontend/` or `api/`.
- Docker Desktop has to be running for `api` dev/test services.

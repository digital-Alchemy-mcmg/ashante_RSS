# Ashante RSS — Public Telemetry Mirror

Read-only telemetry projection for the Ashante MVP control plane.

## Authority

- **Google control plane is authoritative.**
- This repository is a **non-authoritative read/observation mirror**.
- Consumers must never treat this repository as a command surface or source of truth for writes.
- A stale or unavailable mirror must fail closed rather than infer current state.

## Primary renderer feed

Use `feed.json` as the single pull target for renderers and lightweight observers.

Raw endpoint:

`https://raw.githubusercontent.com/digital-Alchemy-mcmg/ashante_RSS/main/feed.json`

The renderer should fetch this file on each pull/refresh and hand the normalized payload to its existing `getCurrentAshanteState()` boundary.

## Supporting feeds

- `state/tasks.json` — task/lane/build-state telemetry
- `state/workers.json` — worker/verifier observation state
- `state/dependencies.json` — dependency graph
- `state/verification.json` — verification outcomes and retry telemetry
- `state/health.json` — feed freshness and mirror health
- `events/latest.json` — compact recent transition tail
- `schema/feed.schema.json` — feed contract

## State vocabulary

`NOT_STARTED`, `READY`, `ACTIVE`, `BUILT_WAITING_VERIFICATION`, `PASS`, `REWORK`, `BLOCKED`, `WAIT_DEP`, `STATE_UNAVAILABLE`

Important: **BUILT never means PASS.** Verification PASS is a separate durable state.

## Public-feed safety

This repo intentionally excludes secrets, credentials, private document contents, and write-capable tokens. Evidence is represented only by safe telemetry metadata, not private Google URLs.

## Consumer rule

Consumers may observe and reconcile from this mirror. Any authoritative state transition must be performed through the proper control-plane write path and then republished here.

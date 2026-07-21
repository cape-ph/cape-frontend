# Known Gaps and Unused API

Durable backlog-style knowledge distilled from prior notes and verified against the
current code. Captures where the frontend is incomplete and which backend
capabilities exist but are not yet surfaced.

## Frontend implementation gaps

- No form-state persistence: workflow submission form values are lost on refresh.
- Report ID is hardcoded to `bactopia-single-sample-analysis`
  ([[analyses/report-viewing-feature]]); not user-configurable, and there is no
  report list/search - the user must know the sample ID.
- No upload resume/recovery: any error aborts the whole multipart upload
  ([[concepts/multipart-upload]]); chunks upload sequentially, not in parallel.
- `drizzle.config.ts` references a nonexistent `src/lib/server/db/schema.ts`; no
  server/db layer exists (see [[concepts/external-dependencies-and-boundaries]]).
- `routes/+page.svelte` hardcodes the API base and the input S3 bucket rather than
  reading `PUBLIC_API_BASE` / configuration.

## Backend API surface not exposed in the UI

- `/dap/logs` - pipeline logs viewer.
- `/dap/status` - pipeline status.
- `/objstorage/contents`, `/objstorage/crawler` - storage browsing (a governed
  storage browser is sketched in `PLAN.md`).
- `/user/attribute[s]` - user profile management.
- `GET /workflows/tasks` - task-graph metadata is fetched-capable
  (`getWorkflowTasks`) but not currently rendered.
- `PipelineProfile.uiSchema` (JsonForms layout) and `inherits` (shared base config)
  are provided by the backend but not yet consumed ([[concepts/data-models]]).

## Dead code and unused dependencies

- `getPipelines` / `getPipelineProfile` in `pipeline.ts` (`/dap/pipelines`,
  `/dap/pipelineprofile`) are exported but have no call sites in `src/` - leftovers
  from the retired single-pipeline flow. There is no `/dap/submit` client function.
- `streamsaver` and `cookie` are declared in `package.json` but never imported in
  `src/`. Client-side workflow-run tracking (which used raw `document.cookie`) was
  removed in favor of server-side attribution
  ([[analyses/workflow-user-attribution]]), so nothing in `src/` persists runs
  locally anymore.
- `drizzle.config.ts` points at a nonexistent `src/lib/server/db/schema.ts` (see
  above).

## Frontend scalability follow-ups

- Per-user workflow run listing (`GET /workflows/runs`) filters Airflow runs in
  the API Lambda because Airflow has no server-side filter on the `conf.cape`
  value we key ownership on, with a `MAX_RUNS_SCANNED` cap that can silently drop
  a user's older runs. The durable fix is a database-backed run-ownership index
  (backend, `cape-ph/cape-cod`) plus real pagination in `getMyWorkflowRuns`.
  Fully specified in cape-ph/cape-frontend#30
  ([[analyses/workflow-user-attribution]]).

## Resolved (historical, for context)

Client-side AJV validation, workflow submission (backend CORS was resolved
2026-06-05), and workflow status monitoring are all implemented
([[analyses/workflow-submission-feature]],
[[analyses/workflow-status-monitoring-feature]]). Per-user run tracking now comes
from the CAPE API + Airflow state (bearer token on requests, `GET /workflows/runs`,
run ownership in `conf.cape`), replacing the former `workflow_runs` cookie
([[analyses/workflow-user-attribution]]).

## Related

- [[syntheses/cape-frontend-architecture-overview]]
- [[entities/cape-api]]

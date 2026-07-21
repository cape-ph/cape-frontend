# Workflow Status Monitoring Feature

The Workflows tab list and detail views track submitted Airflow DAG runs. Components
under `src/lib/components/Status/`: `Status.svelte` (list), `StatusDetail.svelte`
(detail), `WorkflowRunCard.svelte` (progress card), `HaltWorkflowModal.svelte`.
API client and types in `src/lib/workflowStatus.ts`.

## Source of truth

Runs are sourced from the CAPE API (Airflow state), scoped to the current user
server-side - there is no client-side (cookie/localStorage) run tracking. See
[[analyses/workflow-user-attribution]] for how ownership is recorded and
resolved.

- `Status.svelte` loads the user's runs via `getMyWorkflowRuns(baseUrl)` on
  mount into local `$state`, fetches task instances per run for the progress
  card, and keeps them in a `SvelteMap` keyed by `dag_run_id`.
- `StatusDetail.svelte` fetches the run + task instances directly and
  reconstructs the submission accordion from the run's Airflow `conf`
  (`conf.pipelineConfigs`) via `getPipelineConfigsFromRun`, not from storage.
  It also fetches stage profiles via `getWorkflowProfilesCached` (a
  session-scoped per-`dagId` cache in `pipeline.ts`) purely to show friendly
  stage names/versions; failure is non-fatal and falls back to `pipelineId`.
- All requests go through the shared `capi` axios client
  (`src/lib/apiClient.ts`), which attaches the Cognito access token as a Bearer
  `Authorization` header.

## API client (`workflowStatus.ts`)

- `getMyWorkflowRuns(baseUrl)` -> `GET /workflows/runs` (the current user's runs)
- `getWorkflowRun(baseUrl, dagId, dagRunId)` -> `GET /workflows/run`
- `getTaskInstances(...)` -> `GET /workflows/run/taskinstances`
- `getWorkflowTasks(baseUrl, dagId)` -> `GET /workflows/tasks`
- `haltWorkflow(baseUrl, dagId, dagRunId, note?)` -> `PATCH /workflows/halt`.
  Irreversible: terminates running tasks, sets run `state` to `failed`, stores the
  optional `note`. Only valid for running/queued runs.
- `getPipelineConfigsFromRun(run)` -> reads `run.conf.pipelineConfigs`.

States mirror Airflow: `queued`, `running`, `success`, `failed`, `skipped`,
`upstream_failed`, `up_for_retry`, `up_for_reschedule`, `restarting`, `deferred`,
`removed`.

## Behavior

- Detail view fetches run + task instances in parallel, renders summary card, task
  table, and a submission-config accordion (reconstructed from `conf`).
- Auto-refresh every 30s for running/queued runs; manual refresh always available.
  Because the list only returns runs that exist in Airflow for the user, the old
  "unavailable run" (404/retention) handling and cookie pruning are gone.
- `dag_run_id` has the form `manual+YYYY-MM-DDTHH:MM:SS+00:00`.
- URL query params (`tab`, `view`, `dagId`, `dagRunId`) drive navigation and
  browser back/forward.

## Related

- [[analyses/workflow-submission-feature]]
- [[analyses/workflow-user-attribution]]
- [[concepts/data-models]]
- [[entities/cape-api]]

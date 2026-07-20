# Workflow Status Monitoring Feature

The Workflows tab list and detail views track submitted Airflow DAG runs. Components
under `src/lib/components/Status/`: `Status.svelte` (list), `StatusDetail.svelte`
(detail), `WorkflowRunCard.svelte` (progress card), `HaltWorkflowModal.svelte`.
API client and types in `src/lib/workflowStatus.ts`.

## State and persistence

- `src/lib/workflowRuns.svelte.ts` - global reactive state:
  `{ stored: StoredWorkflowRun[], liveStatus: SvelteMap<string, WorkflowRunStatus> }`.
  Run key is `` `${dagId}::${dagRunId}` ``. `SvelteMap` makes live status updates
  reactive.
- `src/lib/workflowRunsStorage.ts` - cookie persistence in `workflow_runs`
  (90-day `max-age`, `SameSite=Strict`). Stores `StoredWorkflowRun`
  (`dagId`, `dagRunId`, `submittedAt`, optional `submissionConfig`). Parsing is
  defensive: validates structure and returns `[]` on any malformed cookie.

## API client (`workflowStatus.ts`)

- `getWorkflowRun(baseUrl, dagId, dagRunId)` -> `GET /workflows/run`
- `getTaskInstances(...)` -> `GET /workflows/run/taskinstances`
- `getWorkflowTasks(baseUrl, dagId)` -> `GET /workflows/tasks`
- `haltWorkflow(baseUrl, dagId, dagRunId, note?)` -> `PATCH /workflows/halt`.
  Irreversible: terminates running tasks, sets run `state` to `failed`, stores the
  optional `note`. Only valid for running/queued runs.

States mirror Airflow: `queued`, `running`, `success`, `failed`, `skipped`,
`upstream_failed`, `up_for_retry`, `up_for_reschedule`, `restarting`, `deferred`,
`removed`.

## Behavior

- Detail view fetches run + task instances in parallel, renders summary card, task
  table, and a submission-config accordion.
- Auto-refresh every 30s for running/queued runs; manual refresh always available.
  A run that the API returns 404 for (removed or past retention) is marked
  unavailable via `WorkflowRunStatus.isAvailable` and can be cleared from the list.
- `dag_run_id` has the form `manual+YYYY-MM-DDTHH:MM:SS+00:00`.
- URL query params (`tab`, `view`, `dagId`, `dagRunId`) drive navigation and
  browser back/forward.

## Related

- [[analyses/workflow-submission-feature]]
- [[concepts/data-models]]
- [[entities/cape-api]]

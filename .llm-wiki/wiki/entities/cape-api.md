# CAPE API

CAPE (Computational Analysis Platform for Epidemiology) API - the backend that
CAPE Frontend consumes. Default base URL `https://api.cape-dev.org/capi-dev`
(overridable via `PUBLIC_API_BASE`). Note: `routes/+page.svelte` currently also
hardcodes `apiBase = 'https://api.cape-dev.org/capi-dev'`.

## Endpoints used by the frontend

Pipelines / profiles (legacy `/dap/*` endpoints; the frontend no longer defines
client functions for these - `getPipelines` / `getPipelineProfile` were removed
when the single-pipeline flow was retired, though the backend endpoints remain):

- `GET /dap/pipelines` -> `Pipeline[]`
- `GET /dap/pipelineprofile?pipeline=&version=` -> `PipelineProfile`

There is no single-pipeline submit call in the current client (no `/dap/submit`
function exists); submission goes exclusively through `/workflows/trigger` below.

Workflows (current path):

- `GET /workflows` -> `{ dags: WorkflowDAG[] }`
- `GET /workflows/pipelineprofiles?dagId=` -> `PipelineProfile[]` (per stage)
- `POST /workflows/trigger?dagId=` -> `{ dag_run_id, dag_id }`. Body is
  `{ pipelineConfigs: Array<{ pipelineId, nextflowOptions }> }`; array order is
  positional and identifies each stage (a workflow may reuse a pipeline). Note the
  options field name is `nextflowOptions`, not the legacy `options`.
- `GET /workflows/run?dagId=&dagRunId=` -> `WorkflowRun`
- `GET /workflows/run/taskinstances?dagId=&dagRunId=` -> `TaskInstancesResponse`
- `PATCH /workflows/halt?dagId=&dagRunId=` (optional `{ note }`) -> `WorkflowRun`

Object storage (S3 multipart brokering):

- `POST /objstorage/creatempu`, `GET /objstorage/parturls`,
  `POST /objstorage/completempu`, `DELETE /objstorage/abortmpu`

Reports:

- `GET /report/create?sampleId=&reportId=&format=html` -> report HTML

`dag_run_id` uses the form `manual+YYYY-MM-DDTHH:MM:SS+00:00`. `PATCH /workflows/halt`
is irreversible: it terminates running tasks and sets the run `state` to `failed`,
storing the optional `note`.

## Backend model

Workflow endpoints are a facade over Apache Airflow (response shapes mirror Airflow's
REST API). Airflow orchestrates; actual pipeline steps run in AWS Batch
(`BatchOperator`). `PipelineProfile` also carries backend-authored hints not yet
consumed by the frontend: `uiSchema` (JsonForms layout) and `inherits` (shared base
config via JSON Schema `$ref`/`allOf`); `WorkflowTask.downstream_task_ids` expresses
the task graph. Cross-stage data flow is handled by the orchestrator (e.g. a Kraken2
stage's `--bactopia` input points at a prior Bactopia stage's `--outdir`). The dev
API uses a self-signed certificate.

## Unused API surface

Endpoints that exist on the backend but the UI does not expose: `/dap/logs`,
`/dap/status`, `/objstorage/contents`, `/objstorage/crawler`, `/user/attribute[s]`.
See [[analyses/known-gaps-and-unused-api]].

## Related

- [[concepts/data-models]]
- [[analyses/workflow-submission-feature]]
- [[analyses/workflow-status-monitoring-feature]]
- [[concepts/multipart-upload]]

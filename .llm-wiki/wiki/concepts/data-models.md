# Data Models

Key TypeScript types across the CAPE Frontend. All are plain interfaces/types; there
is no ORM or database layer in the frontend (see
[[concepts/external-dependencies-and-boundaries]] for the unused drizzle config).

## Pipeline / workflow definitions (`src/lib/pipeline.ts`)

- `PipelineProfile` - carries `parametersSchema` (JSON Schema, drives
  [[concepts/schema-driven-forms]]), plus `pipelineName`, `pipelineDescription`,
  `project`, `submission` (`encoding`, `optionsFieldName`), `pipelineType`,
  `version`, optional `pipelineRunnable`, `pipelineId`, `uiSchema`. The `submission`
  field is a legacy contract (its `encoding`/`optionsFieldName` are not used by the
  current workflow path). `uiSchema` is a JsonForms layout hint, not yet consumed by
  the frontend.
- `WorkflowDAG` - `dag_id`, `dag_display_name`, `description`, `is_paused`.
- The `/workflows/trigger` body is not a named type; `Submit.svelte`'s
  `serializeWorkflow()` builds it inline as
  `{ pipelineConfigs: Array<{ pipelineId, nextflowOptions }> }` (positional order
  significant).

## Schema-form types (`src/lib/schema.ts`)

- `SchemaProperty` - subset of JSON Schema: `type`, `title`, `description`,
  `default`, `const`, `enum`, `minimum`/`maximum` (and `min`/`max`/`step`).
- `ParameterField` - `key`, `label`, `schema`, `required`, `readonly`.
- `UnsupportedSchemaError` - `anyOf`/`oneOf` not renderable without a UI choice.

## Workflow-run types (`src/lib/workflowStatus.ts`)

- `WorkflowRunState` / `TaskInstanceState` - Airflow state union (`queued`,
  `running`, `success`, `failed`, `skipped`, `upstream_failed`, `up_for_retry`,
  `up_for_reschedule`, `restarting`, `deferred`, `removed`).
- `WorkflowRun`, `TaskInstance`, `TaskInstancesResponse` - Airflow REST shapes
  (snake_case).

## Upload types (`src/lib/mpu.ts`, `src/lib/stream.ts`)

- `MultipartUploadParams`, `MultipartUploadResult`, `OnProgress`, `ChunkStream`.
- `SampleMeta` (in `stream.ts`) - `sampleId`, `sampleType`, `sampleMatrix`,
  `sampleCollectionDate`.

## Naming note

API-facing types use snake_case matching the backend/Airflow payloads; internal
frontend types (e.g. the `pipelineConfigs` submission shape) use camelCase. This split is
intentional - do not "normalize" API types.

## Related

- [[concepts/schema-driven-forms]]
- [[entities/cape-api]]
- [[syntheses/cape-frontend-architecture-overview]]

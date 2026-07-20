# Workflow Submission Feature

The Workflows tab submit view triggers multi-stage bioinformatics workflows
(Airflow DAGs). Component: `src/lib/components/Submit/Submit.svelte` (the largest
component, ~876 lines). Built entirely on [[concepts/schema-driven-forms]].

## Flow

1. Fetch available workflows: `getWorkflows(baseUrl)` -> `GET {base}/workflows`
   returns `WorkflowDAG[]` (`dag_id`, `dag_display_name`, `description`,
   `is_paused`).
2. User selects a workflow DAG.
3. Fetch ordered stage profiles: `getWorkflowProfiles(baseUrl, dagId)` ->
   `GET {base}/workflows/pipelineprofiles?dagId=` returns `PipelineProfile[]`, one
   per stage.
4. For each stage, `getParameterFields()` derives fields from its
   `parametersSchema`; the UI renders one accordion section per stage.
5. User fills parameters; each stage is validated against its schema via AJV
   (`coerceOptionsForValidation` then `validate`).
6. Submit posts the assembled `pipelineConfigs` to
   `POST {base}/workflows/trigger?dagId=`. Payload shape:
   `{ pipelineConfigs: Array<{ pipelineId, nextflowOptions }> }` (built by
   `serializeWorkflow()`). The array is positional - order matches the profile
   response order and identifies each stage, since a workflow may reuse a pipeline.
   Response includes `{ dag_run_id, dag_id }`.
7. The run is persisted to the `workflow_runs` cookie with a `SubmissionConfig`
   snapshot and added to reactive state; the UI navigates to the detail view.

## Reactive chain

```
selectedWorkflowDagId ($state)
  -> $effect -> updateWorkflowProfiles() -> workflowProfiles (ordered $state)
  -> getParameterFields(profile.parametersSchema) per stage
  -> template renders one accordion form per stage
  -> serializeWorkflow() -> ordered pipelineConfigs payload
```

Stale profile responses are ignored if the user changes workflow before a fetch
resolves; profile state is cleared on change so an old form cannot be submitted.

## Cross-stage data flow

Stage inputs can reference a prior stage's outputs (e.g. a Kraken2 stage's
`--bactopia` points at a Bactopia stage's `--outdir`). The Airflow/AWS Batch
orchestrator wires this at run time; the frontend just submits per-stage options.

## Legacy single-pipeline path

`pipeline.ts` still exports `getPipelines` (`/dap/pipelines`) and
`getPipelineProfile` (`/dap/pipelineprofile`) from the older single-pipeline
submission flow, but neither has any call site in the current UI - workflow
submission fully replaced it. Treat them as dead exports pending removal
([[analyses/known-gaps-and-unused-api]]).

## Related

- [[analyses/workflow-status-monitoring-feature]]
- [[concepts/schema-driven-forms]]
- [[concepts/data-models]]
- [[entities/cape-api]]

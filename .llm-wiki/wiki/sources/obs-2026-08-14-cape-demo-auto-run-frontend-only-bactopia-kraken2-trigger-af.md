---
type: source
title: "Observation: CAPE demo auto-run: frontend-only bactopia/kraken2 trigger after upload (demoAutoRun.ts)"
tags:
  - cape
  - frontend
  - demo
  - bactopia
  - kraken2
  - workflow
  - auto-run
  - svelte
  - upload
status: observation
created: 2026-08-14
updated: 2026-08-14
slug: obs-2026-08-14-cape-demo-auto-run-frontend-only-bactopia-kraken2-trigger-af
relevance: high
observed_at: 2026-08-14T18:16:32.097Z
source_context: Implementing frontend demo auto-run for bactopia/kraken2 after sample upload
---

# ⭐ Observation: CAPE demo auto-run: frontend-only bactopia/kraken2 trigger after upload (demoAutoRun.ts)

Implemented the CAPE demo auto-run (bactopia/kraken2 after upload) as frontend-only, demo-scoped, easy-to-revert wiring.

New module src/lib/demoAutoRun.ts holds all hardcoded constants (INPUT_CLEAN_BUCKET=ccd-dlh-t-seqauto-input-clean-vbkt-s3-b1f75c7, RESULT_RAW_OUTDIR=s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output, DAG_ID=bactopia_kraken2_v3_2_0) and exports pollForOntReads, buildPipelineConfigs, triggerWorkflow, runDemoWorkflow, isAbortError. It polls GET /objstorage/contents?bucket=<input-clean>&prefix=sequencing-reads/sample_id=<sampleId>/ every 15s (30min timeout) until a key ending in sequencing-reads.gz appears, then sets ontUri=s3://<bucket>/<key>.

Key contract facts confirmed from code: /workflows/trigger body is { pipelineConfigs: [{ pipelineId, nextflowOptions }] } where nextflowOptions is an OBJECT keyed by --flag names (NOT a CLI string; server encodes via submission.encoding cli-string). Trigger response returns snake_case dag_id / dag_run_id. buildPipelineConfigs fetches live profiles via getWorkflowProfiles(DAG_ID), builds defaults via getDefaultOptions(getParameterFields(schema)) so base flags (-profile=aws, --aws_volumes, --wf=kraken2, --kraken2_db default, --max_cpus/--max_memory) flow in automatically, then overrides only dynamic values: ONT stage (pipelineId includes 'ont') sets --sample/--ont/--outdir; kraken2 stage (includes 'kraken2') sets --bactopia. Empty-string values are filtered out before submit.

FileUpload.svelte: added onAutoRunStarted prop, autoRun checkbox (default true) + status message + Cancel-automatic-run button, startAutoRun() invoked after upload.state='complete' (fire-and-forget, self-contained error handling, AbortController wired to onCancel). +page.svelte: handleAutoRunStarted sets activeKey='workflows' and calls handleSelectRun(dagId,dagRunId) to jump to the run detail view.

Revert: delete src/lib/demoAutoRun.ts and the demo-marked blocks in FileUpload.svelte and +page.svelte. Validated: npm run format/lint/check/build all clean, 47/47 unit tests pass. NOT tested against live data (no test env available); rabits.html path is already automatic via existing ETL/VM.

*Relevance: high*
*Context: Implementing frontend demo auto-run for bactopia/kraken2 after sample upload*
*Tags: cape frontend demo bactopia kraken2 workflow auto-run svelte upload*

---
*Observed: 2026-08-14T18:16:32.097Z*

---
type: source
title: "Observation: CAPE demo data flow: upload tar -> seqarchive ETL -> bactopia/kraken2 workflow params"
tags:
  - cape
  - demo
  - etl
  - bactopia
  - kraken2
  - workflow
  - frontend
status: observation
created: 2026-08-14
updated: 2026-08-14
slug: obs-2026-08-14-cape-demo-data-flow-upload-tar-seqarchive-etl-bactopia-krake
relevance: high
observed_at: 2026-08-14T17:57:29.138Z
source_context: Planning a demo-ware auto-trigger from upload to bactopia/kraken2 workflow
---

# ⭐ Observation: CAPE demo data flow: upload tar -> seqarchive ETL -> bactopia/kraken2 workflow params

Traced the full CAPE demo flow across cape-frontend, cape-cod, cape-wf-bactopia_kraken2_v3_2_0 for a "auto-run workflow after upload" demo feature.

Upload (cape-frontend FileUpload.svelte): builds a tar (meta.json + sequencing/<fastq>) and MPU-uploads to bucket ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5 at key unprocessed/sample-<sampleId>.tar. On success sets upload.state='complete'.

ETL (cape-cod assets/etl/etl_seqarchive.py, seqauto tributary, ETL name "seqreadarch", src input-raw prefix unprocessed, sink input-clean): extracts meta, concatenates reads to sequencing-reads/sample_id=<id>/year=.../.../sequencing-reads.gz, writes per-file splits to sequencing-reads-split/sample_id=<id>/..., writes manifest/.../manifest.csv and meta/.../meta.csv. input-clean bucket physical name candidate: ccd-dlh-t-seqauto-input-clean-vbkt-s3-b1f75c7 (from ABAC export observation; verify, Pulumi-generated).

RABiTS/caerbannog is already automatic: split-reads notify queue -> caerbannog consumer VM -> result-raw/caerbannog-output -> etl_caerbannog_results renders rabits.html. No frontend action needed.

Workflow trigger: frontend Submit.svelte POSTs /workflows/trigger?dagId=bactopia_kraken2_v3_2_0 with {pipelineConfigs:[{pipelineId,nextflowOptions}]}. Profiles come from /workflows/pipelineprofiles (DynamoDB PipelineTable, JSON at cape-cod assets/analysis-pipelines/bactopia/*.json). Required nextflowOptions: bactopia-ont-v3.2.0 needs --sample, --ont (ONT reads input), --outdir; bactopia-kraken2-v3.2.0 needs --bactopia (must equal bactopia --outdir), plus --wf=kraken2, --kraken2_db=/mnt/nextflow_shared_data/kraken2.

Key demo lever: --ont reads path = the ETL concat output s3://<input-clean>/sequencing-reads/sample_id=<sampleId>/.../sequencing-reads.gz, which has an unpredictable timestamp prefix. Frontend can detect ETL completion AND resolve --ont by polling GET /objstorage/contents?bucket=<input-clean>&prefix=sequencing-reads/sample_id=<sampleId>/ until a *sequencing-reads.gz key appears. Report readiness (bactopia.html) is handled inside the DAG's generate_and_store_report crawl-then-probe loop.

*Relevance: high*
*Context: Planning a demo-ware auto-trigger from upload to bactopia/kraken2 workflow*
*Tags: cape demo etl bactopia kraken2 workflow frontend*

---
*Observed: 2026-08-14T17:57:29.138Z*

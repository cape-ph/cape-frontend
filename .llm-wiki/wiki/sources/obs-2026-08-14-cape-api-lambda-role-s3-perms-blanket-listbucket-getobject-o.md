---
type: source
title: "Observation: CAPE API Lambda role S3 perms: blanket ListBucket/GetObject on * covers clean-data poll"
tags:
  - cape
  - api
  - iam
  - permissions
  - s3
  - etl
  - demo
  - frontend
status: observation
created: 2026-08-14
updated: 2026-08-14
slug: obs-2026-08-14-cape-api-lambda-role-s3-perms-blanket-listbucket-getobject-o
relevance: high
observed_at: 2026-08-14T18:06:44.587Z
source_context: Answering whether the demo auto-run needs new IAM perms to check ETL status / find clean data
---

# ⭐ Observation: CAPE API Lambda role S3 perms: blanket ListBucket/GetObject on * covers clean-data poll

For the CAPE demo auto-run plan, the frontend needs NO new permissions to poll clean data. The browser holds no AWS creds; it calls the CAPE API with a Cognito Bearer token and the API Gateway authorizer is currently allow-all (does not verify JWT signature, per post_workflow_run.py note).

All CAPE API handlers share ONE Lambda execution role (cape-cod capeinfra/resources/api.py _create_api_ep_lambdas). Its base policy from capeinfra/iam.py get_api_statements includes a blanket S3 grant: actions s3:ListBucket, s3:ListAllMyBuckets, s3:PutObject, s3:GetObject on Resource ["*"] (plus lambda:InvokeFunction * and batch:SubmitJob/DescribeJobs *). So get_s3_contents.py (GET /objstorage/contents) can list_objects_v2 on the input-clean bucket with no extra IAM. Handler returns Access-Control-Allow-Origin: *, so browser CORS is fine. Caveat: this relies on Resource ["*"] which has a "make this policy more strict" TODO; tightening it to an allow-list would break the poll unless input-clean is included.

get_api_statements legacy resource grants only support "queue" (SQS) and "table" (DynamoDB) keys, NOT buckets; per-bucket API grants are added as explicit policy_statements (e.g. seqauto artifacts bucket read+browse for report/get in swimlanes/private.py). 

Capability mapping: (1) find clean data = GET /objstorage/contents, already permitted. (2) which ETLs run for an input = GET /objstorage/etls (get_object_etls.py, reads EtlTable DynamoDB), already permitted. (3) live ETL/Glue run status = NO endpoint exists; would need a new handler + glue:GetJobRun(s) on the API role. The demo plan only needs (1).

*Relevance: high*
*Context: Answering whether the demo auto-run needs new IAM perms to check ETL status / find clean data*
*Tags: cape api iam permissions s3 etl demo frontend*

---
*Observed: 2026-08-14T18:06:44.587Z*

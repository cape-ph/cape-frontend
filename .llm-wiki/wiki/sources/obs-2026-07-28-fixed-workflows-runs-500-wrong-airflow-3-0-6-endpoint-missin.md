---
type: source
title: "Observation: Fixed /workflows/runs 500: wrong Airflow 3.0.6 endpoint + missing CORS on error"
slug: obs-2026-07-28-fixed-workflows-runs-500-wrong-airflow-3-0-6-endpoint-missin
status: observation
created: 2026-07-28
updated: 2026-07-28
relevance: high
observed_at: 2026-07-28T15:39:18.933Z
tags: ["cape-cod", "cape-frontend", "airflow", "mwaa", "workflow-runs", "bugfix", "cors", "rest-api"]
source_context: "Debugging live Workflows page network error against deployed dev backend"
---
# ⭐ Observation: Fixed /workflows/runs 500: wrong Airflow 3.0.6 endpoint + missing CORS on error
Diagnosed and fixed the "Network Error / Unable to load workflows" failure on the cape-frontend Workflows page against the deployed dev API. Two bugs in cape-cod assets/api/capi/handlers/get_workflow_runs.py: (1) Real cause: _list_all_dag_runs called GET /dags/~/dagRuns/list, which does not exist in Airflow 3.0.6's v2 REST API (the /list batch endpoint was an Airflow 2 POST endpoint). Airflow returned a 4xx, MWAA raised RestApiClientException, handler 500'd. Verified real response via curl -k (corporate TLS interception) with the browser's bearer token: HTTP 500 body "Error during fetch of workflow runs from airflow. RestApiClientException". MWAA env is ccd-pvsl-airflow-env-mwaa-env (us-east-2); its webserver is private so invoke_rest_api only works inside the VPC (aws mwaa invoke-rest-api from outside returns AccessDeniedException "Private webserver environments can only call InvokeRestApi within a VPC"). Fix: use GET /dags/~/dagRuns with order_by=-run_after (logical_date is nullable for API-triggered runs in Airflow 3) and pass the caller user id as the server-side conf_contains filter (a substring CONTAINS on serialized conf that Airflow 3.0.6 exposes), then keep the exact client-side filter_runs_for_user check as authoritative. (2) Secondary: the except path returned {statusCode:500, body:str} with no headers, so the 500 lacked Access-Control-Allow-Origin and the browser blocked it as net::ERR_FAILED (axios "Network Error") instead of showing the 500; now returns headers=resp_headers and a JSON body. Confirmed the ~ wildcard is supported for the dagRuns GET because that route exposes dag_id_pattern/conf_contains filters (only meaningful cross-DAG). Updated test Path assertion to /dags/~/dagRuns. Gates green: 36 pytest, black 24.8.0, isort, pyright all clean. Requires redeploy of the get_workflow_runs Lambda (function ccd-pvsl-capi-api-getdagruns-lmbdfn-cff8c0d) to take effect.
*Relevance: high*

*Context: Debugging live Workflows page network error against deployed dev backend*

*Tags: cape-cod cape-frontend airflow mwaa workflow-runs bugfix cors rest-api*
---
*Observed: 2026-07-28T15:39:18.933Z*
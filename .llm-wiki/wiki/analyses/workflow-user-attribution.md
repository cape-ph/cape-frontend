# Workflow User Attribution

How the CAPE frontend records and retrieves "which user triggered a workflow,"
and why the chosen approach fits the surrounding infrastructure. This supersedes
the old browser-cookie tracking described in
[[analyses/workflow-status-monitoring-feature]].

## Problem

Submitted workflow runs were tracked only in a per-browser cookie. That is not
authoritative, not shared across devices, and invisible to admins. We want a
single source of truth for run ownership that also serves the Airflow API and
the Airflow admin UI.

## Infrastructure shape (ideas only)

The CAPE API is not a server we own end to end - it is a set of AWS API Gateway
plus Lambda handlers that proxy to a managed Airflow (MWAA). The trigger handler
forwards to Airflow's `POST /dags/{dag_id}/dagRuns` and passes the request body
straight through as the DAG run `conf`. The call into Airflow is authenticated by
IAM as a single service principal, not as the end user. A separate CAPE
environment database exists for users and access control, but it is new and not
yet populated, so it is not a dependency for this feature.

See [[entities/cape-api]] for the frontend-facing API surface.

## Key Airflow facts

- A DAG run has `triggered_by` (an enum for the interface: `rest_api`, `ui`,
  `cli`, ...) and a separate `triggering_user_name` (the human). `triggered_by`
  is `rest_api` for every REST-triggered run and never identifies the person.
- `triggering_user_name` cannot be set from the trigger request body. Airflow
  derives it from the authenticated principal on the API call. Because the proxy
  authenticates to Airflow by IAM as one service identity, Airflow's native user
  field cannot reflect the Cognito user without replacing that auth model.
- The trigger body only accepts `conf`, `note`, `dag_run_id`, `logical_date`,
  `run_after`. Of these, `conf` (and `note`) are returned by the run-fetch API
  and rendered in the Airflow UI.

## Decision

Record the triggering user in the DAG run `conf` under a namespaced key so it is
captured in Airflow state, visible in the Airflow UI for admins, and retrievable
through the Airflow API - without a database dependency.

- Shape: `conf.cape = { triggering_user_id, triggering_user_name }`. The id is
  the stable Cognito `sub` (used for filtering); the name is the email/username
  (used for human-readable display).
- Identity is resolved server-side from the caller's Cognito token by the API
  Gateway authorizer and injected by the trigger handler. Any client-supplied
  `conf.cape` is stripped so ownership cannot be spoofed.
- "My runs" is a list endpoint that returns runs whose `conf.cape.triggering_user_id`
  matches the caller. The frontend renders that live instead of reading a cookie.
- The DAG params the frontend already sends (the per-stage pipeline configs)
  stay in `conf` alongside `cape`, so the run detail view reconstructs submission
  info from `conf` rather than from client storage.

## Why not Airflow-native attribution

Populating `triggering_user_name` faithfully would require the proxy to present
each end user's identity to Airflow's auth manager instead of a shared IAM
principal. That is a large, coupling change to the Airflow auth model - the
opposite of minimal - so it was rejected in favor of the `conf` approach.

## Consequences and follow-ups

- The authorizer must resolve the Cognito identity for this to be authoritative;
  until signature verification is added it should be treated as not yet
  production-hardened. A managed Cognito JWT authorizer is the natural end state.
- Per-user listing is filtered in the proxy layer because Airflow has no
  server-side filter for a `conf` value; large run volumes may later warrant a
  database-backed ownership index (the CAPE environment DB is the home for that).
- Removes the cookie/`localStorage`-style client run tracking entirely; see
  [[analyses/known-gaps-and-unused-api]] for the retired legacy pieces.

## Related

- [[analyses/workflow-submission-feature]]
- [[analyses/workflow-status-monitoring-feature]]
- [[concepts/data-models]]
- [[concepts/authentication-cognito]]

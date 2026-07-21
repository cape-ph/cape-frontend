---
type: source
title: "Observation: Decision: workflow user attribution via Airflow conf.cape"
slug: obs-2026-07-20-decision-workflow-user-attribution-via-airflow-conf-cape
status: observation
created: 2026-07-20
updated: 2026-07-20
relevance: critical
observed_at: 2026-07-20T20:07:23.109Z
tags: ["cape-frontend", "cape-cod", "airflow", "workflows", "auth", "decision"]
source_context: "Designing per-user workflow attribution across cape-frontend + cape-cod"
---
# 🔴 Observation: Decision: workflow user attribution via Airflow conf.cape
Locked decision for per-user workflow tracking: record the triggering user in the Airflow DAG run conf under conf.cape = {triggering_user_id (Cognito sub), triggering_user_name (email/username)}, resolved server-side from the Cognito token by the API Gateway authorizer and injected by the trigger proxy handler (client-supplied conf.cape stripped to prevent spoofing). A 'my runs' list endpoint filters runs by conf.cape.triggering_user_id; the frontend renders that live and the cookie-based tracking is removed. Rejected Airflow-native triggering_user_name because the proxy authenticates to MWAA/Airflow by IAM as a single service principal, so Airflow cannot see the Cognito user without reworking its auth model. No database dependency (CAPE env DB exists but is new/unpopulated). Full rationale in analyses/workflow-user-attribution.
*Relevance: critical*

*Context: Designing per-user workflow attribution across cape-frontend + cape-cod*

*Tags: cape-frontend cape-cod airflow workflows auth decision*
---
*Observed: 2026-07-20T20:07:23.109Z*
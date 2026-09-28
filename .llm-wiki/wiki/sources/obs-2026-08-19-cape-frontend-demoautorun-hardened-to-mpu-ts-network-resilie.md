---
type: source
title: "Observation: CAPE frontend demoAutoRun hardened to mpu.ts network resilience (retry/backoff/timeout/signal)"
tags:
  - cape
  - frontend
  - demo-auto-run
  - resilience
  - retry
  - backoff
  - timeout
  - abortsignal
  - network
status: observation
created: 2026-08-19
updated: 2026-08-19
slug: obs-2026-08-19-cape-frontend-demoautorun-hardened-to-mpu-ts-network-resilie
relevance: high
observed_at: 2026-08-19T14:26:48.633Z
source_context: Bringing demo auto-run workflow kickoff up to mpu.ts network resilience standard
---

# ⭐ Observation: CAPE frontend demoAutoRun hardened to mpu.ts network resilience (retry/backoff/timeout/signal)

Hardened src/lib/demoAutoRun.ts to mpu.ts-level network resilience for questionable networks. Added a shared retry layer: withRetry(fn, {signal, attempts=4}) with exponential backoff + jitter (backoff = 300 * 2^(attempt-1) + rand(0..100), same shape as mpu.ts) and isRetryableError() that retries axios errors with no response (network drop/connect failure/timeout) plus statuses >=500, 429, 408. isAbortError now also treats axios.isCancel() as abort (never retried).

Every capi call now passes signal and timeout: REQUEST_TIMEOUT_MS=30_000. Key fix: capi is a bare axios.create() with no default timeout, so a stalled socket used to hang the poll loop forever (deadline only checked between awaits). listCleanReadObjects now takes signal and sets the timeout, so a hung poll fails fast and re-polls, and Cancel aborts an in-flight request. buildPipelineConfigs switched from getWorkflowProfiles to getWorkflowProfilesCached wrapped in withRetry. triggerWorkflow (POST /workflows/trigger) wrapped in withRetry with a documented double-trigger caveat: a drop after the server created the run but before the response returns could create a second run on retry (narrow window, demo-scoped, would need a backend dedup key to fully fix).

Poll loop still swallows all non-abort errors and retries every 15s up to 30min. FileUpload.svelte startAutoRun failure message now tells the user they can submit manually from the Workflows tab. Remaining unavoidable frontend-only limit: the up-to-30min run is tab-lifetime bound (tab close/sleep/background throttling stops it); capi request interceptor's silent JWT renew covers long polls crossing token expiry.

Validated: format/lint/check clean, 48/48 tests pass. Not tested against live flaky-network conditions.

*Relevance: high*
*Context: Bringing demo auto-run workflow kickoff up to mpu.ts network resilience standard*
*Tags: cape frontend demo-auto-run resilience retry backoff timeout abortsignal network*

---
*Observed: 2026-08-19T14:26:48.633Z*

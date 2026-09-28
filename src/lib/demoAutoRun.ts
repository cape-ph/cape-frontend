/**
 * DEMO AUTO-RUN (bactopia/kraken2)
 *
 * Hardcoded, isolated demo wiring that, after a sample upload, waits for the
 * seqarchive ETL to publish clean ONT reads and then triggers the
 * bactopia/kraken2 workflow automatically.
 *
 * This module is intentionally demo-scoped and easy to remove: everything the
 * demo depends on lives here. To revert, delete this file and the two call
 * sites that reference it:
 *   - src/lib/components/FileUpload/FileUpload.svelte (checkbox + startAutoRun)
 *   - src/routes/+page.svelte (onAutoRunStarted -> handleSelectRun)
 *
 * The frontend needs no new permissions: the /objstorage/contents and
 * /workflows/trigger endpoints are already served by the shared CAPE API
 * Lambda role, which has s3:ListBucket/GetObject and the workflow-trigger
 * grants.
 */

import axios from 'axios';
import { capi } from '$lib/apiClient';
import { getWorkflowProfilesCached } from '$lib/pipeline';
import type { PipelineProfile } from '$lib/pipeline';
import { getDefaultOptions, getParameterFields } from '$lib/schema';

// --- hardcoded demo constants ------------------------------------------------

/** Input-clean bucket the seqarchive ETL writes concatenated reads into. */
const INPUT_CLEAN_BUCKET = 'ccd-dlh-t-seqauto-input-clean-vbkt-s3-b1f75c7';

/** Result-raw output directory used for both --outdir and --bactopia. */
const RESULT_RAW_OUTDIR = 's3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output';

/** DAG id for the bactopia/kraken2 workflow. */
const DAG_ID = 'bactopia_kraken2_v3_2_0';

/** Concatenated-reads object the ETL emits once processing completes. */
const READS_OBJECT_SUFFIX = 'sequencing-reads.gz';

/** Poll cadence and overall timeout while waiting for the ETL output. */
const POLL_INTERVAL_MS = 15_000;
const POLL_TIMEOUT_MS = 30 * 60 * 1000;

// --- network resilience (mirrors the guardrails in mpu.ts) -------------------

/**
 * Per-request timeout. On a stalled connection (no reset, the socket just
 * hangs) axios aborts with ECONNABORTED and no response, which the retry/poll
 * logic treats as a transient failure. Without this a hung request would block
 * the whole run indefinitely.
 */
const REQUEST_TIMEOUT_MS = 30_000;

/** Max attempts for a single retryable request (matches mpu.ts intent). */
const MAX_ATTEMPTS = 4;

// --- types -------------------------------------------------------------------

export type DemoAutoRunPhase = 'polling' | 'preparing' | 'triggering' | 'started';

export interface DemoAutoRunStatus {
    phase: DemoAutoRunPhase;
    message: string;
}

export interface DemoAutoRunResult {
    dagId: string;
    dagRunId: string;
}

interface DemoAutoRunOptions {
    signal?: AbortSignal;
    onStatus?: (status: DemoAutoRunStatus) => void;
}

interface PipelineConfig {
    pipelineId: string;
    nextflowOptions: Record<string, unknown>;
}

// --- helpers -----------------------------------------------------------------

function isAbortError(err: unknown): boolean {
    return (err instanceof DOMException && err.name === 'AbortError') || axios.isCancel(err);
}

/**
 * Retry only failures that a questionable network produces: connection drops,
 * DNS/connect errors, and request timeouts (an axios error with no response),
 * plus the retryable server statuses. This mirrors mpu.ts's shouldRetry and its
 * "no response => network error" handling.
 */
function isRetryableError(err: unknown): boolean {
    if (!axios.isAxiosError(err)) return false;
    if (!err.response) return true; // network drop, connect failure, or timeout
    const status = err.response.status;
    return status >= 500 || status === 429 || status === 408;
}

/** Exponential backoff with jitter, same shape as mpu.ts. */
function backoff(attempt: number): number {
    const offset = Math.floor(Math.random() * 100);
    return 300 * 2 ** (attempt - 1) + offset;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

/**
 * Run a request with bounded retries and exponential backoff, honoring an
 * AbortSignal between attempts. Abort/cancel is never retried; non-retryable
 * errors surface immediately.
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    options: { signal?: AbortSignal; attempts?: number } = {}
): Promise<T> {
    const { signal, attempts = MAX_ATTEMPTS } = options;
    let attempt = 0;
    for (;;) {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        attempt += 1;
        try {
            return await fn();
        } catch (err) {
            if (isAbortError(err) || !isRetryableError(err) || attempt >= attempts) {
                throw err;
            }
            await delay(backoff(attempt), signal);
        }
    }
}

/** List clean-read object keys for a sample under the input-clean bucket. */
async function listCleanReadObjects(
    baseUrl: string,
    sampleId: string,
    signal?: AbortSignal
): Promise<string[]> {
    const url = `${baseUrl}/objstorage/contents`;
    const params = {
        bucket: INPUT_CLEAN_BUCKET,
        prefix: `sequencing-reads/sample_id=${sampleId}/`
    };
    const response = await capi.get(url, { params, signal, timeout: REQUEST_TIMEOUT_MS });
    const objects = response.data?.objects;
    return Array.isArray(objects) ? (objects as string[]) : [];
}

/**
 * Poll the input-clean bucket until the concatenated reads object appears, then
 * return its s3:// URI (the workflow's --ont value). Treats a missing object as
 * "ETL still running" and keeps polling until the timeout.
 */
export async function pollForOntReads(
    baseUrl: string,
    sampleId: string,
    options: DemoAutoRunOptions = {}
): Promise<string> {
    const { signal, onStatus } = options;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    onStatus?.({
        phase: 'polling',
        message: 'Upload complete. Waiting for ETLs to produce clean reads...'
    });

    for (;;) {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        let objects: string[] = [];
        try {
            objects = await listCleanReadObjects(baseUrl, sampleId, signal);
        } catch (err) {
            // A questionable network makes list calls fail intermittently (drops,
            // timeouts). Treat any non-abort failure as "ETL still running" and
            // keep polling until the deadline; the per-request timeout ensures a
            // stalled connection cannot wedge the loop.
            if (isAbortError(err)) {
                throw err;
            }
        }

        const key = objects.find((k) => k.endsWith(READS_OBJECT_SUFFIX));
        if (key) {
            return `s3://${INPUT_CLEAN_BUCKET}/${key}`;
        }

        if (Date.now() >= deadline) {
            throw new Error(
                'Timed out waiting for clean reads; the ETL did not produce ' +
                    `${READS_OBJECT_SUFFIX} within the expected window.`
            );
        }

        await delay(POLL_INTERVAL_MS, signal);
    }
}

/**
 * Build the workflow trigger payload from the live pipeline profiles, using
 * each profile's schema defaults and overriding only the values that depend on
 * this specific upload.
 */
export async function buildPipelineConfigs(
    baseUrl: string,
    sampleId: string,
    ontUri: string,
    signal?: AbortSignal
): Promise<{ pipelineConfigs: PipelineConfig[] }> {
    const profiles: PipelineProfile[] = await withRetry(
        () => getWorkflowProfilesCached(baseUrl, DAG_ID),
        { signal }
    );

    const pipelineConfigs: PipelineConfig[] = [];

    for (const profile of profiles) {
        const pipelineId = profile.pipelineId ?? profile.pipelineName;
        const fields = await getParameterFields(profile.parametersSchema);
        const options = getDefaultOptions(fields);

        if (pipelineId.includes('kraken2')) {
            options['--bactopia'] = RESULT_RAW_OUTDIR;
        } else if (pipelineId.includes('ont')) {
            options['--sample'] = sampleId;
            options['--ont'] = ontUri;
            options['--outdir'] = RESULT_RAW_OUTDIR;
        }

        // Drop schema fields left empty (no default and not overridden) so the
        // trigger does not receive blank CLI flags.
        const nextflowOptions = Object.fromEntries(
            Object.entries(options).filter(([, value]) => value !== '')
        );

        pipelineConfigs.push({ pipelineId, nextflowOptions });
    }

    return { pipelineConfigs };
}

/** POST the trigger and return the created DAG run identifiers. */
async function triggerWorkflow(
    baseUrl: string,
    payload: { pipelineConfigs: PipelineConfig[] },
    signal?: AbortSignal
): Promise<DemoAutoRunResult> {
    const endpoint = `${baseUrl}/workflows/trigger?dagId=${encodeURIComponent(DAG_ID)}`;
    // Retry the trigger through transient network failures. Caveat: a drop that
    // happens after the server created the run but before its response reached
    // us would cause a retry to create a second run. That window is narrow and
    // this is demo-scoped; a durable dedup key would need backend support.
    const response = await withRetry(
        () => capi.post(endpoint, payload, { signal, timeout: REQUEST_TIMEOUT_MS }),
        { signal }
    );
    const { dag_id: dagId, dag_run_id: dagRunId } = response.data ?? {};

    if (!dagId || !dagRunId) {
        throw new Error('Workflow trigger did not return a dag run id.');
    }

    return { dagId, dagRunId };
}

/**
 * Orchestrate the demo auto-run: wait for clean reads, build the payload from
 * the live profiles, trigger the workflow, and return the new run.
 */
export async function runDemoWorkflow(
    baseUrl: string,
    sampleId: string,
    options: DemoAutoRunOptions = {}
): Promise<DemoAutoRunResult> {
    const { signal, onStatus } = options;

    const ontUri = await pollForOntReads(baseUrl, sampleId, options);

    onStatus?.({ phase: 'preparing', message: 'Clean reads ready. Preparing workflow...' });
    const payload = await buildPipelineConfigs(baseUrl, sampleId, ontUri, signal);

    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    onStatus?.({ phase: 'triggering', message: 'Starting bactopia/kraken2 workflow...' });
    const result = await triggerWorkflow(baseUrl, payload, signal);

    onStatus?.({ phase: 'started', message: 'Workflow started. Redirecting to status...' });
    return result;
}

export { isAbortError };

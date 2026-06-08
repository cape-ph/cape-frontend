/**
 * Submission configuration for a workflow run
 * Stored for display in detail view
 */
export interface SubmissionConfig {
    workflowName: string; // Human-readable workflow name
    stages: {
        stageId: string; // e.g., "bactopia_v3_2_0"
        stageName: string; // Human-readable stage name
        pipelineName: string; // e.g., "Bactopia"
        pipelineVersion: string; // e.g., "v3.2.0"
        options: Record<string, unknown>; // Parameter values
    }[];
}

/**
 * Stored workflow run information
 * Minimal data stored in cookies - most details fetched from API
 */
export interface StoredWorkflowRun {
    dagId: string;
    dagRunId: string;
    submittedAt: string; // ISO 8601 timestamp
    submissionConfig?: SubmissionConfig; // Optional submission configuration
}

const COOKIE_NAME = 'workflow_runs';
const MAX_AGE_DAYS = 90; // Keep runs for 90 days

/**
 * Parse workflow runs from cookie
 *
 * @returns Array of stored workflow runs (empty array if cookie doesn't exist or is invalid)
 */
export function getStoredWorkflowRuns(): StoredWorkflowRun[] {
    if (typeof document === 'undefined') {
        return []; // SSR - no cookies available
    }

    const cookies = document.cookie.split(';');
    const workflowRunsCookie = cookies.find((c) => c.trim().startsWith(`${COOKIE_NAME}=`));

    if (!workflowRunsCookie) {
        return [];
    }

    try {
        const value = workflowRunsCookie.split('=')[1];
        const decoded = decodeURIComponent(value);
        const runs = JSON.parse(decoded);

        if (!Array.isArray(runs)) {
            return [];
        }

        // Validate structure
        return runs.filter(
            (run): run is StoredWorkflowRun =>
                typeof run === 'object' &&
                run !== null &&
                typeof run.dagId === 'string' &&
                typeof run.dagRunId === 'string' &&
                typeof run.submittedAt === 'string'
            // submissionConfig is optional, no validation needed for backward compat
        );
    } catch {
        return [];
    }
}

/**
 * Store workflow runs in cookie
 *
 * @param runs - Array of workflow runs to store
 */
export function setStoredWorkflowRuns(runs: StoredWorkflowRun[]): void {
    if (typeof document === 'undefined') {
        return; // SSR - cannot set cookies
    }

    const value = encodeURIComponent(JSON.stringify(runs));
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60; // Convert days to seconds

    document.cookie = `${COOKIE_NAME}=${value}; max-age=${maxAge}; path=/; SameSite=Strict`;
}

/**
 * Add a new workflow run to stored runs
 *
 * @param run - Workflow run to add
 */
export function addWorkflowRun(run: StoredWorkflowRun): void {
    const existing = getStoredWorkflowRuns();

    // Check if already exists (avoid duplicates)
    const isDuplicate = existing.some((r) => r.dagId === run.dagId && r.dagRunId === run.dagRunId);

    if (isDuplicate) {
        return;
    }

    // Prepend new run (most recent first)
    const updated = [run, ...existing];

    setStoredWorkflowRuns(updated);
}

/**
 * Remove a workflow run from stored runs
 *
 * @param dagId - Workflow DAG ID
 * @param dagRunId - Workflow run ID
 */
export function removeWorkflowRun(dagId: string, dagRunId: string): void {
    const existing = getStoredWorkflowRuns();
    const updated = existing.filter((r) => !(r.dagId === dagId && r.dagRunId === dagRunId));

    setStoredWorkflowRuns(updated);
}

/**
 * Clear all stored workflow runs
 */
export function clearAllWorkflowRuns(): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.cookie = `${COOKIE_NAME}=; max-age=0; path=/`;
}

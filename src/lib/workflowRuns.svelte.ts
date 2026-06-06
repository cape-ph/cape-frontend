import type { WorkflowRun } from './workflowStatus';
import type { StoredWorkflowRun } from './workflowRunsStorage';
import { SvelteMap } from 'svelte/reactivity';

/**
 * Live status for a workflow run with availability flag
 */
export interface WorkflowRunStatus {
    run: WorkflowRun | null;
    isAvailable: boolean; // false if API returned 404 or error
    lastFetched: number; // timestamp
    error?: string;
}

/**
 * Global reactive state for workflow runs
 */
export const workflowRuns = $state<{
    stored: StoredWorkflowRun[];
    liveStatus: SvelteMap<string, WorkflowRunStatus>;
}>({
    stored: [],
    liveStatus: new SvelteMap()
});

/**
 * Get composite key for a workflow run
 */
export function getRunKey(dagId: string, dagRunId: string): string {
    return `${dagId}::${dagRunId}`;
}

/**
 * Set stored workflow runs
 */
export function setStoredRuns(runs: StoredWorkflowRun[]): void {
    workflowRuns.stored = runs;
}

/**
 * Add a stored workflow run
 */
export function addStoredRun(run: StoredWorkflowRun): void {
    // Check for duplicates
    const exists = workflowRuns.stored.some(
        (r) => r.dagId === run.dagId && r.dagRunId === run.dagRunId
    );

    if (!exists) {
        workflowRuns.stored = [run, ...workflowRuns.stored];
    }
}

/**
 * Remove a stored workflow run
 */
export function removeStoredRun(dagId: string, dagRunId: string): void {
    workflowRuns.stored = workflowRuns.stored.filter(
        (r) => !(r.dagId === dagId && r.dagRunId === dagRunId)
    );
}

/**
 * Set live status for a workflow run
 */
export function setLiveStatus(dagId: string, dagRunId: string, status: WorkflowRunStatus): void {
    const key = getRunKey(dagId, dagRunId);
    workflowRuns.liveStatus.set(key, status);
}

/**
 * Get live status for a workflow run
 */
export function getLiveStatus(dagId: string, dagRunId: string): WorkflowRunStatus | undefined {
    const key = getRunKey(dagId, dagRunId);
    return workflowRuns.liveStatus.get(key);
}

/**
 * Clear all live status (useful for refresh)
 */
export function clearLiveStatus(): void {
    workflowRuns.liveStatus = new SvelteMap();
}

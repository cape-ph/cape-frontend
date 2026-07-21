<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';
    import { getMyWorkflowRuns, getWorkflowRun, getTaskInstances } from '$lib/workflowStatus';
    import type { TaskInstance, WorkflowRun } from '$lib/workflowStatus';
    import WorkflowRunCard from './WorkflowRunCard.svelte';

    let { baseUrl, onSelectRun, onNavigateToSubmit } = $props<{
        baseUrl: string;
        onSelectRun: (dagId: string, dagRunId: string) => void;
        onNavigateToSubmit: () => void;
    }>();

    const REFRESH_INTERVAL = 30000; // 30 seconds

    // Runs are sourced from the CAPE API (Airflow state), scoped to the current
    // user server-side. No client-side (cookie) tracking is involved.
    let runs = $state<WorkflowRun[]>([]);
    // Task instances per run, keyed by dag_run_id (SvelteMap tracks mutations).
    let taskInstancesMap = new SvelteMap<string, TaskInstance[]>();
    let isLoading = $state(true);
    let isRefreshing = $state(false);
    let loadError = $state<string | null>(null);
    let refreshInterval: number | undefined;

    onMount(() => {
        refreshAllRuns();

        // Poll running workflows for status updates.
        refreshInterval = window.setInterval(() => {
            refreshRunningWorkflows();
        }, REFRESH_INTERVAL);
    });

    onDestroy(() => {
        if (refreshInterval !== undefined) {
            clearInterval(refreshInterval);
        }
    });

    async function refreshAllRuns() {
        if (isRefreshing) return;
        isRefreshing = true;

        try {
            const myRuns = await getMyWorkflowRuns(baseUrl);
            runs = myRuns;
            loadError = null;
            await Promise.all(myRuns.map((run) => refreshTaskInstances(run)));
        } catch (err) {
            console.error('Failed to load workflow runs:', err);
            loadError = err instanceof Error ? err.message : String(err);
        } finally {
            isLoading = false;
            isRefreshing = false;
        }
    }

    async function refreshRunningWorkflows() {
        if (isRefreshing) return;

        const activeRuns = runs.filter((run) => run.state === 'running' || run.state === 'queued');
        if (activeRuns.length === 0) return;

        isRefreshing = true;
        try {
            await Promise.all(
                activeRuns.map(async (run) => {
                    try {
                        const updated = await getWorkflowRun(baseUrl, run.dag_id, run.dag_run_id);
                        runs = runs.map((r) => (r.dag_run_id === updated.dag_run_id ? updated : r));
                        await refreshTaskInstances(updated);
                    } catch (err) {
                        console.error(`Failed to refresh workflow run ${run.dag_run_id}:`, err);
                    }
                })
            );
        } finally {
            isRefreshing = false;
        }
    }

    async function refreshTaskInstances(run: WorkflowRun) {
        try {
            const response = await getTaskInstances(baseUrl, run.dag_id, run.dag_run_id);
            taskInstancesMap.set(run.dag_run_id, response.task_instances);
        } catch (err) {
            console.error(`Failed to fetch task instances for ${run.dag_run_id}:`, err);
        }
    }

    function getTaskInstancesForRun(dagRunId: string): TaskInstance[] | null {
        return taskInstancesMap.get(dagRunId) ?? null;
    }
</script>

<div class="mb-6 space-y-2">
    <div class="flex items-center justify-between">
        <div>
            <h2
                class="text-primary-700 dark:text-primary-300 text-2xl font-semibold tracking-tight"
            >
                Workflows
            </h2>
            <p class="text-sm text-gray-700 dark:text-gray-300">
                Submit and monitor your workflows. Running workflows refresh automatically every 30
                seconds.
            </p>
        </div>
        <div class="flex items-center gap-3">
            <!-- Manual Refresh button -->
            <button
                class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onclick={refreshAllRuns}
                disabled={isRefreshing}
                aria-label="Refresh workflow list"
                title="Manually refresh workflow list"
            >
                <svg
                    class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <!-- Submit Workflow button with matching height -->
            <button
                class="flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-primary-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600"
                onclick={onNavigateToSubmit}
                aria-label="Submit new workflow"
                title="Submit a new workflow"
            >
                <svg
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                <span>Submit</span>
            </button>
        </div>
    </div>
</div>

<div class="space-y-4">
    {#if isLoading}
        <div
            class="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-600 dark:bg-surface-900"
        >
            <span class="mb-3 animate-pulse text-lg text-gray-500 dark:text-gray-400"
                >Loading your workflows...</span
            >
        </div>
    {:else if loadError}
        <div
            class="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-rose-300 bg-rose-50 p-12 text-center dark:border-rose-800 dark:bg-rose-950/30"
        >
            <h3 class="mb-2 text-lg font-semibold text-rose-800 dark:text-rose-200">
                Unable to load workflows
            </h3>
            <p class="mb-6 max-w-md text-sm text-rose-700 dark:text-rose-300">
                {loadError}
            </p>
            <button class="btn variant-filled-primary" onclick={refreshAllRuns}>Try Again</button>
        </div>
    {:else if runs.length === 0}
        <!-- Enhanced empty state with Submit button -->
        <div
            class="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-600 dark:bg-surface-900"
        >
            <svg
                class="mb-4 h-24 w-24 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
            </svg>
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                No workflows yet
            </h3>
            <p class="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
                Submit your first workflow to start tracking its progress. Click the "Submit
                Workflow" button above to get started.
            </p>
            <button
                class="btn variant-filled-primary"
                onclick={onNavigateToSubmit}
                aria-label="Go to Submit page"
            >
                <svg
                    class="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                <span>Submit Your First Workflow</span>
            </button>
        </div>
    {:else}
        {#each runs as run, index (run.dag_run_id)}
            {@const taskInstances = getTaskInstancesForRun(run.dag_run_id)}
            <div class="animate-fade-in-up" style="animation-delay: {index * 50}ms">
                <WorkflowRunCard
                    {run}
                    {taskInstances}
                    onViewDetails={() => onSelectRun(run.dag_id, run.dag_run_id)}
                />
            </div>
        {/each}
    {/if}
</div>

<style>
    @keyframes fade-in-up {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-fade-in-up {
        animation: fade-in-up 0.4s ease-out forwards;
        opacity: 0;
    }
</style>

<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';
    import { getStoredWorkflowRuns, removeWorkflowRun } from '$lib/workflowRunsStorage';
    import {
        workflowRuns,
        setStoredRuns,
        setLiveStatus,
        getLiveStatus,
        removeStoredRun
    } from '$lib/workflowRuns.svelte';
    import { getWorkflowRun, getTaskInstances } from '$lib/workflowStatus';
    import type { TaskInstance } from '$lib/workflowStatus';
    import WorkflowRunCard from './WorkflowRunCard.svelte';

    let { baseUrl, onSelectRun, onNavigateToSubmit } = $props<{
        baseUrl: string;
        onSelectRun: (dagId: string, dagRunId: string) => void;
        onNavigateToSubmit: () => void;
    }>();

    let refreshInterval: number | undefined;
    let isRefreshing = $state(false);
    let showUnavailable = $state(false);

    const REFRESH_INTERVAL = 30000; // 30 seconds
    const UNAVAILABLE_PRUNE_DAYS = 30;

    onMount(() => {
        // Load stored runs from cookies
        const stored = getStoredWorkflowRuns();
        setStoredRuns(stored);

        // Fetch initial status for all runs
        refreshAllRuns();

        // Set up polling for running workflows
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

        const promises = workflowRuns.stored.map(async (run) => {
            try {
                const [workflowRun, taskInstancesResponse] = await Promise.all([
                    getWorkflowRun(baseUrl, run.dagId, run.dagRunId),
                    getTaskInstances(baseUrl, run.dagId, run.dagRunId)
                ]);

                setLiveStatus(run.dagId, run.dagRunId, {
                    run: workflowRun,
                    isAvailable: true,
                    lastFetched: Date.now()
                });

                // Store task instances separately
                taskInstancesMap.set(
                    `${run.dagId}::${run.dagRunId}`,
                    taskInstancesResponse.task_instances
                );
            } catch (err) {
                console.error(`Failed to fetch workflow run ${run.dagRunId}:`, err);
                setLiveStatus(run.dagId, run.dagRunId, {
                    run: null,
                    isAvailable: false,
                    lastFetched: Date.now(),
                    error: err instanceof Error ? err.message : String(err)
                });
            }
        });

        await Promise.all(promises);
        pruneOldUnavailableRuns();
        isRefreshing = false;
    }

    async function refreshRunningWorkflows() {
        if (isRefreshing) return;

        const runningRuns = workflowRuns.stored.filter((run) => {
            const status = getLiveStatus(run.dagId, run.dagRunId);
            return status?.run?.state === 'running' || status?.run?.state === 'queued';
        });

        if (runningRuns.length === 0) return;

        isRefreshing = true;

        const promises = runningRuns.map(async (run) => {
            try {
                const [workflowRun, taskInstancesResponse] = await Promise.all([
                    getWorkflowRun(baseUrl, run.dagId, run.dagRunId),
                    getTaskInstances(baseUrl, run.dagId, run.dagRunId)
                ]);

                setLiveStatus(run.dagId, run.dagRunId, {
                    run: workflowRun,
                    isAvailable: true,
                    lastFetched: Date.now()
                });

                taskInstancesMap.set(
                    `${run.dagId}::${run.dagRunId}`,
                    taskInstancesResponse.task_instances
                );
            } catch (err) {
                console.error(`Failed to refresh workflow run ${run.dagRunId}:`, err);
            }
        });

        await Promise.all(promises);
        isRefreshing = false;
    }

    function pruneOldUnavailableRuns() {
        const now = Date.now();
        const cutoffMs = UNAVAILABLE_PRUNE_DAYS * 24 * 60 * 60 * 1000;

        workflowRuns.stored.forEach((run) => {
            const status = getLiveStatus(run.dagId, run.dagRunId);
            if (!status?.isAvailable) {
                const submittedAt = new Date(run.submittedAt).getTime();
                const ageMs = now - submittedAt;

                if (ageMs > cutoffMs) {
                    removeWorkflowRun(run.dagId, run.dagRunId);
                    removeStoredRun(run.dagId, run.dagRunId);
                }
            }
        });
    }

    function clearAllUnavailableRuns() {
        const unavailableRuns = workflowRuns.stored.filter((run) => {
            const status = getLiveStatus(run.dagId, run.dagRunId);
            return !status?.isAvailable;
        });

        unavailableRuns.forEach((run) => {
            removeWorkflowRun(run.dagId, run.dagRunId);
            removeStoredRun(run.dagId, run.dagRunId);
        });
    }

    // Store task instances in a reactive map (SvelteMap auto-tracks mutations)
    let taskInstancesMap = new SvelteMap<string, TaskInstance[]>();

    function getTaskInstancesForRun(dagId: string, dagRunId: string): TaskInstance[] | null {
        return taskInstancesMap.get(`${dagId}::${dagRunId}`) ?? null;
    }

    const availableRuns = $derived(
        workflowRuns.stored.filter((run) => {
            const status = getLiveStatus(run.dagId, run.dagRunId);
            return status?.isAvailable !== false;
        })
    );

    const unavailableRuns = $derived(
        workflowRuns.stored.filter((run) => {
            const status = getLiveStatus(run.dagId, run.dagRunId);
            return status?.isAvailable === false;
        })
    );
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
    {#if workflowRuns.stored.length === 0}
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
        <!-- Available workflows -->
        {#each availableRuns as run, index (run.dagRunId)}
            {@const status = getLiveStatus(run.dagId, run.dagRunId)}
            {@const taskInstances = getTaskInstancesForRun(run.dagId, run.dagRunId)}
            <div class="animate-fade-in-up" style="animation-delay: {index * 50}ms">
                <WorkflowRunCard
                    storedRun={run}
                    liveRun={status?.run ?? null}
                    {taskInstances}
                    isAvailable={status?.isAvailable ?? true}
                    onViewDetails={() => onSelectRun(run.dagId, run.dagRunId)}
                />
            </div>
        {/each}

        <!-- Unavailable workflows section (collapsible) -->
        {#if unavailableRuns.length > 0}
            <div class="mt-8 border-t border-gray-300 pt-6 dark:border-gray-600">
                <div
                    class="mb-4 flex items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-surface-900"
                >
                    <button
                        class="flex flex-1 items-center gap-3 text-left"
                        onclick={() => (showUnavailable = !showUnavailable)}
                        aria-expanded={showUnavailable}
                        aria-label="Toggle unavailable workflows section"
                    >
                        <svg
                            class="h-5 w-5 transition-transform duration-200 {showUnavailable
                                ? 'rotate-90'
                                : ''}"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Unavailable Workflows
                        </h3>
                        <span
                            class="rounded-full bg-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                            {unavailableRuns.length}
                        </span>
                    </button>
                    <button
                        class="rounded-lg bg-rose-100 px-4 py-2 font-semibold text-rose-700 transition-all duration-200 hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
                        onclick={(e) => {
                            e.stopPropagation();
                            clearAllUnavailableRuns();
                        }}
                        aria-label="Clear all unavailable workflows"
                    >
                        Clear All
                    </button>
                </div>

                {#if showUnavailable}
                    <div
                        class="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-surface-950"
                    >
                        <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            These workflows are no longer available in the system. They may have
                            been removed or exceeded the retention period. Unavailable workflows are
                            automatically pruned after {UNAVAILABLE_PRUNE_DAYS} days.
                        </p>
                        <div class="space-y-3">
                            {#each unavailableRuns as run, index (run.dagRunId)}
                                {@const status = getLiveStatus(run.dagId, run.dagRunId)}
                                {@const taskInstances = getTaskInstancesForRun(
                                    run.dagId,
                                    run.dagRunId
                                )}
                                <div
                                    class="animate-fade-in-up"
                                    style="animation-delay: {index * 50}ms"
                                >
                                    <WorkflowRunCard
                                        storedRun={run}
                                        liveRun={status?.run ?? null}
                                        {taskInstances}
                                        isAvailable={false}
                                        onViewDetails={() => onSelectRun(run.dagId, run.dagRunId)}
                                    />
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
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

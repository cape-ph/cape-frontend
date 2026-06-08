<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getWorkflowRun, getTaskInstances } from '$lib/workflowStatus';
    import type { WorkflowRun, TaskInstance } from '$lib/workflowStatus';
    import { getStoredWorkflowRuns } from '$lib/workflowRunsStorage';
    import type { SubmissionConfig } from '$lib/workflowRunsStorage';

    let {
        baseUrl,
        dagId,
        dagRunId,
        onBack,
        onHalt,
        onClear,
        isAvailable = true
    } = $props<{
        baseUrl: string;
        dagId: string;
        dagRunId: string;
        onBack: () => void;
        onHalt: () => void;
        onClear?: () => void;
        isAvailable?: boolean;
    }>();

    let workflowRun = $state<WorkflowRun | null>(null);
    let taskInstances = $state<TaskInstance[]>([]);
    let submissionConfig = $state<SubmissionConfig | null>(null);
    let isLoading = $state(true);
    let isRefreshing = $state(false);
    let error = $state<string | null>(null);
    let refreshInterval: number | undefined;

    const REFRESH_INTERVAL = 30000; // 30 seconds for detail view

    onMount(() => {
        // Load submission config from stored runs (cookie)
        const stored = getStoredWorkflowRuns();
        const match = stored.find((r) => r.dagId === dagId && r.dagRunId === dagRunId);
        submissionConfig = match?.submissionConfig ?? null;

        fetchData();
        refreshInterval = window.setInterval(() => {
            if (workflowRun?.state === 'running' || workflowRun?.state === 'queued') {
                fetchData();
            }
        }, REFRESH_INTERVAL);
    });

    onDestroy(() => {
        if (refreshInterval !== undefined) {
            clearInterval(refreshInterval);
        }
    });

    async function fetchData() {
        if (isRefreshing) return; // Prevent concurrent refreshes
        isRefreshing = true;

        try {
            const [runData, taskInstancesData] = await Promise.all([
                getWorkflowRun(baseUrl, dagId, dagRunId),
                getTaskInstances(baseUrl, dagId, dagRunId)
            ]);

            workflowRun = runData;
            taskInstances = taskInstancesData.task_instances;
            isLoading = false;
            error = null;
        } catch (err) {
            console.error('Failed to fetch workflow details:', err);
            error = err instanceof Error ? err.message : String(err);
            isLoading = false;
        } finally {
            isRefreshing = false;
        }
    }

    async function handleManualRefresh() {
        await fetchData();
    }

    const stateColors: Record<string, string> = {
        success: 'text-emerald-600 dark:text-emerald-400',
        failed: 'text-rose-600 dark:text-rose-400',
        running: 'text-indigo-600 dark:text-indigo-400',
        queued: 'text-slate-600 dark:text-slate-400',
        skipped: 'text-amber-600 dark:text-amber-400'
    };

    function formatDuration(start: string | null, end: string | null): string {
        if (!start) return '-';
        if (!end) return 'Running...';

        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const durationMs = endTime - startTime;

        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
</script>

<div class="space-y-6">
    <!-- Header with back button and refresh button -->
    <div class="flex items-center justify-between">
        <button
            class="btn btn-sm variant-ghost-primary"
            onclick={onBack}
            aria-label="Back to workflow list"
        >
            ← Back
        </button>
        <div class="flex items-center gap-3">
            <!-- Auto-refresh indicator (only for running/queued workflows) -->
            {#if workflowRun && (workflowRun.state === 'running' || workflowRun.state === 'queued')}
                <span class="text-xs text-gray-600 dark:text-gray-400"
                    >Auto-refreshes every 30s</span
                >
            {/if}
            <!-- Manual Refresh button -->
            <button
                class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                onclick={handleManualRefresh}
                disabled={isRefreshing}
                aria-label="Refresh workflow details"
                title="Manually refresh workflow details"
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
            {#if workflowRun && (workflowRun.state === 'running' || workflowRun.state === 'queued')}
                <button
                    class="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white transition-all duration-200 hover:bg-rose-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:bg-rose-700 dark:hover:bg-rose-800"
                    onclick={onHalt}
                    aria-label="Halt workflow"
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
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                    <span>Halt</span>
                </button>
            {:else if !isAvailable && onClear}
                <button
                    class="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 font-semibold text-white transition-all duration-200 hover:bg-gray-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:hover:bg-gray-800"
                    onclick={onClear}
                    aria-label="Clear this workflow"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                    </svg>
                    <span>Clear</span>
                </button>
            {/if}
        </div>
    </div>

    <!-- Workflow details card -->
    {#if isLoading}
        <div class="text-center text-gray-600 dark:text-gray-400">Loading workflow details...</div>
    {:else if error}
        <div class="text-center text-rose-600 dark:text-rose-400">
            Error loading workflow: {error}
        </div>
    {:else if !workflowRun}
        <div class="text-center text-gray-600 dark:text-gray-400">No workflow data available</div>
    {:else}
        <div class="space-y-6">
            <!-- Workflow summary card -->
            <div
                class="rounded-lg border border-gray-300 bg-white p-6 shadow-sm dark:border-gray-600 dark:bg-surface-950"
            >
                <h2 class="mb-4 text-2xl font-semibold text-gray-950 dark:text-gray-100">
                    {dagId}
                </h2>
                <dl class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt class="font-medium text-gray-600 dark:text-gray-400">Run ID</dt>
                        <dd class="font-mono text-gray-900 dark:text-gray-100">{dagRunId}</dd>
                    </div>
                    <div>
                        <dt class="font-medium text-gray-600 dark:text-gray-400">State</dt>
                        <dd
                            class="font-semibold capitalize {stateColors[workflowRun.state] ||
                                'text-gray-700 dark:text-gray-300'}"
                        >
                            {workflowRun.state}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-medium text-gray-600 dark:text-gray-400">Start Time</dt>
                        <dd class="text-gray-900 dark:text-gray-100">
                            {workflowRun.start_date
                                ? new Date(workflowRun.start_date).toLocaleString()
                                : '-'}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-medium text-gray-600 dark:text-gray-400">End Time</dt>
                        <dd class="text-gray-900 dark:text-gray-100">
                            {workflowRun.end_date
                                ? new Date(workflowRun.end_date).toLocaleString()
                                : '-'}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-medium text-gray-600 dark:text-gray-400">Duration</dt>
                        <dd class="text-gray-900 dark:text-gray-100">
                            {formatDuration(workflowRun.start_date, workflowRun.end_date)}
                        </dd>
                    </div>
                    <div>
                        <dt class="font-medium text-gray-600 dark:text-gray-400">Triggered By</dt>
                        <dd class="text-gray-900 dark:text-gray-100">{workflowRun.triggered_by}</dd>
                    </div>
                </dl>
                {#if workflowRun.note}
                    <div class="mt-4 rounded-md bg-gray-100 p-3 dark:bg-gray-800">
                        <dt class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                            Note
                        </dt>
                        <dd class="text-sm text-gray-900 dark:text-gray-100">{workflowRun.note}</dd>
                    </div>
                {/if}
            </div>

            <!-- Task instances table -->
            <div
                class="rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-surface-950"
            >
                <div class="border-b border-gray-300 p-4 dark:border-gray-600">
                    <h3 class="text-lg font-semibold text-gray-950 dark:text-gray-100">
                        Task Instances ({taskInstances.length})
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 dark:bg-surface-900">
                            <tr>
                                <th
                                    class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300"
                                    >Task</th
                                >
                                <th
                                    class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300"
                                    >State</th
                                >
                                <th
                                    class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300"
                                    >Start</th
                                >
                                <th
                                    class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300"
                                    >End</th
                                >
                                <th
                                    class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300"
                                    >Duration</th
                                >
                                <th
                                    class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300"
                                    >Try</th
                                >
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                            {#each taskInstances as task (task.id)}
                                <tr class="hover:bg-gray-50 dark:hover:bg-surface-900">
                                    <td
                                        class="px-4 py-3 font-medium text-gray-900 dark:text-gray-100"
                                    >
                                        {task.task_display_name}
                                    </td>
                                    <td class="px-4 py-3">
                                        <span
                                            class="capitalize {stateColors[
                                                task.state ?? 'queued'
                                            ] || 'text-gray-700 dark:text-gray-300'}"
                                        >
                                            {task.state ?? '-'}
                                        </span>
                                    </td>
                                    <td
                                        class="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300"
                                    >
                                        {task.start_date
                                            ? new Date(task.start_date).toLocaleTimeString()
                                            : '-'}
                                    </td>
                                    <td
                                        class="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300"
                                    >
                                        {task.end_date
                                            ? new Date(task.end_date).toLocaleTimeString()
                                            : '-'}
                                    </td>
                                    <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                                        {formatDuration(task.start_date, task.end_date)}
                                    </td>
                                    <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                                        {task.try_number}/{task.max_tries}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    {/if}

    <!-- Workflow Submission Details section -->
    {#if submissionConfig}
        <div class="space-y-3">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Workflow Submission Details
            </h2>
            <div class="space-y-3">
                <div
                    class="rounded-lg border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-surface-950"
                >
                    <p class="mb-4 text-sm text-gray-700 dark:text-gray-300">
                        This workflow was submitted with {submissionConfig.stages.length} configured stage{submissionConfig
                            .stages.length !== 1
                            ? 's'
                            : ''}:
                    </p>
                    <div class="space-y-3">
                        {#each submissionConfig.stages as stage, index (stage.stageId)}
                            {@const optionsArray = Object.entries(stage.options)}
                            <div
                                class="rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-surface-950"
                            >
                                <details class="p-4">
                                    <summary
                                        class="flex cursor-pointer items-start gap-3 text-lg font-semibold"
                                    >
                                        <svg
                                            class="mt-1 h-5 w-5 flex-shrink-0 transition-transform details-chevron"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                        <span class="flex min-w-0 flex-1 flex-col gap-1">
                                            <span>
                                                Stage {index + 1}: {stage.stageName}
                                            </span>
                                            <span
                                                class="text-xs font-medium text-gray-600 dark:text-gray-400"
                                            >
                                                {optionsArray.length} parameter{optionsArray.length !==
                                                1
                                                    ? 's'
                                                    : ''} configured
                                            </span>
                                        </span>
                                    </summary>
                                    <div class="mt-3 space-y-3">
                                        {#if optionsArray.length > 0}
                                            <div class="grid grid-cols-1 gap-3">
                                                {#each optionsArray as [key, value] (key)}
                                                    <div class="flex flex-col gap-1">
                                                        <span
                                                            class="text-xs font-medium text-gray-700 dark:text-gray-300"
                                                        >
                                                            {key}
                                                        </span>
                                                        <div
                                                            class="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-600 dark:bg-surface-900 dark:text-gray-100"
                                                        >
                                                            {typeof value === 'object'
                                                                ? JSON.stringify(value)
                                                                : String(value)}
                                                        </div>
                                                    </div>
                                                {/each}
                                            </div>
                                        {:else}
                                            <p class="text-sm text-gray-700 dark:text-gray-300">
                                                No parameters configured for this stage.
                                            </p>
                                        {/if}
                                    </div>
                                </details>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Rotate chevron when details is open */
    details[open] .details-chevron {
        transform: rotate(180deg);
    }

    /* Hide default marker */
    details > summary {
        list-style: none;
    }

    details > summary::-webkit-details-marker {
        display: none;
    }
</style>

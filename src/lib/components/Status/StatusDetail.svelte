<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { getWorkflowRun, getTaskInstances } from '$lib/workflowStatus';
    import type { WorkflowRun, TaskInstance } from '$lib/workflowStatus';

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
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    let refreshInterval: number | undefined;

    const REFRESH_INTERVAL = 5000; // 5 seconds for detail view

    onMount(() => {
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
        }
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
    <!-- Header with back button -->
    <div class="flex items-center justify-between">
        <button
            class="btn btn-sm variant-ghost-primary"
            onclick={onBack}
            aria-label="Back to workflow list"
        >
            ← Back
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

    {#if isLoading}
        <div class="flex items-center justify-center py-12">
            <div class="text-gray-600 dark:text-gray-400">Loading workflow details...</div>
        </div>
    {:else if error}
        <div
            class="rounded-lg border border-rose-300 bg-rose-50 p-4 dark:border-rose-700 dark:bg-rose-950/30"
        >
            <p class="text-sm text-rose-800 dark:text-rose-200">
                Failed to load workflow details: {error}
            </p>
        </div>
    {:else if workflowRun}
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
                    <dt class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Note</dt>
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
                                <td class="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                    {task.task_display_name}
                                </td>
                                <td class="px-4 py-3">
                                    <span
                                        class="capitalize {stateColors[task.state ?? 'queued'] ||
                                            'text-gray-700 dark:text-gray-300'}"
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
    {/if}
</div>

<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import {
        getWorkflowRun,
        getTaskInstances,
        getPipelineConfigsFromRun
    } from '$lib/workflowStatus';
    import type { WorkflowRun, TaskInstance } from '$lib/workflowStatus';
    import { getWorkflowProfilesCached } from '$lib/pipeline';
    import type { PipelineProfile } from '$lib/pipeline';
    import { readWorkflowSnapshot, updateCachedRun } from '$lib/workflowCache';
    import { getReportCount } from '$lib/report';

    let { baseUrl, dagId, dagRunId, onBack, onHalt, onViewReport } = $props<{
        baseUrl: string;
        dagId: string;
        dagRunId: string;
        onBack: () => void;
        onHalt: () => void;
        onViewReport?: (sampleId: string) => void;
    }>();

    let workflowRun = $state<WorkflowRun | null>(null);
    let taskInstances = $state<TaskInstance[]>([]);
    let isLoading = $state(true);
    let isRefreshing = $state(false);
    let error = $state<string | null>(null);
    let refreshInterval: number | undefined;
    // Reports arrive asynchronously and can appear while the workflow is still
    // running, so the count is refreshed alongside the run data (see fetchData)
    // and gates the "View report" button independently of the run's state.
    let reportCount = $state(0);

    // Submission details are reconstructed from the run's Airflow conf
    // (conf.pipelineConfigs), not from client-side storage.
    const pipelineConfigs = $derived(workflowRun ? getPipelineConfigsFromRun(workflowRun) : []);

    // The report is keyed by the sample name, which the workflow carries as the
    // `--sample` option on one of its stages (the bactopia ONT stage).
    const reportSampleId = $derived(deriveSampleId(pipelineConfigs));

    function deriveSampleId(
        configs: { nextflowOptions?: Record<string, unknown> }[]
    ): string | null {
        for (const config of configs) {
            const sample = config.nextflowOptions?.['--sample'];
            if (typeof sample === 'string' && sample.trim() !== '') {
                return sample;
            }
        }
        return null;
    }

    // Stage profiles are fetched (cached) only to show friendly names/versions;
    // conf.pipelineConfigs alone carries the actual submitted parameters.
    let stageProfiles = $state<PipelineProfile[]>([]);
    const profileById = $derived(
        new Map(
            stageProfiles
                .filter((profile) => profile.pipelineId)
                .map((profile) => [profile.pipelineId as string, profile])
        )
    );

    const REFRESH_INTERVAL = 30000; // 30 seconds for detail view

    onMount(() => {
        // Seed from the shared runs cache so the details paint instantly on
        // entry (stale-while-revalidate) instead of the "Loading..." state.
        const cached = readWorkflowSnapshot();
        const cachedRun = cached?.runs.find((run) => run.dag_run_id === dagRunId);
        if (cachedRun) {
            workflowRun = cachedRun;
            taskInstances = cached?.taskInstances[dagRunId] ?? [];
            isLoading = false;
        }

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

            // Keep the shared list cache fresh with this run's latest data.
            updateCachedRun(runData, taskInstancesData.task_instances);

            // Best-effort report count for the run's sample; drives the "View
            // report" button and its badge. Non-fatal on failure so a missing
            // or slow report endpoint never blocks the details view.
            const sampleId = deriveSampleId(getPipelineConfigsFromRun(runData));
            if (sampleId) {
                getReportCount(baseUrl, sampleId)
                    .then((count) => {
                        reportCount = count;
                    })
                    .catch((err) => {
                        console.warn('Failed to fetch report count:', err);
                    });
            } else {
                reportCount = 0;
            }

            // Best-effort friendly stage names; cached and non-fatal on failure.
            if (stageProfiles.length === 0) {
                getWorkflowProfilesCached(baseUrl, dagId)
                    .then((profiles) => {
                        stageProfiles = profiles;
                    })
                    .catch((err) => {
                        console.warn('Failed to fetch stage profiles for display:', err);
                    });
            }
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
                class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
                    class="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:outline-none dark:bg-rose-700 dark:hover:bg-rose-800"
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
            {/if}
            {#if reportSampleId && onViewReport && reportCount > 0}
                <button
                    class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none dark:bg-emerald-700 dark:hover:bg-emerald-800"
                    onclick={() => onViewReport?.(reportSampleId)}
                    aria-label="View {reportCount} report{reportCount === 1
                        ? ''
                        : 's'} for this workflow's sample"
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
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <span>View report{reportCount > 1 ? ` (${reportCount})` : ''}</span>
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
                class="dark:bg-surface-950 rounded-lg border border-gray-300 bg-white p-6 shadow-sm dark:border-gray-600"
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
                class="dark:bg-surface-950 rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600"
            >
                <div class="border-b border-gray-300 p-4 dark:border-gray-600">
                    <h3 class="text-lg font-semibold text-gray-950 dark:text-gray-100">
                        Task Instances ({taskInstances.length})
                    </h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="dark:bg-surface-900 bg-gray-50">
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
                                <tr class="dark:hover:bg-surface-900 hover:bg-gray-50">
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

    <!-- Workflow Submission Details section (reconstructed from Airflow conf) -->
    {#if pipelineConfigs.length > 0}
        <div class="space-y-3">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Workflow Submission Details
            </h2>
            <div
                class="dark:bg-surface-950 rounded-lg border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-600"
            >
                <p class="mb-4 text-sm text-gray-700 dark:text-gray-300">
                    This workflow was submitted with {pipelineConfigs.length} configured stage{pipelineConfigs.length !==
                    1
                        ? 's'
                        : ''}:
                </p>
                <div class="space-y-3">
                    {#each pipelineConfigs as stage, index (index)}
                        {@const optionsArray = Object.entries(stage.nextflowOptions ?? {})}
                        {@const profile = profileById.get(stage.pipelineId)}
                        <div
                            class="dark:bg-surface-950 rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600"
                        >
                            <details class="p-4">
                                <summary
                                    class="flex cursor-pointer items-start gap-3 text-lg font-semibold"
                                >
                                    <svg
                                        class="details-chevron mt-1 h-5 w-5 flex-shrink-0 transition-transform"
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
                                        <span
                                            >Stage {index + 1}: {profile?.pipelineName ??
                                                stage.pipelineId}{profile?.version
                                                ? ` (${profile.version})`
                                                : ''}</span
                                        >
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
                                                        class="dark:bg-surface-900 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-600 dark:text-gray-100"
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

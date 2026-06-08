<script lang="ts">
    import type { WorkflowRun, TaskInstance } from '$lib/workflowStatus';
    import type { StoredWorkflowRun } from '$lib/workflowRunsStorage';

    let { storedRun, liveRun, taskInstances, isAvailable, onViewDetails } = $props<{
        storedRun: StoredWorkflowRun;
        liveRun: WorkflowRun | null;
        taskInstances: TaskInstance[] | null;
        isAvailable: boolean;
        onViewDetails: () => void;
    }>();

    // State styling with high-contrast professional colors
    const stateConfig: Record<string, { bg: string; text: string; icon: string; border: string }> =
        {
            queued: {
                bg: 'bg-slate-100 dark:bg-slate-800',
                text: 'text-slate-700 dark:text-slate-200',
                icon: '○',
                border: 'border-slate-300'
            },
            running: {
                bg: 'bg-indigo-100 dark:bg-indigo-900',
                text: 'text-indigo-700 dark:text-indigo-200',
                icon: '⋯',
                border: 'border-indigo-400'
            },
            success: {
                bg: 'bg-emerald-100 dark:bg-emerald-900',
                text: 'text-emerald-700 dark:text-emerald-200',
                icon: '✓',
                border: 'border-emerald-400'
            },
            failed: {
                bg: 'bg-rose-100 dark:bg-rose-900',
                text: 'text-rose-700 dark:text-rose-200',
                icon: '✗',
                border: 'border-rose-400'
            },
            skipped: {
                bg: 'bg-amber-100 dark:bg-amber-900',
                text: 'text-amber-700 dark:text-amber-200',
                icon: '⊘',
                border: 'border-amber-400'
            },
            upstream_failed: {
                bg: 'bg-orange-100 dark:bg-orange-900',
                text: 'text-orange-700 dark:text-orange-200',
                icon: '↑✗',
                border: 'border-orange-400'
            },
            up_for_retry: {
                bg: 'bg-purple-100 dark:bg-purple-900',
                text: 'text-purple-700 dark:text-purple-200',
                icon: '↻',
                border: 'border-purple-400'
            },
            up_for_reschedule: {
                bg: 'bg-violet-100 dark:bg-violet-900',
                text: 'text-violet-700 dark:text-violet-200',
                icon: '⌛',
                border: 'border-violet-400'
            },
            restarting: {
                bg: 'bg-cyan-100 dark:bg-cyan-900',
                text: 'text-cyan-700 dark:text-cyan-200',
                icon: '⟲',
                border: 'border-cyan-400'
            },
            deferred: {
                bg: 'bg-pink-100 dark:bg-pink-900',
                text: 'text-pink-700 dark:text-pink-200',
                icon: '⏸',
                border: 'border-pink-400'
            },
            removed: {
                bg: 'bg-gray-200 dark:bg-gray-800',
                text: 'text-gray-600 dark:text-gray-300',
                icon: '⊗',
                border: 'border-gray-400'
            }
        };

    const completedCount = $derived(
        taskInstances?.filter((t: TaskInstance) => t.state === 'success').length ?? 0
    );
    const failedCount = $derived(
        taskInstances?.filter((t: TaskInstance) => t.state === 'failed').length ?? 0
    );
    const totalCount = $derived(taskInstances?.length ?? 0);

    const completedPercent = $derived(totalCount > 0 ? (completedCount / totalCount) * 100 : 0);
    const failedPercent = $derived(totalCount > 0 ? (failedCount / totalCount) * 100 : 0);

    const submittedDate = $derived(new Date(storedRun.submittedAt).toLocaleString());

    const currentState = $derived(liveRun?.state ?? 'queued');
    const stateStyle = $derived(stateConfig[currentState] ?? stateConfig.queued);

    // Determine if card needs failure accent border
    const needsAttention = $derived(
        liveRun?.state === 'failed' ||
            liveRun?.state === 'upstream_failed' ||
            (failedCount > 0 && liveRun?.state === 'running')
    );
</script>

<div
    class="rounded-lg border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-surface-950 {needsAttention
        ? 'border-l-4 border-rose-500 dark:border-rose-600'
        : 'border-gray-300 dark:border-gray-600'} {!isAvailable
        ? 'opacity-70 grayscale-[0.5]'
        : ''}"
    role="article"
    aria-label="Workflow run {storedRun.dagId}"
>
    <div class="p-4">
        <div class="mb-3 flex items-start justify-between">
            <div class="flex-1">
                <h3 class="text-lg font-semibold tracking-tight text-gray-950 dark:text-gray-100">
                    {storedRun.dagId}
                </h3>
                <p class="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {submittedDate}
                </p>
            </div>
            {#if liveRun && isAvailable}
                <span
                    class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium {stateStyle.bg} {stateStyle.text}"
                    role="status"
                    aria-label="Workflow state: {liveRun.state}"
                >
                    <span class="text-base" aria-hidden="true">{stateStyle.icon}</span>
                    <span>{liveRun.state}</span>
                </span>
            {:else if !isAvailable}
                <span
                    class="flex items-center gap-1.5 rounded-full bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    role="status"
                >
                    <span class="text-base" aria-hidden="true">?</span>
                    <span>unavailable</span>
                </span>
            {:else}
                <span
                    class="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                >
                    <span class="animate-pulse">...</span>
                    <span>loading</span>
                </span>
            {/if}
        </div>

        {#if liveRun && isAvailable && taskInstances}
            <div class="mb-2 flex items-center justify-between">
                <div class="flex items-center gap-3 text-sm">
                    <span class="font-medium text-gray-700 dark:text-gray-300">Tasks:</span>
                    <span
                        class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                        aria-label="{completedCount} completed tasks"
                    >
                        <span aria-hidden="true">✓</span>
                        <span>{completedCount}</span>
                    </span>
                    {#if failedCount > 0}
                        <span
                            class="flex items-center gap-1 text-rose-600 dark:text-rose-400"
                            aria-label="{failedCount} failed tasks"
                        >
                            <span aria-hidden="true">✗</span>
                            <span>{failedCount}</span>
                        </span>
                    {/if}
                    <span class="text-gray-500 dark:text-gray-400">/ {totalCount}</span>
                </div>
                <span class="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {Math.round(completedPercent)}%
                </span>
            </div>

            <!-- Tri-color segmented progress bar -->
            <div
                class="mb-4 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                role="progressbar"
                aria-valuenow={completedPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Task progress: {Math.round(completedPercent)}% complete"
            >
                <div class="flex h-full">
                    <!-- Completed segment (green) -->
                    {#if completedPercent > 0}
                        <div
                            class="bg-emerald-500 transition-all duration-500 {liveRun.state ===
                            'running'
                                ? 'animate-pulse'
                                : ''}"
                            style="width: {completedPercent}%"
                        ></div>
                    {/if}
                    <!-- Failed segment (red) -->
                    {#if failedPercent > 0}
                        <div
                            class="bg-rose-500 transition-all duration-500"
                            style="width: {failedPercent}%"
                        ></div>
                    {/if}
                    <!-- Pending/remaining is shown by the gray background -->
                </div>
            </div>
        {:else if !isAvailable}
            <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                This workflow run is no longer available in the system. It may have been removed or
                the retention period has expired.
            </p>
        {/if}

        <button
            class="btn btn-sm variant-filled-primary transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-offset-2"
            onclick={onViewDetails}
            disabled={!isAvailable}
            aria-label="View details for workflow {storedRun.dagId}"
        >
            View Details
        </button>
    </div>
</div>

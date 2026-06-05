<script lang="ts">
    import { haltWorkflow } from '$lib/workflowStatus';
    import { toaster } from '$lib/toaster';

    let { baseUrl, dagId, dagRunId, isOpen, onClose, onSuccess } = $props<{
        baseUrl: string;
        dagId: string;
        dagRunId: string;
        isOpen: boolean;
        onClose: () => void;
        onSuccess: () => void;
    }>();

    let note = $state('');
    let isSubmitting = $state(false);

    async function handleHalt() {
        if (isSubmitting) return;

        isSubmitting = true;

        try {
            await haltWorkflow(baseUrl, dagId, dagRunId, note || undefined);

            toaster.success({
                title: 'Workflow halted successfully',
                description: 'The workflow has been marked for termination'
            });

            onSuccess();
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            toaster.error({
                title: 'Failed to halt workflow',
                description: message
            });
        } finally {
            isSubmitting = false;
        }
    }

    function handleCancel() {
        note = '';
        onClose();
    }
</script>

{#if isOpen}
    <!-- Modal backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onclick={handleCancel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="halt-modal-title"
        tabindex="-1"
    >
        <!-- Modal content -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="relative w-full max-w-md rounded-lg border border-gray-300 bg-white p-6 shadow-xl dark:border-gray-600 dark:bg-surface-950"
            onclick={(e) => e.stopPropagation()}
        >
            <h3
                id="halt-modal-title"
                class="mb-4 text-xl font-semibold text-gray-950 dark:text-gray-100"
            >
                Halt Workflow
            </h3>

            <p class="mb-4 text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to halt this workflow? This action will terminate all running
                tasks and cannot be undone.
            </p>

            <div class="mb-2 rounded-md bg-rose-50 p-3 dark:bg-rose-950/30">
                <p class="text-xs text-rose-800 dark:text-rose-200">
                    <strong>Warning:</strong> Halting a workflow will stop all in-progress tasks immediately.
                    Any results from incomplete tasks will not be saved.
                </p>
            </div>

            <div class="mb-6">
                <label
                    for="halt-note"
                    class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                    Reason (optional)
                </label>
                <textarea
                    id="halt-note"
                    bind:value={note}
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-surface-900 dark:text-gray-100 dark:placeholder-gray-400"
                    rows="3"
                    placeholder="Explain why you're halting this workflow..."
                    aria-label="Halt reason"
                ></textarea>
            </div>

            <div class="flex justify-end gap-3">
                <button
                    class="rounded-lg bg-gray-200 px-6 py-2.5 font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    onclick={handleCancel}
                    disabled={isSubmitting}
                    aria-label="Cancel"
                >
                    Cancel
                </button>
                <button
                    class="rounded-lg bg-rose-600 px-6 py-2.5 font-semibold text-white transition-all duration-200 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:bg-rose-700 dark:hover:bg-rose-800"
                    onclick={handleHalt}
                    disabled={isSubmitting}
                    aria-label="Confirm halt workflow"
                >
                    {isSubmitting ? 'Halting...' : 'Halt'}
                </button>
            </div>
        </div>
    </div>
{/if}

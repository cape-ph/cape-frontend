<script lang="ts">
    import { toaster } from '$lib/toaster';
    import axios, { type CancelTokenSource } from 'axios';

    const {
        baseUrl,
        reportId = 'bactopia-single-sample-analysis'
    }: {
        baseUrl: string;
        reportId: string;
    } = $props();

    let sampleId = $state('');
    let html = $state('');
    let submittedSampleId = $state<string | null>(null);
    let activeRequest:
        | {
              key: number;
              cancelSource: CancelTokenSource;
          }
        | undefined = undefined;
    let requestSequence = 0;

    const isLoadingSubmittedSample = $derived(
        submittedSampleId !== null && sampleId.trim() === submittedSampleId
    );
    const canLoad = $derived(sampleId.trim().length > 0 && !isLoadingSubmittedSample);
    const buttonText = $derived(isLoadingSubmittedSample ? 'Loading Report...' : 'Load Report');

    async function onLoad() {
        const targetSampleId = sampleId.trim();

        if (targetSampleId.length === 0) {
            toaster.error({
                title: 'Missing a sample id.'
            });
            return;
        }

        if (activeRequest) {
            activeRequest.cancelSource.cancel('New request initiated');
        }

        html = '';
        const requestKey = ++requestSequence;
        const currentCancelSource = axios.CancelToken.source();

        activeRequest = {
            key: requestKey,
            cancelSource: currentCancelSource
        };
        submittedSampleId = targetSampleId;

        try {
            const result = await axios.get(`${baseUrl}/report/create`, {
                params: {
                    format: 'html',
                    reportId: reportId,
                    sampleId: targetSampleId
                },
                responseType: 'text', // ensure we get raw HTML
                headers: { Accept: 'text/html' }, // optional, helps some servers
                cancelToken: currentCancelSource.token
            });

            if (isActiveRequest(requestKey)) {
                html = typeof result.data === 'string' ? result.data : String(result.data);
            }
        } catch (err: unknown) {
            if (axios.isCancel(err)) {
                return;
            }
            if (!isActiveRequest(requestKey)) {
                return;
            }
            const message =
                err &&
                typeof err === 'object' &&
                'message' in err &&
                typeof err.message === 'string'
                    ? err.message
                    : 'Unknown error';
            toaster.error({
                title: 'Failed to load report',
                description: message
            });
        } finally {
            if (isActiveRequest(requestKey)) {
                submittedSampleId = null;
                activeRequest = undefined;
            }
        }
    }

    function isActiveRequest(requestKey: number) {
        return activeRequest?.key === requestKey;
    }

    function onSampleIdKeydown(event: KeyboardEvent) {
        if (event.key !== 'Enter' || !canLoad) {
            return;
        }

        event.preventDefault();
        void onLoad();
    }
</script>

<div class="mb-5 space-y-2">
    <h2 class="text-primary-700 dark:text-primary-300 text-2xl font-semibold">Report</h2>
    <p class="text-sm text-gray-700 dark:text-gray-300">
        Load a generated analysis report by sample ID.
    </p>
</div>

<div class="w-full text-gray-950 dark:text-gray-100">
    <div class="space-y-6">
        <section class="space-y-3">
            <h2 class="text-lg font-semibold">Metadata</h2>
            <div class="grid grid-cols-1 gap-3">
                <label class="flex flex-col gap-1">
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300"
                        >sampleId</span
                    >
                    <input
                        id="report-sample-id"
                        name="report-sample-id"
                        class="input input-bordered bg-white text-gray-950 dark:bg-surface-950 dark:text-gray-100"
                        type="text"
                        bind:value={sampleId}
                        onkeydown={onSampleIdKeydown}
                        aria-label="Sample ID"
                    />
                </label>
            </div>
            <button
                class="btn preset-filled-primary-500 mt-2 rounded-lg shadow-lg"
                onclick={onLoad}
                disabled={!canLoad}
            >
                {buttonText}
            </button>
        </section>
    </div>
</div>

{#if html}
    <div class="w-full max-w-full pb-8 sm:pb-10">
        <iframe
            title="Embedded Report"
            srcdoc={html}
            sandbox=""
            referrerpolicy="no-referrer"
            loading="lazy"
            class="mt-3 h-[70vh] w-full rounded-lg border border-gray-300 bg-white dark:border-gray-600"
        ></iframe>
    </div>
{:else}
    <div class="w-full pb-8 sm:pb-10">
        <p class="mt-3 text-sm text-gray-700 dark:text-gray-300">No report loaded yet.</p>
    </div>
{/if}

<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { toaster } from '$lib/toaster';
    import axios, { type CancelTokenSource } from 'axios';

    const {
        baseUrl,
        initialSampleId = null,
        onSampleLoad
    }: {
        baseUrl: string;
        initialSampleId?: string | null;
        onSampleLoad?: (sampleId: string) => void;
    } = $props();

    const REFRESH_INTERVAL = 30000; // 30 seconds

    type Report = {
        createdAt: string;
        body: string;
    };

    let sampleId = $state('');
    let reports = $state<Record<string, Report>>({});
    // Per-report open/closed state, keyed by report id and preserved across
    // refreshes so a background refresh never re-expands a report the user
    // collapsed. Reports absent from this map default to expanded.
    let expandedState = $state<Record<string, boolean>>({});
    let submittedSampleId = $state<string | null>(null);
    // The sample whose reports are currently displayed; refreshes target it
    // regardless of what the user is typing into the input.
    let loadedSampleId = $state<string | null>(null);
    let hasLoaded = $state(false);
    let isRefreshing = $state(false);
    let activeRequest:
        | {
              key: number;
              cancelSource: CancelTokenSource;
          }
        | undefined = undefined;
    let requestSequence = 0;
    let refreshInterval: number | undefined;
    let reportsContainer = $state<HTMLDivElement | undefined>(undefined);
    // Watches each report document's own size so the container follows content
    // that grows or shrinks after load (e.g. report scripts expanding rows).
    let contentResizeObserver: ResizeObserver | undefined;

    // Oldest report first. Entries without a parseable createdAt sort last.
    const reportEntries = $derived(
        Object.entries(reports).sort(
            ([, a], [, b]) => createdAtTime(a.createdAt) - createdAtTime(b.createdAt)
        )
    );
    const hasReports = $derived(reportEntries.length > 0);
    // Reports are generated asynchronously and more can appear over time, so
    // poll on an interval for as long as a sample is loaded, mirroring the
    // workflow pages' auto-refresh.
    const autoRefreshing = $derived(hasLoaded && loadedSampleId !== null);

    const isLoadingSubmittedSample = $derived(
        submittedSampleId !== null && sampleId.trim() === submittedSampleId
    );
    const canLoad = $derived(sampleId.trim().length > 0 && !isLoadingSubmittedSample);
    const buttonText = $derived(isLoadingSubmittedSample ? 'Loading Reports...' : 'Load Reports');

    onMount(() => {
        refreshInterval = window.setInterval(() => {
            if (autoRefreshing && !isRefreshing && !isLoadingSubmittedSample) {
                void refreshReports();
            }
        }, REFRESH_INTERVAL);

        // Map an observed report element back to its iframe (same-origin) and
        // re-measure it whenever its content height changes.
        contentResizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const iframe = entry.target.ownerDocument?.defaultView
                    ?.frameElement as HTMLIFrameElement | null;
                if (iframe) {
                    resizeIframe(iframe);
                }
            }
        });

        window.addEventListener('resize', resizeAllIframes);
    });

    onDestroy(() => {
        if (refreshInterval !== undefined) {
            clearInterval(refreshInterval);
        }
        contentResizeObserver?.disconnect();
        window.removeEventListener('resize', resizeAllIframes);
    });

    // A sample id supplied via the URL (initialSampleId) drives an automatic
    // load so a refreshed page or shared link reproduces the same reports.
    // Tracked per distinct value so an echoed URL update or a failed fetch does
    // not retrigger the load.
    let lastAutoloaded: string | null = null;
    $effect(() => {
        const incoming = initialSampleId?.trim() ?? '';
        if (incoming.length === 0 || incoming === lastAutoloaded) {
            return;
        }
        lastAutoloaded = incoming;
        sampleId = incoming;
        void loadSample(incoming, { syncUrl: false });
    });

    // Use the report document's own <title> as the accordion heading, falling
    // back to a readable form of the report id when the HTML has no title.
    function reportTitle(reportHtml: string, reportId: string): string {
        try {
            const parsed = new DOMParser().parseFromString(reportHtml, 'text/html');
            const title = parsed.querySelector('title')?.textContent?.trim();
            if (title) {
                return title;
            }
        } catch {
            // Parsing failed; fall through to the id-derived name.
        }
        const cleaned = reportId.replace(/[-_]+/g, ' ').trim();
        if (cleaned.length === 0) {
            return reportId;
        }
        return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    // Sortable time for a createdAt string; unparseable/missing sorts last.
    function createdAtTime(createdAt: string): number {
        const time = Date.parse(createdAt);
        return Number.isNaN(time) ? Infinity : time;
    }

    // Render createdAt in the browser's local timezone, including the zone name.
    function formatCreatedAt(createdAt: string): string {
        const time = Date.parse(createdAt);
        if (Number.isNaN(time)) {
            return '';
        }
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
        }).format(time);
    }

    async function onLoad() {
        const targetSampleId = sampleId.trim();

        if (targetSampleId.length === 0) {
            toaster.error({
                title: 'Missing a sample id.'
            });
            return;
        }

        await loadSample(targetSampleId, { syncUrl: true });
    }

    // Core load for a sample. syncUrl reflects the sample into the URL (via
    // onSampleLoad) for the user-initiated path; the URL-driven auto-load skips
    // it since the param is already present.
    async function loadSample(
        targetSampleId: string,
        { syncUrl = true }: { syncUrl?: boolean } = {}
    ) {
        if (activeRequest) {
            activeRequest.cancelSource.cancel('New request initiated');
        }

        // A fresh load is a new context: clear reports and their expand state.
        reports = {};
        expandedState = {};
        hasLoaded = false;
        const requestKey = ++requestSequence;
        const currentCancelSource = axios.CancelToken.source();

        activeRequest = {
            key: requestKey,
            cancelSource: currentCancelSource
        };
        submittedSampleId = targetSampleId;

        if (syncUrl) {
            onSampleLoad?.(targetSampleId);
        }

        try {
            const result = await axios.get(`${baseUrl}/report/get`, {
                params: {
                    sampleId: targetSampleId
                },
                cancelToken: currentCancelSource.token
            });

            if (isActiveRequest(requestKey)) {
                reports = normalizeReports(result.data);
                loadedSampleId = targetSampleId;
                hasLoaded = true;
            }
        } catch (err: unknown) {
            if (axios.isCancel(err)) {
                return;
            }
            if (!isActiveRequest(requestKey)) {
                return;
            }
            toaster.error({
                title: 'Failed to load reports',
                description: errorMessage(err)
            });
        } finally {
            if (isActiveRequest(requestKey)) {
                submittedSampleId = null;
                activeRequest = undefined;
            }
        }
    }

    // Re-fetch the loaded sample without tearing down the current view. Only
    // reassign reports when the payload actually changed so unchanged iframes
    // are not reloaded (which would flicker), and preserve user expand state.
    async function refreshReports() {
        const targetSampleId = loadedSampleId;
        if (targetSampleId === null || isRefreshing) {
            return;
        }

        isRefreshing = true;
        try {
            const result = await axios.get(`${baseUrl}/report/get`, {
                params: {
                    sampleId: targetSampleId
                }
            });
            const next = normalizeReports(result.data);
            if (!reportsEqual(next, reports)) {
                reports = next;
            }
            hasLoaded = true;
        } catch (err) {
            console.error('Failed to refresh reports:', err);
        } finally {
            isRefreshing = false;
        }
    }

    // The endpoint returns a { reportId: { createdAt, body } } map. Keep only
    // entries with a string body (tolerating a legacy plain-string value) so a
    // malformed payload cannot break rendering.
    function normalizeReports(data: unknown): Record<string, Report> {
        if (!data || typeof data !== 'object') {
            return {};
        }
        const result: Record<string, Report> = {};
        for (const [id, value] of Object.entries(data as Record<string, unknown>)) {
            if (typeof value === 'string') {
                result[id] = { createdAt: '', body: value };
            } else if (
                value &&
                typeof value === 'object' &&
                typeof (value as { body?: unknown }).body === 'string'
            ) {
                const entry = value as { body: string; createdAt?: unknown };
                result[id] = {
                    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
                    body: entry.body
                };
            }
        }
        return result;
    }

    function reportsEqual(a: Record<string, Report>, b: Record<string, Report>): boolean {
        const aKeys = Object.keys(a);
        if (aKeys.length !== Object.keys(b).length) {
            return false;
        }
        return aKeys.every(
            (key) =>
                b[key] !== undefined &&
                a[key].body === b[key].body &&
                a[key].createdAt === b[key].createdAt
        );
    }

    function isReportExpanded(reportId: string): boolean {
        return expandedState[reportId] ?? true;
    }

    function onReportToggle(reportId: string, event: Event) {
        const details = event.currentTarget as HTMLDetailsElement;
        expandedState[reportId] = details.open;
        if (details.open) {
            const iframe = details.querySelector('iframe');
            if (iframe) {
                resizeIframe(iframe);
            }
        }
    }

    // Size the iframe to its content so the report reads as part of the card
    // instead of a scrollable inner frame. sandbox="allow-same-origin
    // allow-scripts" lets us measure the content and lets interactive report
    // HTML (buttons, scripts) run; report bodies are treated as trusted.
    function resizeIframe(iframe: HTMLIFrameElement) {
        try {
            const doc = iframe.contentDocument;
            if (!doc) {
                return;
            }
            // Collapse the frame before measuring so a previously-tall iframe
            // does not pin documentElement.scrollHeight to its own height and
            // prevent the container from shrinking when content gets shorter.
            // The reset and re-set happen in one task, so no intermediate
            // height is painted.
            const previous = iframe.style.height;
            iframe.style.height = '0px';
            const height = Math.max(
                doc.documentElement?.scrollHeight ?? 0,
                doc.body?.scrollHeight ?? 0
            );
            iframe.style.height = height > 0 ? `${height}px` : previous;
        } catch {
            // Measurement blocked; leave the placeholder height in place.
        }
    }

    // On load, size the iframe once and start observing its document so later
    // content-height changes keep the container in sync.
    function onIframeLoad(iframe: HTMLIFrameElement) {
        resizeIframe(iframe);
        const doc = iframe.contentDocument;
        if (!doc || !contentResizeObserver) {
            return;
        }
        contentResizeObserver.observe(doc.documentElement);
        if (doc.body) {
            contentResizeObserver.observe(doc.body);
        }
    }

    function resizeAllIframes() {
        if (!reportsContainer) {
            return;
        }
        for (const iframe of reportsContainer.querySelectorAll('iframe')) {
            resizeIframe(iframe as HTMLIFrameElement);
        }
    }

    function errorMessage(err: unknown): string {
        return err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
            ? err.message
            : 'Unknown error';
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

<div class="mb-6 space-y-2">
    <h2 class="text-primary-700 dark:text-primary-300 text-2xl font-semibold tracking-tight">
        Reports
    </h2>
    <p class="text-sm text-gray-700 dark:text-gray-300">
        Load all available analysis reports for a sample by its ID.
    </p>
</div>

<div class="w-full text-gray-950 dark:text-gray-100">
    <div class="space-y-6">
        <section class="space-y-3">
            <div class="grid grid-cols-1 gap-3">
                <label class="flex flex-col gap-1">
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-300"
                        >sampleId</span
                    >
                    <input
                        id="report-sample-id"
                        name="report-sample-id"
                        class="input input-bordered dark:bg-surface-950 bg-white text-gray-950 dark:text-gray-100"
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

<div class="mt-6 w-full pb-8 sm:pb-10">
    {#if hasLoaded}
        <div class="mb-4 flex items-center justify-between gap-3">
            <div class="text-xs text-gray-600 dark:text-gray-400">
                {#if hasReports}
                    {reportEntries.length} report{reportEntries.length === 1 ? '' : 's'} loaded
                {/if}
            </div>
            <div class="flex items-center gap-3">
                {#if autoRefreshing}
                    <span class="text-xs text-gray-600 dark:text-gray-400"
                        >Auto-refreshes every 30s</span
                    >
                {/if}
                <button
                    class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    onclick={refreshReports}
                    disabled={isRefreshing}
                    aria-label="Refresh reports"
                    title="Manually refresh reports"
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
            </div>
        </div>
    {/if}

    {#snippet placeholder(message: string)}
        <div
            class="dark:bg-surface-900 flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-600"
        >
            <p class="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
    {/snippet}

    {#if hasReports}
        <div class="space-y-4" bind:this={reportsContainer}>
            {#each reportEntries as [reportId, report] (reportId)}
                {@const created = formatCreatedAt(report.createdAt)}
                <div
                    class="dark:bg-surface-950 rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-600"
                >
                    <details
                        class="p-4"
                        open={isReportExpanded(reportId)}
                        ontoggle={(event) => onReportToggle(reportId, event)}
                    >
                        <summary
                            class="flex cursor-pointer items-center gap-3 text-lg font-semibold"
                        >
                            <svg
                                class="details-chevron h-5 w-5 flex-shrink-0 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                            <span class="min-w-0 flex-1">{reportTitle(report.body, reportId)}</span>
                            {#if created}
                                <span
                                    class="flex-shrink-0 text-xs font-normal whitespace-nowrap text-gray-500 dark:text-gray-400"
                                >
                                    {created}
                                </span>
                            {/if}
                        </summary>
                        <div class="mt-3">
                            <iframe
                                title="Report: {reportId}"
                                srcdoc={report.body}
                                sandbox="allow-same-origin allow-scripts"
                                referrerpolicy="no-referrer"
                                scrolling="no"
                                onload={(event) =>
                                    onIframeLoad(event.currentTarget as HTMLIFrameElement)}
                                style="height: 24rem;"
                                class="block w-full overflow-hidden border-0 bg-transparent"
                            ></iframe>
                        </div>
                    </details>
                </div>
            {/each}
        </div>
    {:else if hasLoaded}
        {@render placeholder('No reports available at this time')}
    {:else}
        {@render placeholder('Enter a sample ID and load reports to get started')}
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

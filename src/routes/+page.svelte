<script lang="ts">
    import FileUpload from '$lib/components/FileUpload/FileUpload.svelte';
    import Submit from '$lib/components/Submit/Submit.svelte';
    import Report from '$lib/components/Report/Report.svelte';
    import Status from '$lib/components/Status/Status.svelte';
    import StatusDetail from '$lib/components/Status/StatusDetail.svelte';
    import HaltWorkflowModal from '$lib/components/Status/HaltWorkflowModal.svelte';
    import LoggingIn from '$lib/components/LoggingIn/LoggingIn.svelte';
    import { auth } from '$lib/user.svelte';
    import { removeWorkflowRun } from '$lib/workflowRunsStorage';
    import { removeStoredRun, getLiveStatus } from '$lib/workflowRuns.svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { resolve } from '$app/paths';
    import { onMount } from 'svelte';

    import Navbar from '$lib/components/Navbar/Navbar.svelte';
    import logo from '$lib/images/wordmark-color.svg';

    let activeKey = $state('upload');

    // Workflows view state
    let workflowsView = $state<'list' | 'submit' | 'detail'>('list');
    let selectedDagId = $state<string | null>(null);
    let selectedDagRunId = $state<string | null>(null);
    let showHaltModal = $state(false);

    const links = [
        { key: 'upload', label: 'Upload' },
        { key: 'workflows', label: 'Workflows' },
        { key: 'report', label: 'Report' }
    ];
    const apiBase = 'https://api.cape-dev.org/capi-dev';

    // Sync state with URL on mount and when URL changes
    onMount(() => {
        const unsubscribe = page.subscribe(($page) => {
            if (!$page?.url) {
                return;
            }

            const params = $page.url.searchParams;
            const tab = params.get('tab');
            const view = params.get('view');
            const dagId = params.get('dagId');
            const dagRunId = params.get('dagRunId');

            // Restore tab
            if (tab && links.some((l) => l.key === tab)) {
                activeKey = tab;
            }

            // Restore workflows view state
            if (activeKey === 'workflows') {
                if (view === 'submit') {
                    workflowsView = 'submit';
                } else if (view === 'detail' && dagId && dagRunId) {
                    workflowsView = 'detail';
                    selectedDagId = dagId;
                    selectedDagRunId = dagRunId;
                } else {
                    workflowsView = 'list';
                }
            }
        });

        return unsubscribe;
    });

    function onSelect(key: string) {
        activeKey = key;
        // Update URL when switching tabs
        goto(resolve(`/?tab=${key}` as `/?${string}`), { replaceState: false });

        // Reset workflows view when leaving workflows tab
        if (key !== 'workflows') {
            workflowsView = 'list';
            selectedDagId = null;
            selectedDagRunId = null;
        }
    }

    function handleSelectRun(dagId: string, dagRunId: string) {
        selectedDagId = dagId;
        selectedDagRunId = dagRunId;
        workflowsView = 'detail';
        // Update URL with workflow detail
        goto(
            resolve(
                `/?tab=workflows&view=detail&dagId=${encodeURIComponent(dagId)}&dagRunId=${encodeURIComponent(dagRunId)}` as `/?${string}`
            ),
            { replaceState: false }
        );
    }

    function handleBackToList() {
        workflowsView = 'list';
        selectedDagId = null;
        selectedDagRunId = null;
        // Update URL to workflows list
        goto(resolve('/?tab=workflows' as `/?${string}`), { replaceState: false });
    }

    function handleOpenHaltModal() {
        showHaltModal = true;
    }

    function handleCloseHaltModal() {
        showHaltModal = false;
    }

    function handleHaltSuccess() {
        // Modal will close automatically, detail view will refresh
    }

    function handleNavigateToSubmit() {
        workflowsView = 'submit';
        // Update URL to submit view
        goto(resolve('/?tab=workflows&view=submit' as `/?${string}`), { replaceState: false });
    }

    function handleClearWorkflow() {
        if (selectedDagId && selectedDagRunId) {
            removeWorkflowRun(selectedDagId, selectedDagRunId);
            removeStoredRun(selectedDagId, selectedDagRunId);
            handleBackToList();
        }
    }
</script>

{#if auth.user}
    <Navbar {logo} user={auth.user} {links} {activeKey} {onSelect} />
    <main>
        <div class="mx-auto mt-8 flex min-h-screen w-full max-w-4xl justify-center px-4">
            {#if activeKey === 'upload'}
                <div class="w-full max-w-lg">
                    <FileUpload
                        baseUrl={apiBase}
                        bucket="ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5"
                    />
                </div>
            {:else if activeKey === 'workflows'}
                <div class="w-full max-w-4xl">
                    {#if workflowsView === 'list'}
                        <Status
                            baseUrl={apiBase}
                            onSelectRun={handleSelectRun}
                            onNavigateToSubmit={handleNavigateToSubmit}
                        />
                    {:else if workflowsView === 'submit'}
                        <Submit baseUrl={apiBase} onNavigateToDetail={handleSelectRun} />
                    {:else if workflowsView === 'detail' && selectedDagId && selectedDagRunId}
                        {@const status = getLiveStatus(selectedDagId, selectedDagRunId)}
                        {@const isAvailable = status?.isAvailable ?? true}
                        <StatusDetail
                            baseUrl={apiBase}
                            dagId={selectedDagId}
                            dagRunId={selectedDagRunId}
                            onBack={handleBackToList}
                            onHalt={handleOpenHaltModal}
                            onClear={handleClearWorkflow}
                            {isAvailable}
                        />
                        <HaltWorkflowModal
                            baseUrl={apiBase}
                            dagId={selectedDagId}
                            dagRunId={selectedDagRunId}
                            isOpen={showHaltModal}
                            onClose={handleCloseHaltModal}
                            onSuccess={handleHaltSuccess}
                        />
                    {/if}
                </div>
            {:else if activeKey === 'report'}
                <div class="w-full max-w-lg">
                    <Report baseUrl={apiBase} reportId="bactopia-single-sample-analysis" />
                </div>
            {/if}
        </div>
    </main>
{:else}
    <div class="flex h-screen items-center justify-center">
        <div class="w-lg">
            <LoggingIn />
        </div>
    </div>
{/if}

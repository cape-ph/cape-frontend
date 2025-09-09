<script lang="ts">
    import { toaster } from '$lib/toaster';
    import axios from 'axios';

    const {
        baseUrl,
        reportId = 'bactopia-single-sample-analysis'
    }: {
        baseUrl: string;
        reportId: string;
    } = $props();

    let sampleId = $state('');
    let html = $state('');
    let loading = $state(false);

    async function onLoad() {
        if (sampleId.length === 0) {
            toaster.error({
                title: 'Missing a sample id.'
            });
            return;
        }

        html = '';
        loading = true;

        try {
            const result = await axios.get(`${baseUrl}/report/create`, {
                params: {
                    format: 'html',
                    reportId: reportId,
                    sampleId: sampleId
                },
                responseType: 'text', // ensure we get raw HTML
                headers: { Accept: 'text/html' } // optional, helps some servers
            });

            html = typeof result.data === 'string' ? result.data : String(result.data);
        } catch (err: any) {
            toaster.error({
                title: 'Failed to load report',
                description: err?.message ?? 'Unknown error'
            });
        } finally {
            loading = false;
        }
    }
</script>

<div class="mb-4 space-y-2">
    <h2 class="text-primary-500 text-2xl font-semibold">Report</h2>
</div>

<div class="w-lg">
<div class="space-y-6">
    <section class="space-y-3">
        <h2 class="text-lg font-semibold">Metadata</h2>
        <div class="grid grid-cols-1 gap-3">
            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">sampleId</span>
                <input
                    class="input input-bordered"
                    type="text"
                    bind:value={sampleId}
                    aria-label="Sample ID"
                />
            </label>
        </div>
        <button class="btn preset-filled-primary-500 mt-2" onclick={onLoad}>Load Report</button>
    </section>
</div>
</div>

{#if loading}
<div class="w-lg">
<p style="margin-top: .75rem; color:#475569;">Loading…</p>
</div>
{:else if html}
    
<div class="w-6xl">
    <iframe
        title="Embedded Report"
        srcdoc={html}
        sandbox=""
        referrerpolicy="no-referrer"
        loading="lazy"
        style="width:100%; height:70vh; border:1px solid #e2e8f0; border-radius:12px; margin-top:.75rem; background:#fff;"
    ></iframe>
</div>
{:else}
<div class="w-lg">
<p style="margin-top:.75rem; color:#64748b;">No report loaded yet.</p>
</div>
{/if}

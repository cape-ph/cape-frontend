<script lang="ts">
    import { toaster } from '$lib/toaster';
    import { FileUpload } from '@skeletonlabs/skeleton-svelte';
    import { multiPartUpload } from '$lib/mpu';
    import { tarSize, tarPack, chunkStream } from '$lib/stream';
    import FileUploadProgress from './FileUploadProgress.svelte';
    import type { OnProgress } from '$lib/mpu';
    import type { Api } from '@zag-js/file-upload';
    import type { Upload, RejectFile } from './types';

    import ImagePlus from '@lucide/svelte/icons/image-plus';
    let { baseUrl, bucket } = $props<{ baseUrl: string; bucket: string }>();

    let api = $state<Api | undefined>(undefined);
    let upload = $state<Upload>({
        state: 'pending',
        bytesSent: 0,
        totalBytes: 0
    });
    let sampleId = $state('');
    let sampleType = $state('');
    let sampleMatrix = $state('');
    let sampleCollectionLocation = $state('');
    let sampleCollectionDate = $state<Date>(new Date());
    const components = $derived(api?.acceptedFiles ?? []);
    const filename = $derived(sampleId ? `sample-${sampleId}.tar` : '');
    const fileListCss = $derived(
        api?.acceptedFiles && api.acceptedFiles.length > 0
            ? 'mt-2 max-h-35 overflow-y-auto space-y-1 border border-surface-200-800 rounded-container no-scrollbar'
            : 'hidden'
    );
    const buttonCss = 'btn preset-filled-primary-500 w-full rounded-lg shadow-lg';
    const buttonDoneCss = 'btn w-full rounded-lg shadow-lg';

    // Date formatting
    // const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
    // const parseDate = (s: string) => (s ? new Date(s + 'T00:00:00') : undefined);
    function fmtDate(d: Date): string {
        // base parts
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const hour = String(d.getUTCHours()).padStart(2, '0');
        const min = String(d.getUTCMinutes()).padStart(2, '0');
        const sec = String(d.getUTCSeconds()).padStart(2, '0');

        // milliseconds (pad to 3 digits)
        const ms = String(d.getUTCMilliseconds()).padStart(3, '0');

        // Format like 2025-08-15T14:36:28.024+00:00
        return `${year}-${month}-${day}T${hour}:${min}:${sec}.${ms}+00:00`;
    }

    function parseDate(s: string): Date | undefined {
        return s ? new Date(s) : undefined;
    }

    /**
     * Check that the file is a .fastq.gz file
     * @param file - the file to check
     */
    function validateFile(file: File) {
        if (!file.name.endsWith('.fastq.gz')) {
            return ['NOT_A_FASTQ_GZ_FILE'];
        }
        return null;
    }

    /**
     * Callback triggered if a file fails validation
     */
    function onFileReject({ files }: { files: RejectFile[] }) {
        for (const rejection of files) {
            if (rejection.errors.includes('NOT_A_FASTQ_GZ_FILE')) {
                toaster.error({
                    title: `${rejection.file.name} is not a *.fastq.gz file`
                });
            }
        }
    }

    /**
     * Callback triggered when the upload button is pressed
     */
    async function onUpload() {
        if (components.length === 0) {
            toaster.error({
                title: 'No file selected'
            });
            return;
        }

        // Pre-compute the size of the final tar file
        upload.state = 'uploading';
        const meta = {
            sampleId,
            sampleType,
            sampleMatrix,
            sampleCollectionLocation,
            sampleCollectionDate: fmtDate(sampleCollectionDate)
        };
        const size = tarSize(meta, components);
        upload.totalBytes = size;

        // Create an abort controller.  This lets users abort the upload
        // if they click a button.
        const abortController = new AbortController();
        upload.controller = abortController;

        // Create the tar stream
        const chunkSize = 10 * 1024 * 1024;
        const pack = tarPack(meta, components);
        const stream = chunkStream(pack, chunkSize);

        const onProgress: OnProgress = (bytesSent, totalBytes, ctx) => {
            upload.bytesSent = bytesSent;
            upload.totalBytes = totalBytes;
        };

        try {
            const res = await multiPartUpload(stream, size, {
                baseUrl: baseUrl,
                bucket: bucket,
                key: `unprocessed/${filename}`,
                signal: upload.controller.signal,
                onProgress: onProgress
            });
            if (res !== undefined) {
                upload.state = 'complete';
                toaster.success({
                    title: `Upload ${filename} completed.`
                });
            }
        } catch (err: any) {
            if (err?.name === 'CanceledError') {
                toaster.info({
                    title: `Upload ${filename} canceled.`
                });
            } else {
                const message = err instanceof Error ? err.message : String(err);
                toaster.error({
                    title: `An error occurred while uploading ${filename}: ${message}`
                });
                console.error(err);
            }
        } finally {
            upload.controller = undefined;
        }
    }

    function onCancel() {
        if (upload.bytesSent < upload.totalBytes) {
            upload.controller?.abort?.();
        }
        upload.state = 'pending';
    }
</script>

<div class="mb-4 space-y-2">
    <h2 class="text-primary-500 text-2xl font-semibold">File Upload</h2>
</div>

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
            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">sampleType</span>
                <input
                    class="input input-bordered"
                    type="text"
                    bind:value={sampleType}
                    aria-label="Sample Type"
                />
            </label>
            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">sampleMatrix</span>
                <input
                    class="input input-bordered"
                    type="text"
                    bind:value={sampleMatrix}
                    aria-label="Sample Matrix"
                />
            </label>
            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">sampleCollectionLocation</span>
                <input
                    class="input input-bordered"
                    type="text"
                    bind:value={sampleCollectionLocation}
                    aria-label="Sample Collection Location"
                />
            </label>
            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">sampleCollectionDate</span>
                <input
                    class="input input-bordered"
                    type="date"
                    value={fmtDate(sampleCollectionDate)}
                    oninput={(e) =>
                        (sampleCollectionDate = parseDate(
                            (e.currentTarget as HTMLInputElement).value
                        )!)}
                    aria-label="Sample Collection Date"
                />
            </label>
        </div>
    </section>

    <!-- File input -->
    <section class="space-y-3">
        <h2 class="text-lg font-semibold">FASTQ Files</h2>
        <FileUpload
            name="file"
            maxFiles={1000}
            validate={validateFile}
            onApiReady={(x) => (api = x)}
            {onFileReject}
            interfaceBg="bg-surface-150-950"
            filesListBase={fileListCss}
            subtext="Attach *.fastq.gz files"
        >
            {#snippet iconInterface()}
                <ImagePlus class="size-8" />
            {/snippet}
        </FileUpload>
        <FileUploadProgress {filename} {upload} />

        {#if upload.state === 'pending'}
            <button class={buttonCss} onclick={onUpload}>Upload</button>
        {:else if upload.state === 'uploading'}
            <button class={buttonCss} onclick={onCancel}>Cancel</button>
        {:else if upload.state === 'complete'}
            <button class={buttonDoneCss}>Upload complete</button>
        {/if}
    </section>
</div>

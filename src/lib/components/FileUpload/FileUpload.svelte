<script lang="ts">
    import { toaster } from '$lib/toaster';
    import { FileUpload } from '@skeletonlabs/skeleton-svelte';
    import type { FileAcceptDetails, FileRejectDetails, Api } from '@zag-js/file-upload';
    import { multiPartUpload } from '$lib/mpu';
    import type { OnProgress, MultipartUploadResult } from '$lib/mpu';

    import ImagePlus from '@lucide/svelte/icons/image-plus';
    import CircleX from '@lucide/svelte/icons/circle-x';

    let { baseUrl, bucket } = $props<{ baseUrl: string; bucket: string }>();

    type UploadItem = {
        id: string; // Stable key for list rendering
        file: File; // Handle to the file to upload
        key: string; // Destination S3 key
        bytesSent: number;
        totalBytes: number;
        result?: MultipartUploadResult;
        controller?: AbortController;
    };

    let api = $state<Api | undefined>(undefined);
    let items = $state<UploadItem[] | undefined>();
    let sampleId = $state('');
    let sampleType = $state('');
    let sampleMatrix = $state('');
    let sampleCollectionDate = $state<Date>(new Date());

    const fmt = (d: Date) => d.toISOString().slice(0, 10);           // Date -> "YYYY-MM-DD"
    const parse = (s: string) => (s ? new Date(s + 'T00:00:00') : undefined); // string -> Date

    function getId(file: File): string {
        return `${crypto.randomUUID()}`;
    }

    function getKey(file: File): string {
        return `unprocessed/${file.name}`;
    }

    function isUploaded(item: UploadItem): boolean {
        return item.bytesSent >= item.totalBytes;
    }

    function handleFileAccept(details: FileAcceptDetails) {
        items = details.files.map((file) => {
            return {
                id: getId(file),
                file: file,
                key: getKey(file),
                bytesSent: 0,
                totalBytes: file.size
            };
        });
    }

    function handleFileReject(details: FileRejectDetails) {
        for (const rejection of details.files) {
            toaster.error({
                title: `Rejected file ${rejection.file.name}`
            });
        }
    }

    // async function onUpload() {
    //     if (!items || items.length === 0) {
    //         toaster.error({
    //             title: 'No files selected'
    //         });
    //         return;
    //     }

    //     for (const item of items) {
    //         if (item.file)
    //     }
    // }

    async function onUploadFile() {
        if (!items || items.length === 0) {
            toaster.error({
                title: 'No file selected'
            });
            return;
        } else {
            for (const item of items) {
                if (isUploaded(item)) {
                    continue;
                }

                const abortController = new AbortController();
                item.controller = abortController;

                const onProgress: OnProgress = (bytesSent, totalBytes, ctx) => {
                    item.bytesSent = bytesSent;
                    item.totalBytes = totalBytes;
                };

                try {
                    const res = await multiPartUpload(item.file, {
                        baseUrl: baseUrl,
                        bucket: bucket,
             
                        key: item.key,
                        signal: item.controller.signal,
                        onProgress: onProgress
                    });

                    item.result = res;
                    if (res !== undefined) {
                        toaster.success({
                            title: `Upload ${item.file.name} completed.`
                        });
                    }
                } catch (err: any) {
                    if (err?.name === 'CanceledError') {
                        toaster.info({
                            title: `Upload ${item.file.name} canceled.`
                        });
                    } else {
                        const message = err instanceof Error ? err.message : String(err);
                        toaster.error({
                            title: `An error occurred while uploading ${item.file.name}: ${message}`
                        });
                        console.error(err);
                    }
                } finally {
                    item.controller = undefined;
                }
            }
        }
    }

    function handleCancelUpload(item: UploadItem) {
        if (item.bytesSent < item.totalBytes) {
            item.controller?.abort?.();
        }

        api?.deleteFile(item.file);
        if (items != undefined) {
            items = items.filter((x) => x.id !== item.id);
            if (item.bytesSent < item.totalBytes) {
                toaster.info({
                    title: `Upload ${item.file.name} canceled.`
                });
            }
        }
    }

    function humanReadable(n = 0) {
        const u = ['B', 'KB', 'MB', 'GB', 'TB'];
        let i = 0;
        while (n >= 1024 && i < u.length - 1) {
            n /= 1024;
            i++;
        }
        return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${u[i]}`;
    }

    const pct = (it: UploadItem) =>
        it.totalBytes ? Math.min(100, Math.floor((it.bytesSent / it.totalBytes) * 100)) : 0;
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
                <span class="text-xs opacity-70">sampleCollectionDate</span>
                <input
                    class="input input-bordered"
                    type="date"
                    value={fmt(sampleCollectionDate)}
                    oninput={(e) =>
                        (sampleCollectionDate = parse(
                            (e.currentTarget as HTMLInputElement).value
                        )!)}
                    aria-label="Sample Collection Date"
                />
            </label>
        </div>
    </section>

    <!-- File input -->
    <section class="space-y-3">
        <h2 class="text-lg font-semibold">FASTA Files</h2>
        <FileUpload
            name="file"
            onFileAccept={handleFileAccept}
            onFileReject={handleFileReject}
            onApiReady={(x) => (api = x)}
            interfaceBg="bg-surface-50-950"
            filesListBase="hidden"
            subtext="Attach *.fasta.gz files"
        >
            {#snippet iconInterface()}
                <ImagePlus class="size-8" />
            {/snippet}
        </FileUpload>

        {#if items}
            <ul class="mt-2 space-y-2">
                {#each items as it (it.id)}
                    <li class="preset-tonal rounded-base gap-4 px-4 py-2">
                        <!-- Row 1: name + bytes -->
                        <div class="flex w-full items-center justify-between gap-3">
                            <div class="min-w-0 truncate text-sm font-medium">{it.file.name}</div>
                            <div class="flex shrink-0 items-center gap-2">
                                <div class="text-surface-500 text-xs whitespace-nowrap">
                                    {humanReadable(it.bytesSent)} / {humanReadable(it.totalBytes)}
                                </div>
                                <button
                                    class="btn-icon p-0"
                                    onclick={() => handleCancelUpload(it)}
                                    aria-label="Cancel upload"
                                >
                                    <CircleX class="size-4" />
                                </button>
                            </div>
                        </div>

                        <!-- Row 2: progress bar -->
                        <div
                            class="bg-surface-200/60 dark:bg-surface-800/60 mt-2 h-2 w-full overflow-hidden rounded"
                            role="progressbar"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-valuenow={pct(it)}
                            aria-label={`Uploading ${it.file.name}`}
                        >
                            <div
                                class="bg-primary-500 dark:bg-primary-400 h-full transition-[width] duration-200"
                                style={`width:${pct(it)}%`}
                            ></div>
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>

    <button class="btn preset-filled-primary-500 mt-2" onclick={onUploadFile}> Upload </button>
</div>

<script lang="ts">
    import { toaster } from '$lib/toaster';
    import { FileUpload } from '@skeletonlabs/skeleton-svelte';
    import type { FileAcceptDetails, FileRejectDetails } from '@zag-js/file-upload';
    import { multiPartUpload } from '$lib/mpu';
    import type { OnProgress, MultipartUploadResult } from '$lib/mpu';

    import ImagePlus from '@lucide/svelte/icons/image-plus';
    import Paperclip from '@lucide/svelte/icons/paperclip';
    import CircleX from '@lucide/svelte/icons/circle-x';

    let { baseUrl, bucket } = $props<{ baseUrl: string, bucket: string }>();

    type UploadItem = {
        id: string;     // Stable key for list rendering
        file: File;     // Handle to the file to upload
        key: string;    // Destination S3 key
        bytesSent: number;
        totalBytes: number;
        result?: MultipartUploadResult;
        controller?: AbortController;
    }

    let items = $state<UploadItem[] | undefined>();

    function getId(file: File): string {
        return `${crypto.randomUUID()}`;
    }

    function getKey(file: File): string {
        return `unprocessed/${Date.now()}_${file.name}`;
    }

    function isUploaded(item: UploadItem): boolean {
        return (item.bytesSent >= item.totalBytes);
    }

    function handleFileAccept(details: FileAcceptDetails) {
        items = details.files.map((file) => {
            return {
                id: getId(file),
                file: file,
                key: getKey(file),
                bytesSent: 0,
                totalBytes: file.size,
            }
        });
    }

    function handleFileReject(details: FileRejectDetails) {
        for (const rejection of details.files) {
            toaster.error({
                title: `Rejected file ${rejection.file.name}`
            });
        }
    }

    async function uploadFile() {
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
                }

                try {
                    const res = await multiPartUpload(item.file, {
                        baseUrl: baseUrl,
                        bucket: bucket,
                        key: item.key,
                        signal: item.controller.signal,
                        onProgress: onProgress,
                    });

                    item.result = res;
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
</script>

<div class="card bg-surface-100-900 p-5 shadow">
    <div class="mb-4 space-y-2">
        <h2 class="h2 text-primary-500 dark:text-primary-200">File Upload</h2>
    </div>

    <!-- File input -->
    <FileUpload
        name="file"
        maxFiles={10}
        onFileAccept={handleFileAccept}
        onFileReject={handleFileReject}
        interfaceBg="bg-surface-50-950"
        subtext="Attach up to 10 files."
        classes="w-full mb-4"
    >
        {#snippet iconInterface()}
            <ImagePlus class="size-8" />
        {/snippet}
        {#snippet iconFile()}
            <Paperclip class="size-4" />
        {/snippet}
        {#snippet iconFileRemove()}
            <CircleX class="size-4" />
        {/snippet}
    </FileUpload>

    <button class="btn preset-filled-primary-500" onclick={uploadFile}> Upload </button>
</div>

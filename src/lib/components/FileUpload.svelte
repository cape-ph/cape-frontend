<script lang="ts">
    import { toaster } from '$lib/toaster';
    import { FileUpload } from '@skeletonlabs/skeleton-svelte';
    import type { FileAcceptDetails, FileRejectDetails } from '@zag-js/file-upload';

    import ImagePlus from '@lucide/svelte/icons/image-plus';
    import Paperclip from '@lucide/svelte/icons/paperclip';
    import CircleX from '@lucide/svelte/icons/circle-x';

    let files = $state<File[] | undefined>();

    function handleFileAccept(details: FileAcceptDetails) {
        files = details.files;
    }

    function handleFileReject(details: FileRejectDetails) {
        for (const rejection of details.files) {
            toaster.error({
                title: `Rejected file ${rejection.file.name}`
            });
        }
    }

    function uploadFile() {
        if (!files || files.length === 0) {
            toaster.error({
                title: 'No file selected'
            });
            return;
        } else {
            for (const file of files) {
                toaster.info({
                    title: `Uploading ${file.name}...`
                });
            }
        }
    }
</script>

<div class="card bg-surface-100-900 p-5 shadow">
    <div class="mb-4 space-y-2">
        <h2 class="h2 text-primary-500 dark:text-primary-200">File Upload</h2>
        <p class="opacity-80">Choose a location to upload your file.</p>
    </div>

    <!-- Bucket selector-->
    <div class="mb-8">
        <label>
            <span class="label-text">S3 Bucket</span>
            <select class="select bg-surface-50-950 mb-2" name="bucket">
                <option value="bucket-1">Bucket 1</option>
                <option value="bucket-2">Bucket 2</option>
                <option value="bucket-3">Bucket 3</option>
            </select>
        </label>
        <label>
            <span class="label-text">Bucket prefix</span>
            <select class="select bg-surface-50-950 mb-2" name="prefix">
                <option value="prefix-1">Prefix 1</option>
                <option value="prefix-2">Prefix 2</option>
                <option value="prefix-3">Prefix 3</option>
            </select>
        </label>
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

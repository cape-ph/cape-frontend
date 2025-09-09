<script lang="ts">
    import type { Upload } from './types';
    import CircleX from '@lucide/svelte/icons/circle-x';

    const {
        filename,
        upload,
    }: {
        filename: string;
        upload: Upload;
    } = $props();

    /**
     * Compute a number of bytes to a human readable string
     * @param n - the number of bytes
     */
    function humanReadable(n = 0) {
        const u = ['B', 'KB', 'MB', 'GB', 'TB'];
        let i = 0;
        while (n >= 1024 && i < u.length - 1) {
            n /= 1024;
            i++;
        }
        return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${u[i]}`;
    }

    const pct = (it: Upload) =>
        it.totalBytes ? Math.min(100, Math.floor((it.bytesSent / it.totalBytes) * 100)) : 0;
</script>

<div class="preset-tonal rounded-base gap-4 px-4 py-2">
    <div class="flex w-full items-center justify-between gap-3">
        <div class="min-w-0 truncate text-sm font-medium">{filename}</div>
        <div class="flex shrink-0 items-center gap-2">
            <div class="text-surface-500 text-xs whitespace-nowrap">
                {humanReadable(upload.bytesSent)} / {humanReadable(upload.totalBytes)}
            </div>
        </div>
    </div>


    <div
        class="bg-surface-200/60 dark:bg-surface-800/60 mt-2 h-2 w-full overflow-hidden rounded"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={pct(upload)}
        aria-label={`Uploading ${filename}`}
    >
        <div
            class="bg-primary-500 dark:bg-primary-400 h-full transition-[width] duration-200"
            style={`width:${pct(upload)}%`}
        ></div>
    </div>
</div>

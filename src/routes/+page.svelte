<script lang="ts">
    import FileUpload from '$lib/components/FileUpload/FileUpload.svelte';
    import Submit from '$lib/components/Submit/Submit.svelte';
    import LoggingIn from '$lib/components/LoggingIn/LoggingIn.svelte';
    import { auth } from '$lib/user.svelte';
</script>

{#if auth.user}
    <div class="flex h-screen items-center justify-center">
        <div class="w-lg">
            <!-- <FileUpload
                baseUrl="https://api.cape-dev.org/capi-dev"
                bucket="ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5"
            /> -->
            <Submit baseUrl="https://api.cape-dev.org/capi-dev"
                bucketURI='s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output'/>
        </div>
    </div>
{:else}
    <div class="flex h-screen items-center justify-center">
        <div class="w-lg">
            <LoggingIn />
        </div>
    </div>
{/if}

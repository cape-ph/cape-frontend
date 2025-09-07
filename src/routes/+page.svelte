<script lang="ts">
    import FileUpload from '$lib/components/FileUpload/FileUpload.svelte';
    import LoggingIn from '$lib/components/LoggingIn/LoggingIn.svelte';
    import { auth } from '$lib/user.svelte';

    $effect(() => {
        console.log('user changed ->', auth.user?.profile?.email);
    });
</script>

{#if auth.user}
    <div class="flex h-screen items-center justify-center">
        <div class="w-lg">
            <FileUpload
                baseUrl="https://api.cape-dev.org/capi-dev"
                bucket="ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5"
            />
        </div>
    </div>
{:else}
    <div class="flex h-screen items-center justify-center">
        <div class="w-lg">
            <LoggingIn />
        </div>
    </div>
{/if}

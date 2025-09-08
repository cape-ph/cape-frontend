<script lang="ts">
    import FileUpload from '$lib/components/FileUpload/FileUpload.svelte';
    import Submit from '$lib/components/Submit/Submit.svelte';
    import LoggingIn from '$lib/components/LoggingIn/LoggingIn.svelte';
    import { auth } from '$lib/user.svelte';

    import Navbar from '$lib/components/Navbar/Navbar.svelte';
    import logo from '$lib/images/wordmark-color.svg';

    let activeKey = $state('upload');

    const links = [
        { key: 'upload', label: 'Upload' },
        { key: 'submit', label: 'Submit' }
    ];

    function onSelect(key: string) {
        activeKey = key;
    }
</script>

{#if auth.user}
    <Navbar {logo} user={auth.user} {links} {activeKey} {onSelect}  />
    <main>
        <div class="flex h-screen justify-center mt-8">
            <div class="w-lg">
                {#if activeKey === 'upload'}
                    <FileUpload
                        baseUrl="https://api.cape-dev.org/capi-dev"
                        bucket="ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5"
                    />
                {:else if activeKey === 'submit'}
                    <Submit
                        baseUrl="https://api.cape-dev.org/capi-dev"
                        bucketURI="s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output"
                    />
                {/if}
            </div>
        </div>
    </main>
{:else}
    <div class="flex h-screen items-center justify-center">
        <div class="w-lg">
            <LoggingIn />
        </div>
    </div>
{/if}

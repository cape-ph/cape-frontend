<script lang="ts">
    import FileUpload from '$lib/components/FileUpload/FileUpload.svelte';
    import Submit from '$lib/components/Submit/Submit.svelte';
    import Report from '$lib/components/Report/Report.svelte';
    import LoggingIn from '$lib/components/LoggingIn/LoggingIn.svelte';
    import { auth } from '$lib/user.svelte';

    import Navbar from '$lib/components/Navbar/Navbar.svelte';
    import logo from '$lib/images/wordmark-color.svg';

    let activeKey = $state('upload');

    const links = [
        { key: 'upload', label: 'Upload' },
        { key: 'submit', label: 'Submit' },
        { key: 'report', label: 'Report' }
    ];

    function onSelect(key: string) {
        activeKey = key;
    }
</script>

{#if auth.user}
    <Navbar {logo} user={auth.user} {links} {activeKey} {onSelect} />
    <main>
        <div class="mt-8 flex h-screen justify-center">
            {#if activeKey === 'upload'}
                <div class="w-lg">
                    <FileUpload
                        baseUrl="https://api.cape-dev.org/capi-dev"
                        bucket="ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5"
                    />
                </div>
            {:else if activeKey === 'submit'}
                <div class="w-lg">
                    <Submit
                        baseUrl="https://api.cape-dev.org/capi-dev"
                        bucketURI="s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output"
                    />
                </div>
            {:else if activeKey === 'report'}
                <div>
                    <Report
                        baseUrl="https://api.cape-dev.org/capi-dev"
                        reportId="bactopia-single-sample-analysis"
                    />
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

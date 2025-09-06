<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { userManager } from '$lib/cognito';
    import FileUpload from '$lib/components/FileUpload.svelte';
    import LoggingIn from '$lib/components/LoggingIn.svelte';
    import type { User } from 'oidc-client-ts';

    let user = $state<User | undefined>(undefined);

    interface LoginResponse {
        code: string;
        state: string;
    }

    function isLoginResponse(response: any): response is LoginResponse {
        return response.code && response.state;
    }

    onMount(async () => {
        if (!user) {
            const params: { [key: string]: string } = {};
            page.url.searchParams.forEach((value, key) => (params[key] = value));

            if (!isLoginResponse(params)) {
                // Start the authorization flow
                await userManager.signinRedirect();
            } else {
                // Complete the authorization flow
                const maybeUser = await userManager.signinCallback();
                if (maybeUser) {
                    user = maybeUser;
                } else {
                    console.error('Failed to sign in');
                }
            }
        }
    });
</script>

{#if !user}
    <div class="flex h-screen items-center justify-center">
        <div class="w-lg">
            <LoggingIn />
        </div>
    </div>
{:else}
    <div class="flex h-screen items-center justify-center">
        <div class="w-lg">
            <FileUpload baseUrl="https://api.cape-dev.org/capi-dev" bucket="ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5"/>
        </div>
    </div>
{/if}

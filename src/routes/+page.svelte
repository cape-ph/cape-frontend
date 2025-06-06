<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { createUserManager } from "$lib/cognito";
    import FileUpload from "$lib/components/FileUpload.svelte";
    import LoggingIn from "$lib/components/LoggingIn.svelte";
    import type { User } from "oidc-client-ts";

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
            const redirect_uri = page.url.origin
            const userManager = createUserManager({redirect_uri});
            const params: {[key: string]: string} = {}
            page.url.searchParams.forEach((value, key) => params[key] = value);

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
    })
</script>

{#if (!user)}
    <div class="flex justify-center items-center h-screen">
        <div class="w-lg">
            <LoggingIn/>
        </div>
    </div>
{:else}

    <div class="flex justify-center items-center h-screen">
        <div class="w-lg">
            <FileUpload/>
        </div>
    </div>
{/if}
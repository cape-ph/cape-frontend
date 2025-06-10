<script lang="ts">
    import '../app.css';
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { replaceState } from '$app/navigation';
    import { userManager } from '$lib/cognito';
    import LoggingIn from '$lib/components/LoggingIn.svelte';
    import { Toaster } from '@skeletonlabs/skeleton-svelte';
    import { toaster } from '$lib/toaster';
    import type { User } from 'oidc-client-ts';

    let { children } = $props();
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
                try {
                    const maybeUser = await userManager.signinCallback();
                    if (maybeUser) {
                        replaceState(page.url.pathname, history.state);
                        user = maybeUser;
                    } else {
                        throw new Error('No user');
                    }
                } catch (error) {
                    console.error('Failed to sign in', error);
                }
            }
        }
    });
</script>

{#snippet notAuthenticated()}
    <div class="flex h-screen items-center justify-center">
        <div class="w-lg">
            <LoggingIn />
        </div>
    </div>
{/snippet}

{#if !user}
    {@render notAuthenticated()}
{:else}
    {@render children()}
{/if}

<Toaster {toaster}></Toaster>

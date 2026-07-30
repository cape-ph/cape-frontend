<!-- src/routes/+layout.svelte -->
<script lang="ts">
    import '../app.css';
    import { Toaster } from '@skeletonlabs/skeleton-svelte';
    import { toaster } from '$lib/toaster';
    import { onMount } from 'svelte';
    import { userManager } from '$lib/cognito';
    import { setUser } from '$lib/user.svelte';

    // slot
    let { children } = $props();

    onMount(async () => {
        if (!userManager) return; // SSR guard
        const path = window.location.pathname;
        if (path.startsWith('/auth/')) return;

        const existing = await userManager.getUser();

        if (existing && !existing.expired) {
            setUser(existing);
            return;
        }

        // Expired or missing session: try a silent renew (Cognito refresh token)
        // before falling back to a full interactive redirect.
        try {
            const renewed = await userManager.signinSilent();
            if (renewed && !renewed.expired) {
                setUser(renewed);
                return;
            }
        } catch (err) {
            console.warn('Silent sign-in failed; redirecting to login', err);
        }

        await userManager.signinRedirect();
    });
</script>

<div data-theme="cape">
    {@render children()}
</div>

<Toaster {toaster} />

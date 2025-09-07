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
        if (!userManager) return;   // SSR guard
        const existing = await userManager.getUser();

        if (existing && !existing.expired) {
            setUser(existing);
        } else {
            // No session? Start redirect flow
            await userManager.signinRedirect();
        }
    });
</script>

{@render children()}

<Toaster {toaster} />

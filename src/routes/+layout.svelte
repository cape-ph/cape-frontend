<!-- src/routes/+layout.svelte -->
<script lang="ts">
    import '../app.css';
    import { Toaster } from '@skeletonlabs/skeleton-svelte';
    import { toaster } from '$lib/toaster';
    import { onMount } from 'svelte';
    import { userManager } from '$lib/cognito';
    import { auth, setUser } from '$lib/user.svelte';
    import Navbar from '$lib/components/Navbar/Navbar.svelte';
    import Menu from '$lib/components/Menu/Menu.svelte';
    import logo from '$lib/images/wordmark-color.svg';

    // slot
    let { children } = $props();

    onMount(async () => {
        if (!userManager) return;   // SSR guard
        const path = window.location.pathname;
        if (path.startsWith('/auth/')) return;

        const existing = await userManager.getUser();

        if (existing && !existing.expired) {
            setUser(existing);
        } else {
            // No session? Start redirect flow
            await userManager.signinRedirect();
        }
    });
</script>


{#if auth.user}
    <Navbar {logo} user={auth.user}/>
    <Menu />
    <main>
        {@render children()}
    </main>
{:else}
    {@render children()}
{/if}
<Toaster {toaster} />

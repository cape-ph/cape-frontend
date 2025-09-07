<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { userManager } from '$lib/cognito';

    onMount(async () => {
        try {
            await userManager?.signinRedirectCallback();
            // Redirect home (replaceState removes ?code&state from URL)
            goto('/', { replaceState: true });
        } catch (err) {
            console.error('OIDC callback failed', err);
            goto('/', { replaceState: true });
        }
    });
</script>

<p>Completing sign-in…</p>

<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { userManager } from '$lib/cognito';
    import { setUser } from '$lib/user.svelte';

    onMount(async () => {
        try {
            await userManager?.signinRedirectCallback();
            const user = await userManager?.getUser();
            if (user && !user.expired) {
                setUser(user);
            }
        } catch (err) {
            console.error('OIDC callback failed', err);
        } finally {
            goto(resolve('/'), { replaceState: true });
        }
    });
</script>

<p>Completing sign-in…</p>

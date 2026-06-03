<script lang="ts">
    import type { User } from 'oidc-client-ts';
    import { resolve } from '$app/paths';
    import Menu from '../Menu/Menu.svelte';

    const {
        user,
        logo = '',
        links,
        activeKey,
        onSelect
    }: {
        user: User;
        logo?: string;
        links: { key: string; label: string }[];
        activeKey: string;
        onSelect: (key: string) => void;
    } = $props();

    const email = $derived(user.profile.email);
    let avatarUrl: string | null = $state(null);
</script>

<nav
    class="border-surface-200-800 from-surface-200-800 to-surface-100-900 w-full border-b bg-gradient-to-b"
>
    <div class="container mx-auto flex h-14 items-center justify-between px-4">
        <!-- Brand -->
        <a href={resolve('/')} class="flex items-center gap-2">
            <img src={logo} alt="Cape Logo" class="h-10 sm:h-12" />
        </a>

        <!-- Menu -->
        <Menu {links} {activeKey} {onSelect} />

        <!-- User section -->
        <div class="flex items-center gap-4 text-gray-950 dark:text-gray-100">
            <div class="flex items-center gap-2">
                {#if avatarUrl}
                    <img
                        src={avatarUrl}
                        alt="User avatar"
                        class="h-8 w-8 rounded-full object-cover"
                    />
                {:else}
                    <div
                        class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-900 dark:bg-surface-700 dark:text-gray-100"
                    >
                        {email?.[0]?.toUpperCase()}
                    </div>
                {/if}
                <span class="ml-2 text-sm font-medium">{email}</span>
            </div>
        </div>
    </div>
</nav>

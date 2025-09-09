<script lang="ts">
    import type { User } from 'oidc-client-ts';
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

    const email = user.profile.email;
    let avatarUrl: string | null = $state(null);
</script>

<nav
    class="border-surface-200-800 from-surface-200-800 to-surface-100-900 w-full border-b bg-gradient-to-b"
>
    <div class="container mx-auto flex h-14 items-center justify-between px-4">
        <!-- Brand -->
        <a href="/" class="flex items-center gap-2">
            <img src={logo} alt="Cape Logo" class="h-10 sm:h-12" />
        </a>

        <!-- Menu -->
        <Menu {links} {activeKey} {onSelect} />

        <!-- User section -->
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
                {#if avatarUrl}
                    <img
                        src={avatarUrl}
                        alt="User avatar"
                        class="h-8 w-8 rounded-full object-cover"
                    />
                {:else}
                    <div
                        class="bg-surface-300-700 text-surface-600-200 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                    >
                        {email?.[0]?.toUpperCase()}
                    </div>
                {/if}
                <span class="ml-2 text-sm">{email}</span>
            </div>
        </div>
    </div>
</nav>

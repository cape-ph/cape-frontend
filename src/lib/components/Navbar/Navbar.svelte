<script lang="ts">
    import { Navbar, NavBrand, Avatar } from 'flowbite-svelte';
    import type { User } from 'oidc-client-ts';

    let { 
        user,
        logo = ''
    }: {
        user: User
        logo: string
    } = $props();

    const email = user.profile.email;
    let avatarUrl: string | null = $state(null);
</script>

<Navbar>
    <NavBrand href="/">
        <img src={logo} class="me-3 h-12 sm:h-12" alt="Cape Logo" />
    </NavBrand>
    <div class="flex md:order-2 items-center">
        <div class="flex user gap-4">
            <div class="flex items-center">
                {#if avatarUrl}
                    <Avatar src={avatarUrl} />
                {:else}
                    <Avatar />
                {/if}
                <span>{email}</span>
                <!-- <ChevronDownOutline class="w-6 h-6 ms-2" /> -->
            </div>
        </div>
    </div>
</Navbar>

<style>
    span {
        margin-left: 1em;
    }

    .user {
        margin-left: 1em;
    }
</style>

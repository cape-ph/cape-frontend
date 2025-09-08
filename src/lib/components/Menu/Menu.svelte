<script lang="ts">
    import { Navbar, NavUl, NavLi } from 'flowbite-svelte';

    let activeClass = 'nav-item active';
    let nonActiveClass = 'nav-item';
</script>

<Navbar class="flex h-10 items-center">
    <NavUl {activeClass} {nonActiveClass}>
        <NavLi href="/" class=".">
            <div>Launchpad</div>
        </NavLi>
        <NavLi href="/runs"><div>Runs</div></NavLi>
        <NavLi href="/compute"><div>Compute Environments</div></NavLi>
        <NavLi href="/about"><div>About</div></NavLi>
    </NavUl>
</Navbar>
<hr />

<style lang="postcss">
    @reference '../../../app.css'

    :global(.nav-item) div {
        @apply dark:text-gray-200 border-secondary-100 bg-transparent flex h-10 items-center;
        font-weight: 400;
        padding-bottom: 2px;
        letter-spacing: 0.0375em;
    }

    :global(.nav-item):hover {
        text-decoration: none;
    }

    :global(.active) div {
        @apply font-bold border-b-2;
        letter-spacing: 0em;
        padding-bottom: 0px;
        text-decoration: none;
    }
</style>

<script lang="ts">
    // Props
    const {
        links,
        activeKey,
        onSelect,
        buttonClass = 'text-primary-700 dark:text-primary-200 rounded-base hover:preset-tonal'
    }: {
        links: { key: string; label: string }[];
        activeKey: string;
        onSelect: (key: string) => void;
        buttonClass?: string;
    } = $props();

    let open = $state(false);

    function select(key: string) {
        onSelect?.(key);
        open = false;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            open = false;
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<nav class="w-full">
    <div class="container mx-auto px-4">
        <div class="flex h-14 items-center justify-between">
            <!-- Desktop links -->
            <ul class="hidden gap-4 md:flex">
                {#each links as item (item.key)}
                    <li>
                        <button
                            type="button"
                            onclick={() => select(item.key)}
                            aria-current={activeKey === item.key ? 'page' : undefined}
                            class="{buttonClass} px-3 py-2 text-sm transition
                     {activeKey === item.key ? 'font-semibold' : 'opacity-90'}"
                        >
                            {item.label}
                        </button>
                    </li>
                {/each}
            </ul>

            <!-- Mobile toggle -->
            <button
                class="btn btn-sm preset-ghost md:hidden"
                aria-label="Toggle navigation menu"
                aria-expanded={open}
                aria-controls="mobile-nav"
                onclick={() => (open = !open)}
            >
                <!-- Simple hamburger -->
                <div class="flex flex-col gap-1.5">
                    <span class="block h-[2px] w-5 bg-current"></span>
                    <span class="block h-[2px] w-5 bg-current"></span>
                    <span class="block h-[2px] w-5 bg-current"></span>
                </div>
            </button>
        </div>

        <!-- Mobile menu -->
        {#if open}
            <!-- Click-away backdrop: closes the menu when tapping outside it -->
            <button
                type="button"
                class="fixed inset-0 z-40 bg-black/40 md:hidden"
                aria-label="Close navigation menu"
                onclick={() => (open = false)}
            ></button>
            <div
                id="mobile-nav"
                class="dark:bg-surface-900 dark:border-surface-700 fixed inset-x-0 top-14 z-50 border-b border-gray-200 bg-white shadow-lg md:hidden"
            >
                <ul class="container mx-auto flex flex-col gap-1 px-4 py-3">
                    {#each links as item (item.key)}
                        <li>
                            <button
                                type="button"
                                onclick={() => select(item.key)}
                                aria-current={activeKey === item.key ? 'page' : undefined}
                                class="rounded-base hover:preset-tonal w-full px-3 py-2 text-left text-sm text-gray-950 transition dark:text-gray-100
                     {activeKey === item.key ? 'border-b-2 font-semibold' : ''}"
                            >
                                {item.label}
                            </button>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    </div>
</nav>

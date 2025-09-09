<script lang="ts">
    // Props
    const {
        links,
        activeKey,
        onSelect,
        buttonClass = 'text-primary-700 rounded-base hover:preset-tonal'
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
</script>

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
        <div id="mobile-nav" class="{open ? 'block' : 'hidden'} pb-3 md:hidden">
            <ul class="flex flex-col gap-1">
                {#each links as item (item.key)}
                    <li>
                        <button
                            type="button"
                            onclick={() => select(item.key)}
                            aria-current={activeKey === item.key ? 'page' : undefined}
                            class="rounded-base hover:preset-tonal w-full px-3 py-2 text-left text-sm transition
                     {activeKey === item.key ? 'border-b-2 font-semibold' : 'opacity-90'}"
                        >
                            {item.label}
                        </button>
                    </li>
                {/each}
            </ul>
        </div>
    </div>
</nav>

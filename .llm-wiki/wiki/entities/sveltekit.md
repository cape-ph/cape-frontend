# SvelteKit

The application framework. CAPE Frontend uses SvelteKit 2 / Svelte 5 with the
runes reactivity model and `@sveltejs/adapter-node` for production output.

## Project-specific usage

- File-based routing in `src/routes/`; the app is effectively a single page
  (`+page.svelte`) with three tabs plus an `auth/callback` route.
- Svelte 5 runes only (`$state`, `$derived`, `$effect`, `$props`) - no Svelte 4
  store patterns. Reactive module-level state files use the `.svelte.ts` suffix
  (`user.svelte.ts`, `workflowRuns.svelte.ts`).
- `$lib` alias -> `src/lib`; `$env/dynamic/public` for runtime `PUBLIC_*` vars;
  `$app/navigation`, `$app/stores`, `$app/paths` (`resolve()` for links).
- `vitePreprocess` in `svelte.config.js`; Tailwind 4 via the Vite plugin.

## Related

- [[concepts/coding-style-and-conventions]]
- [[concepts/dev-environment-and-tooling]]
- [[syntheses/cape-frontend-architecture-overview]]

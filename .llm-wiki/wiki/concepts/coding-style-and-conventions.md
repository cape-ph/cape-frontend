# Coding Style and Conventions

Durable style rules distilled from the existing codebase, `.prettierrc`, and
`eslint.config.js`. Match these so generated code blends in. Always run
`npm run format` before finishing ([[concepts/dev-environment-and-tooling]]).

## Formatting (enforced)

- 4-space indentation, single quotes, no trailing commas, 100-char print width.
- Prettier is authoritative; do not hand-format against it.

## Svelte 5 patterns

- Runes only: `$state`, `$derived`, `$effect`, `$props`. No Svelte 4 stores.
- Reactive module state lives in `.svelte.ts` files exporting a `$state` object.
- Component script order: imports (external, then Svelte, then local, then
  components, then `type` imports, then assets) -> props -> local types -> state ->
  derived -> effects -> functions (async first) -> template.
- Annotate complex `$state` explicitly: `let user = $state<User | undefined>(undefined)`,
  `const items = $state<Item[]>([])`. Use `const` for `$state` arrays/objects and
  all `$derived`.
- Do not destructure reactive values (loses reactivity); access properties directly.

## Naming

- Booleans: `is` / `has` / `should` prefixes.
- Event handlers: `on` prefix (`onSubmit`, `onSelect`).
- Pure transforms: `get` / `build` / `format` prefixes.
- Components: PascalCase file matching directory (`Submit/Submit.svelte`).
- API-facing types: snake_case to match backend payloads; internal types:
  camelCase. This split is intentional ([[concepts/data-models]]).

## Error handling

Consistent pattern - set state to a safe empty/undefined, extract the message
safely, surface via the toaster:

```typescript
try {
    pipelines = await getPipelines(baseUrl);
} catch (err) {
    pipelines = undefined;
    const message = err instanceof Error ? err.message : String(err);
    toaster.error({ title: `An error occurred while reading the pipelines: ${message}` });
}
```

Message template: `An error occurred while {action}: {message}`.

## TypeScript

- Strict mode; prefer explicit types for `$state`, public function returns, and
  shared interfaces. Use type guards for schema introspection over blind casts.

## Accessibility

- Every input needs an `aria-label`. Mark required fields; explain disabled states
  with `aria-describedby` + a `role="tooltip"` element.

## Testing

- Co-locate tests (`*.svelte.test.ts` for components, `.test.ts` for lib modules).
- Use `@testing-library/svelte` + `jest-dom/vitest`; mock external deps
  (`axios`, OIDC) with `vi.mock`.

## Change discipline (repo norm)

- Minimal, focused edits; reuse schema-form helpers rather than reabstracting.
- Delete stale code when it becomes unused (verify with grep first).
- Keep this wiki in sync with code changes in the same session - documentation
  drift is treated as incomplete work here.

## Related

- [[concepts/dev-environment-and-tooling]]
- [[entities/sveltekit]]
- [[concepts/schema-driven-forms]]
- [[syntheses/cape-frontend-architecture-overview]]

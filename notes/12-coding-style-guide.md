# CAPE Frontend - Coding Style Guide

**Based on**: Analysis of existing codebase patterns and configuration

---

## Code Style Configuration

### Prettier (Auto-formatting)

```json
{
    "useTabs": false,
    "tabWidth": 4,
    "singleQuote": true,
    "trailingComma": "none",
    "printWidth": 100
}
```

**Key Points**:

- 4 spaces for indentation (not tabs)
- Single quotes for strings
- No trailing commas
- 100 character line width

### ESLint

- TypeScript strict mode enabled
- Svelte plugin active
- No unused variables (`no-undef` disabled for Svelte)

---

## Svelte 5 Patterns

### Component Structure

**Standard Component Layout**:

```svelte
<script lang="ts">
    // 1. Imports (external libraries first, then local)
    import { toaster } from '$lib/toaster';
    import { someFunction } from '$lib/utils';
    import ChildComponent from './ChildComponent.svelte';
    import type { SomeType } from '$lib/types';

    // 2. Props declaration
    let { prop1, prop2 = 'default' } = $props<{ prop1: string; prop2?: string }>();

    // 3. Local type definitions (if component-specific)
    type LocalType = {
        field: string;
    };

    // 4. State declarations
    let simpleState = $state('value');
    let complexState = $state<ComplexType | undefined>(undefined);
    const arrayState = $state<Item[]>([]);

    // 5. Derived values
    const computed = $derived(simpleState.toUpperCase());

    // 6. Effects
    $effect(() => {
        // Side effects here
    });

    // 7. Functions (async first, then sync)
    async function asyncFunction() {
        // ...
    }

    function syncFunction() {
        // ...
    }
</script>

<!-- 8. Template -->
<div>
    <!-- Content -->
</div>
```

### State Management

**Use const for $state arrays/objects** (they're reactive references):

```typescript
// Good
const items = $state<Item[]>([]);

// Avoid (but still works)
let items = $state<Item[]>([]);
```

**State initialization patterns**:

```typescript
// Simple values
let count = $state(0);
let name = $state('');

// Complex types - explicit undefined
let user = $state<User | undefined>(undefined);

// Arrays - empty array
const items = $state<Item[]>([]);

// Objects - explicit shape
const config = $state<Record<string, unknown>>({});
```

### Derived Values

**Always use const for $derived**:

```typescript
const fullName = $derived(`${firstName} ${lastName}`);
const isEmpty = $derived(items.length === 0);
```

**Complex derivations**:

```typescript
const filtered = $derived(
    items.filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name))
);
```

### Effects

**Keep effects focused**:

```typescript
// Good - single responsibility
$effect(() => {
    if (!initialized) {
        outputPath = defaultPath;
        initialized = true;
    }
});

// Avoid - multiple unrelated side effects
$effect(() => {
    doThing1();
    doThing2();
    doThing3();
});
```

---

## Component Organization

### Directory Structure

**One component per directory**:

```
src/lib/components/
  ComponentName/
    ComponentName.svelte          # Main component
    ComponentName.svelte.test.ts  # Component tests
    types.d.ts                    # Component-specific types (if needed)
    __fixtures__/                 # Test fixtures (if needed)
      data.json
```

**Co-location principle**: Keep related files together in component directory.

### Component Naming

- **File names**: PascalCase matching component name (`Submit.svelte`, `FileUpload.svelte`)
- **Component variables**: PascalCase when importing (`import Submit from './Submit.svelte'`)
- **DOM elements**: lowercase (`<div>`, `<section>`)

---

## TypeScript Patterns

### Type Definitions

**Inline types for component-specific**:

```typescript
type SchemaProperty = {
    type?: 'string' | 'integer' | 'number' | 'boolean';
    title?: string;
    description?: string;
};
```

**Export types when shared**:

```typescript
// In types file or at top of component
export interface PipelineProfile {
    pipelineId: string;
    parametersSchema: unknown;
}
```

### Type Annotations

**Always annotate $state with complex types**:

```typescript
// Good
let user = $state<User | undefined>(undefined);
const items = $state<Item[]>([]);

// Avoid - relies on inference
let user = $state(undefined); // Type is 'undefined', not 'User | undefined'
```

**Function return types** - optional but recommended for public functions:

```typescript
function getDefaultOptions(schema: unknown): Record<string, unknown> {
    // ...
}
```

### Type Guards

**Use type guards for schema introspection**:

```typescript
if (!schema || typeof schema !== 'object') {
    return [];
}

const s = schema as {
    properties?: Record<string, SchemaProperty>;
    required?: string[];
};
```

---

## Naming Conventions

### Variables

**State variables**: Descriptive nouns

```typescript
let pipelineName = $state('');
let selectedProfileKey = $state('');
const options = $state<Record<string, unknown>>({});
```

**Derived values**: Descriptive nouns or adjectives

```typescript
const isValid = $derived(errors.length === 0);
const parameterFields = $derived(getParameterFields(schema));
```

**Boolean flags**: `is`, `has`, `should` prefixes

```typescript
let isLoading = $state(false);
let hasErrors = $state(false);
const shouldDisplay = $derived(profile !== undefined);
```

### Functions

**Event handlers**: `on` prefix

```typescript
function onSubmit() {}
function onSelect(key: string) {}
async function onUpload() {}
```

**Utility functions**: Verb phrases

```typescript
function serializeWorkflow(): unknown[] {}
function setOption(key: string, value: unknown) {}
function validateField(field: ParameterField): boolean {}
```

**Pure transformations**: `get`, `build`, `format` prefixes

```typescript
function getDefaultOptions(schema: unknown) {}
function getParameterFields(schema: unknown) {}
function formatDate(date: Date): string {}
```

---

## Error Handling

### Pattern Used in Codebase

```typescript
async function updatePipelines() {
    try {
        pipelines = await getPipelines(baseUrl);
    } catch (err) {
        pipelines = undefined;
        const message = err instanceof Error ? err.message : String(err);
        toaster.error({
            title: `An error occurred while reading the pipelines: ${message}`
        });
    }
}
```

**Key aspects**:

1. Set state to undefined on error
2. Extract error message safely (`err instanceof Error`)
3. Show user-friendly error via toaster
4. Context in error message ("while reading the pipelines")

### Error Message Format

**Template**: `An error occurred while {action}: {error message}`

**Examples**:

- `An error occurred while reading the pipelines: Network error`
- `An error occurred while submitting the pipeline: Invalid parameters`
- `An error occurred while uploading files: Connection timeout`

---

## Styling Patterns

### Tailwind Classes

**Utility-first approach**:

```svelte
<div class="mb-4 space-y-2">
    <h2 class="text-primary-500 text-2xl font-semibold">Title</h2>
</div>
```

**Component classes from Skeleton UI**:

```svelte
<select class="select select-bordered">...</select>
<input class="input input-bordered" type="text" />
<button class="btn preset-filled-primary-500">Submit</button>
```

**Responsive classes**:

```svelte
<div class="hidden md:flex">Desktop only</div><div class="flex md:hidden">Mobile only</div>
```

### Spacing Patterns

**Consistent spacing scale**:

- `gap-1`: Small gaps (4px)
- `gap-3`: Standard gaps (12px)
- `space-y-2`: Vertical stacking (8px)
- `space-y-3`: Standard vertical (12px)
- `space-y-6`: Section spacing (24px)
- `mb-4`: Section margin (16px)

---

## Accessibility

### Required Practices

**ARIA labels on all inputs**:

```svelte
<input class="input input-bordered" type="text" aria-label="Sample name" bind:value={sampleName} />
```

**Required field indicators**:

```svelte
<span class="text-xs opacity-70">
    {field.label}{field.required ? ' *' : ''}
</span>
```

**Disabled state explanations**:

```svelte
<button
    disabled={submitDisabled}
    aria-describedby={submitDisabled ? 'submit-disabled-tooltip' : undefined}
>
    Submit
</button>
{#if submitDisabled}
    <div id="submit-disabled-tooltip" role="tooltip">
        {submitDisabledReason}
    </div>
{/if}
```

---

## Anti-Patterns to Avoid

### Don't Repeat Yourself

**Avoid**: Duplicating schema introspection logic

```typescript
// Bad - duplicated logic
const fields1 = Object.entries(schema.properties).map(...)
const fields2 = Object.entries(schema.properties).map(...)

// Good - single function
function getParameterFields(schema: unknown) { ... }
const fields = getParameterFields(schema);
```

### Don't Over-Abstract

**Avoid**: Creating abstractions before patterns emerge

```typescript
// Bad - premature abstraction
class FormBuilder {
    // Complex builder pattern for one use case
}

// Good - direct implementation
function getParameterFields(schema: unknown): ParameterField[] {
    // Simple function that does what's needed
}
```

### Don't Break Reactivity

**Avoid**: Destructuring reactive values

```typescript
// Bad - loses reactivity
const { name, version } = profile;

// Good - access properties directly
const name = profile.pipelineName;
const version = profile.version;
```

---

## Testing Patterns

### Test File Structure

```typescript
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Component from './Component.svelte';

describe('Component', () => {
    it('renders with default props', () => {
        render(Component, { props: { ... } });
        expect(screen.getByText('Expected')).toBeInTheDocument();
    });

    it('handles user interaction', async () => {
        const { component } = render(Component);
        // Test interaction
    });
});
```

### Mocking

**Mock external dependencies**:

```typescript
vi.mock('$lib/api', () => ({
    getPipelines: vi.fn(() => Promise.resolve([]))
}));
```

---

## Import Organization

### Order

1. External libraries
2. Svelte/SvelteKit imports
3. Local utilities/functions
4. Components
5. Types (with `type` prefix)
6. Assets

**Example**:

```typescript
import axios from 'axios';
import { onMount } from 'svelte';
import { toaster } from '$lib/toaster';
import { getPipelines } from '$lib/pipeline';
import ChildComponent from './ChildComponent.svelte';
import type { Pipeline } from '$lib/pipeline';
import logo from '$lib/images/logo.svg';
```

---

## Comments

### When to Comment

**Do comment**:

- Complex schema introspection logic
- Non-obvious type casts
- Workarounds for library issues
- Business logic that's not self-evident

**Don't comment**:

- Obvious operations
- What the code does (code should be self-documenting)
- Function/variable names
- Temporary TODOs (use issue tracker)

### Comment Style

```typescript
// Single-line comments for brief notes
const result = parse(data);

/**
 * Multi-line JSDoc for exported functions
 */
export function getDefaultOptions(schema: unknown): Record<string, unknown> {
    // Implementation
}
```

---

## Checklist for New Components

Before creating a new component:

- [ ] Component directory created in `src/lib/components/`
- [ ] Component file matches directory name (`ComponentName.svelte`)
- [ ] Props declared with $props<T>()
- [ ] State uses $state() with proper types
- [ ] Derived values use $derived()
- [ ] All inputs have aria-label
- [ ] Error handling with toaster
- [ ] Test file created (`ComponentName.svelte.test.ts`)
- [ ] Types co-located (in component file or adjacent `types.d.ts`)
- [ ] Prettier formatting applied (`npm run format`)
- [ ] ESLint passing (`npm run lint`)
- [ ] TypeScript checks passing (`npm run check`)

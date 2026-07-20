# Schema-Driven Forms

The central architectural pattern of CAPE Frontend. Pipeline and workflow
submission forms are generated at runtime from JSON Schema supplied by the
[[entities/cape-api]], so new pipelines can be added on the backend without any
frontend code change. The schema is the contract between frontend and backend.

Implemented in `src/lib/schema.ts` and consumed by `Submit.svelte`.

## Flow

1. Fetch a `PipelineProfile` (single pipeline) or `PipelineProfile[]` (workflow
   stages) from the API; each carries a `parametersSchema` (JSON Schema).
2. `getParameterFields(schema)` dereferences `$ref`s (via
   `@apidevtools/json-schema-ref-parser`), flattens `allOf`, collects `properties`
   and `required`, and returns a `ParameterField[]`.
3. The component renders an input per field based on `schema.type`
   (`string` / `integer` / `number` / `boolean`), honoring `title`, `description`,
   `default`, `const` (readonly), `enum`, `minimum`, `maximum`.
4. `getDefaultOptions(fields)` seeds option values from `default` / `const` /
   type-appropriate empties.
5. On submit, `coerceOptionsForValidation(fields, options)` casts strings to the
   declared types and drops empties, then AJV `compile()` + `validate()` check the
   payload before it is sent.

## Key functions (`src/lib/schema.ts`)

- `getParameterFields(schema): Promise<ParameterField[]>` - async because ref
  dereferencing is dynamically imported.
- `getDefaultOptions(fields)`, `coerceOptionsForValidation(fields, options)`
- `compile(schema)`, `validate(isValid, obj)` - thin AJV wrappers, re-exported
  from `pipeline.ts`.
- `UnsupportedSchemaError` - thrown for `anyOf` / `oneOf` combinators, which need
  an explicit UI choice before fields can render (only `allOf` is flattened).

## Notable details

- A browser `Buffer` shim is installed (`ensureBrowserBufferShim`) because the
  ref-parser expects Node `Buffer`.
- AJV is configured with `allErrors: true`, `strict: false`,
  `validateSchema: false`. `validateSchema: false` is deliberate: pipeline schemas
  are Draft 2020-12, whose meta-schema AJV does not bundle, so meta-schema
  validation is skipped to avoid a missing-schema error.
- Number fields render as `<input type="text" inputmode="numeric">` rather than
  `type="number"`, so the user can type invalid input and see a validation message
  instead of the browser silently blocking keystrokes.
- Validation errors are de-duplicated per field (keyed by field name, highest
  priority kept): `required` > `type` > `min`/`max` > `enum` > other. This avoids a
  "2 errors" toast when one bad value trips multiple rules.
- Mutating a `$state` object of errors in place does not trigger Svelte 5
  reactivity; assign a new reference (`validationErrors = { ...validationErrors }`).

## Related

- [[analyses/workflow-submission-feature]]
- [[concepts/data-models]]
- [[syntheses/cape-frontend-architecture-overview]]

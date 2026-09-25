# External Dependencies and Boundaries

## External systems

- [[entities/cape-api]] - the CAPE backend (default base
  `https://api.cape-dev.org/capi-dev`). All data comes from here: pipelines,
  workflows, profiles, workflow-run status, object storage brokering, reports.
- [[entities/aws-cognito]] - identity provider over OIDC.
- AWS S3 - reached indirectly. The frontend never holds S3 credentials; the CAPE
  `objstorage` endpoints broker presigned multipart-upload URLs
  ([[concepts/multipart-upload]]). Input bucket
  `ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5`, results bucket
  `ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821` (both currently hardcoded).
- Apache Airflow - workflow orchestration behind the CAPE `/workflows/*` API;
  workflow-run and task-instance shapes mirror Airflow's REST API. Airflow
  orchestrates; pipeline steps execute in AWS Batch (`BatchOperator`). The dev API
  presents a self-signed certificate.

## Key runtime dependencies

- `oidc-client-ts` - Cognito auth flow.
- `axios` - HTTP client for all API calls.
- `ajv` + `@apidevtools/json-schema-ref-parser` - JSON Schema validation and `$ref`
  dereferencing for [[concepts/schema-driven-forms]].
- `tar-stream` + `readable-stream` + `buffer` - streaming TAR bundle creation
  ([[concepts/tar-streaming]]); Node stream/Buffer polyfilled for the browser.
- `fast-xml-parser` - parses AWS S3 multipart XML responses.
- `@skeletonlabs/skeleton-svelte` + Tailwind - UI components and styling.

Declared in `package.json` but currently unused in `src/` (removal candidates):
`streamsaver` (streaming downloads, never imported) and `cookie` (run persistence
uses raw `document.cookie`, not this package).

## Trust boundaries

- The browser trusts the CAPE API for schemas, presigned URLs, and report HTML.
  Report HTML is rendered in a `sandbox="allow-same-origin allow-scripts"` iframe
  so trusted CAPE-generated reports can run interactive controls. This is not a
  defense against malicious same-origin report HTML, so report bodies must remain
  trusted backend output ([[analyses/report-viewing-feature]]).
- Report-count requests use the authenticated `capi` client, but the Report
  component still fetches report bodies through bare Axios. Complete migration of
  Report and multipart-upload calls to the authenticated client remains tracked by
  GitHub issue #35.
- No secrets in the frontend; only `PUBLIC_*` env vars, injected at runtime via
  `$env/dynamic/public` ([[concepts/authentication-cognito]]).

## Known gap: unused server/db config

`drizzle.config.ts` points at `./src/lib/server/db/schema.ts` and requires
`DATABASE_URL`, but `src/lib/server/` does not exist. There is no server-side
database layer in the current tree. Treat drizzle as scaffolding/aspirational until
a `src/lib/server/db/` is added. Worth confirming with maintainers whether this is
planned or dead config.

## Related

- [[syntheses/cape-frontend-architecture-overview]]
- [[concepts/dev-environment-and-tooling]]
- [[analyses/known-gaps-and-unused-api]]

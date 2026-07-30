# CAPE Frontend Architecture Overview

CAPE Frontend is a [[entities/sveltekit]] 5 single-page-style web application that
provides a browser interface to the [[entities/cape-api]] for managing biological
sequencing data workflows. It handles three core jobs: uploading sequencing files,
submitting bioinformatics workflows, and viewing generated reports.

## Tech stack

- SvelteKit 5 with Svelte 5 runes reactivity, TypeScript strict mode
- Vite 6 build tooling, adapter-node for production output
- Tailwind CSS 4 plus Skeleton UI (`@skeletonlabs/skeleton-svelte`) components
- AWS Cognito authentication over OIDC via `oidc-client-ts` ([[concepts/authentication-cognito]])
- Vitest with Testing Library for unit/component tests

## Source layout

```
src/
  lib/
    components/        Svelte components, one directory per component
    cognito.ts         OIDC UserManager configuration
    user.svelte.ts     Global reactive auth state
    pipeline.ts        CAPE API client (pipelines, workflows, profiles)
    workflowStatus.ts  CAPE/Airflow workflow-run API client + types
    schema.ts          JSON Schema -> form field derivation + AJV validation
    mpu.ts             S3 multipart upload manager
    stream.ts          TAR archive streaming for sample bundles
    workflowRuns.svelte.ts     Global reactive workflow-run state (SvelteMap)
    workflowRunsStorage.ts     Cookie persistence of submitted runs
    toaster.ts / env.ts        Toast notifications, env var access
  routes/
    +layout.svelte     Root layout
    +page.svelte       Main app: Upload / Workflows / Report tabs
    auth/callback/     OIDC redirect handler
  themes/cape.css      Skeleton theme
```

There is no `src/lib/server/` directory despite `drizzle.config.ts` referencing
`src/lib/server/db/schema.ts`; see [[concepts/external-dependencies-and-boundaries]]
for that gap. The app is currently client-only in practice.

## Major subsystems

- [[concepts/schema-driven-forms]] - the central pattern: submission forms are
  generated from backend-supplied JSON Schema, so new pipelines need no frontend
  changes.
- [[analyses/file-upload-feature]] - streaming TAR bundle + [[concepts/multipart-upload]]
  to S3.
- [[analyses/workflow-submission-feature]] - multi-stage workflow trigger built on
  schema-driven forms.
- [[analyses/workflow-status-monitoring-feature]] - Airflow-backed run status,
  cookie-persisted run list, auto-refresh.
- [[analyses/report-viewing-feature]] - sandboxed iframe report rendering.
- [[concepts/authentication-cognito]] - Cognito/OIDC gate over all functionality.

## State management

No external store library. State lives in Svelte 5 runes:

- Global auth: `auth` object in `user.svelte.ts`.
- Global workflow runs: `workflowRuns` object in `workflowRuns.svelte.ts`, using a
  `SvelteMap` for live status so UI updates track mutations.
- Component-local: `$state` / `$derived` / `$effect`.
- Persistent: submitted runs stored in a `workflow_runs` cookie (90-day retention).
- URL state: `?tab=&view=&dagId=&dagRunId=` query params sync with view state for
  browser back/forward.

## Related

- [[concepts/data-models]]
- [[concepts/dev-environment-and-tooling]]
- [[concepts/coding-style-and-conventions]]

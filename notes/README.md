# CAPE Frontend Documentation

Comprehensive technical documentation for the CAPE Frontend application.

## Documentation Structure

### [01 - Project Overview](./01-overview.md)

High-level introduction to the project, its purpose, technology stack, and goals.

**Topics**:

- Project purpose and target users
- Technology stack overview
- Development environment setup
- Required environment variables

### [02 - Architecture](./02-architecture.md)

System architecture, design patterns, and data flow.

**Topics**:

- Directory structure and organization
- Key architectural patterns (schema-driven forms, streaming, reactive state)
- Component co-location strategy
- Authentication, upload, pipeline submission, and report viewing flows
- State management approach

### [03 - API Endpoints](./03-api-endpoints.md)

Complete API reference for all backend endpoints used by the application.

**Topics**:

- Pipeline management endpoints (`/dap/pipelines`, `/dap/pipelineprofile`, `/dap/submit`)
- Report generation endpoints (`/report/create`)
- Object storage endpoints (`/objstorage/*` for multipart upload)
- Request/response schemas with TypeScript types
- Error handling patterns

### [04 - Data Types](./04-data-types.md)

TypeScript type definitions used throughout the application.

**Topics**:

- Authentication types (User, OIDC)
- Pipeline types (Pipeline, PipelineProfile, SchemaProperty)
- Sample and upload types (SampleMeta, Upload, MultipartUpload\*)
- Component-specific types
- Constants and utility types

### [05 - Functionality](./05-functionality.md)

Detailed explanation of each feature and how it works.

**Topics**:

- Authentication flow (AWS Cognito OIDC)
- File upload (validation, TAR creation, chunked multipart upload)
- Pipeline submission (schema-driven forms, validation, serialization)
- Report viewing (HTML rendering in sandboxed iframe)
- UI components and toast notifications
- Validation and error handling
- Accessibility features
- Performance considerations

### [06 - External Interactions](./06-external-interactions.md)

How the application interacts with external systems and APIs.

**Topics**:

- AWS Cognito authentication provider
- CAPE API integration
- AWS S3 (via presigned URLs)
- Browser APIs (LocalStorage, File API, Streams API, AbortController)
- External libraries (oidc-client-ts, axios, tar-stream, ajv, etc.)
- Network characteristics and CORS
- Environment dependencies and browser requirements

### [07 - User Workflows](./07-user-workflows.md)

Step-by-step user interaction flows with success and error states.

**Topics**:

- First-time user authentication
- Uploading sequencing files
- Submitting pipeline jobs
- Viewing analysis reports
- Returning user flow
- Logout process
- Common errors and recovery steps
- User experience considerations

## Quick Reference

### Common Development Tasks

See [CLAUDE.md](../CLAUDE.md) for development commands and testing setup.

### API Base URL

- Development: `https://api.cape-dev.org/capi-dev`

### Key Technologies

- SvelteKit 5 (Svelte runes reactivity)
- TypeScript (strict mode)
- Vite 6 (build tool)
- Tailwind CSS 4 + Skeleton UI
- Vitest (testing)
- AWS Cognito (authentication)

### Core Concepts

**Schema-Driven UI**: Pipeline submission forms are dynamically generated from JSON schemas provided by the backend API. This enables adding new pipelines without frontend code changes.

**Streaming Architecture**: Large file uploads use streaming to avoid memory constraints. TAR archives are created as streams, chunked into 10MB pieces, and uploaded via S3 multipart upload with retry logic.

**Svelte 5 Runes**: The project uses Svelte 5's new reactivity model (`$state()`, `$derived()`, `$effect()`, `$props()`) instead of legacy Svelte patterns.

## Navigation Tips

- **New to the project?** Start with [01 - Overview](./01-overview.md)
- **Understanding the codebase?** Read [02 - Architecture](./02-architecture.md)
- **Integrating with the API?** Reference [03 - API Endpoints](./03-api-endpoints.md)
- **Working with types?** Check [04 - Data Types](./04-data-types.md)
- **Implementing features?** See [05 - Functionality](./05-functionality.md)
- **Debugging integrations?** Review [06 - External Interactions](./06-external-interactions.md)
- **Testing user flows?** Follow [07 - User Workflows](./07-user-workflows.md)

## Document Maintenance

These documents are accurate as of the current codebase state. When making significant architectural changes or adding new features, update the relevant documentation files to keep them in sync with the implementation.

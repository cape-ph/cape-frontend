# CAPE Frontend - Project Overview

## Purpose

CAPE Frontend is a web application for managing biological sequencing data workflows. It provides an interface to the CAPE (Computational Analysis Platform for Epidemiology) API for:

1. **File Upload**: Uploading FASTA/FASTQ sequencing files with associated sample metadata
2. **Pipeline Submission**: Submitting bioinformatics analysis pipelines with configurable parameters
3. **Report Viewing**: Viewing generated analysis reports for processed samples

## Target Users

- Laboratory technicians uploading sequencing data
- Bioinformaticians submitting analysis pipelines
- Researchers viewing analysis results

## Technology Stack

- **Framework**: SvelteKit 5 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4 + Skeleton UI components
- **Authentication**: AWS Cognito via OIDC (OpenID Connect)
- **Testing**: Vitest with Testing Library
- **Key Libraries**:
    - `oidc-client-ts`: Authentication flow
    - `axios`: HTTP client
    - `ajv`: JSON Schema validation
    - `tar-stream`: TAR archive creation
    - `fast-xml-parser`: AWS S3 multipart upload XML parsing

## Project Goals

1. **Schema-Driven UI**: Dynamically generate pipeline submission forms from JSON schemas provided by the backend API, enabling support for new pipelines without frontend code changes
2. **Large File Handling**: Support uploading large genomic sequencing files (multi-GB) via chunked multipart uploads with progress tracking
3. **Type Safety**: Full TypeScript coverage with strict type checking
4. **Authentication**: Secure access control via AWS Cognito integration
5. **Responsive UI**: Clean, accessible interface with real-time feedback via toast notifications

## Development Environment

- **Primary Environment**: Development API at `https://api.cape-dev.org/capi-dev`
- **Local Dev Server**: Runs on `http://localhost:3000` (configurable via `--host --port 3000`)
- **Required Environment Variables**:
    - `PUBLIC_COGNITO_AUTHORITY`: AWS Cognito authority URL
    - `PUBLIC_COGNITO_CLIENT_ID`: OAuth client ID
    - `PUBLIC_COGNITO_REDIRECT_URI`: OAuth callback URL

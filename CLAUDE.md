# CLAUDE.md / AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Windsurf, Cline, etc.) when working with code in this repository.

---

## AI Assistant Context Management

### SESSION RESUME PROTOCOL (MANDATORY - Execute First)

When the user says "let's pick up where we left off" or any similar resume phrase:

**YOU MUST COMPLETE THESE STEPS IN ORDER BEFORE DOING ANYTHING ELSE:**

- [ ] **Step 1**: Read `NOTES.md` to understand recent work and context
- [ ] **Step 2**: Read ALL `notes/*.md` files in parallel (use multiple parallel read calls)
- [ ] **Step 3**: ONLY AFTER both steps complete, respond to user or ask clarifying questions

**DO NOT:**

- Skip step 2
- Ask questions before loading both NOTES.md and notes/
- Start any work before loading full context
- Treat the notes/ directory as optional

**WHY THIS MATTERS:**

- `NOTES.md` = your working memory (what happened recently)
- `notes/` = project knowledge base (architecture, APIs, types, patterns)
- Both are REQUIRED for effective session resume, not optional

---

### NOTES.md - Your Persistent Memory

**Location**: `./NOTES.md`

**Purpose**: This file is YOUR personal context file for maintaining continuity across sessions. It tracks:

- Work completed (with dates)
- Current project state and active branches
- Pending TODOs and future enhancements
- Technical discoveries and lessons learned
- Known issues and gaps
- Quick-start commands for next session
- Questions to ask the user

**Maintenance Requirements**:

1. **Update at end of every significant work session** - Before user ends conversation, update NOTES.md with:
    - What was accomplished
    - What was learned
    - What's next
    - Any new issues discovered
    - Any questions for next session

2. **You own this file** - No permission needed to edit. It's your working memory.

3. **Keep it current** - As you work, update relevant sections:
    - Move completed TODOs from "Pending Work" to "Recent Work Completed"
    - Add new discoveries to "Technical Discoveries"
    - Update "Current Project State" with branch/status changes
    - Add new issues to "Known Issues & Gaps"
    - Update "Context for Next Session" with what to read first

4. **PUBLIC file** - Never include secrets, API keys, passwords, or private information. This file may be committed to the repository.

5. **Session continuity** - When a new session starts with "let's pick up where we left off":
    - Read NOTES.md FIRST to understand recent work and context
    - **IMMEDIATELY read ALL files in the `notes/` directory in parallel** - DO NOT skip this step
    - **DO NOT ask questions or start work until BOTH NOTES.md and notes/ are fully loaded**
    - The `notes/` directory contains essential architectural, API, data type, and implementation details
    - NOTES.md is your working memory; `notes/` is the project knowledge base
    - Loading both is MANDATORY, not optional

**Format Guidelines**:

- Use clear section headers
- Include dates for work completed
- Keep TODOs actionable and specific
- Link to relevant files and line numbers
- Include code snippets for complex discoveries
- Keep "Context for Next Session" section updated for quick resume

**Example Update Pattern**:

```markdown
### Session 2026-06-02 (continued)

- **Goal**: Implement client-side validation
- **Completed**:
    - Added AJV validation in Submit.svelte line 234
    - Updated tests in Submit.svelte.test.ts
    - Documented validation flow in notes/05-functionality.md
- **Discovered**: Validation errors need better UX, currently just toast
- **Next**: Add inline field validation errors
```

---

## Project Overview

CAPE Frontend is a SvelteKit 5 application for biological sample upload, pipeline submission, and report viewing. It provides a web interface to the CAPE API for managing sequencing data workflows.

**Tech Stack**: SvelteKit 5, TypeScript, Vite, Tailwind CSS 4, Skeleton UI, Vitest

---

## Development Commands

### Running the Application

```bash
npm run dev              # Start dev server on localhost:3000
npm run dev -- --open    # Start dev server and open browser
npm run build            # Build production bundle
npm run preview          # Preview production build
```

### Testing

```bash
npm run test:unit        # Run tests in watch mode
npm run test             # Run tests once (CI mode)
```

The test setup uses Vitest workspaces with two configurations:

- **client workspace**: Svelte component tests (jsdom environment, `*.svelte.test.ts` files)
- **server workspace**: Server-side tests (node environment, `*.test.ts` files excluding `*.svelte.test.ts`)

Test files use `@testing-library/svelte` and `@testing-library/jest-dom/vitest`. Setup file at `vitest-setup-client.ts` provides mocks for jsdom compatibility with Svelte 5.

### Linting and Formatting

```bash
npm run check            # Type-check with svelte-check
npm run check:watch      # Type-check in watch mode
npm run lint             # Check formatting (Prettier) and lint (ESLint)
npm run format           # Auto-format with Prettier
```

---

## Development Workflow for AI Agents

### Continuous Validation

**IMPORTANT**: Run linting and formatting checks as you write code. Do not wait until the end of a large change to validate your work.

#### When to Run Commands

**After every code change** (component edit, new file, refactor):

1. **Format your code**: `npm run format`
    - Auto-formats all files with Prettier
    - Ensures consistent style (indentation, quotes, line width)
    - Applies Svelte and Tailwind plugin formatting
    - Always run this before committing

2. **Check for errors**: `npm run lint`
    - Validates Prettier formatting compliance
    - Runs ESLint to catch common mistakes:
        - Unused imports and variables
        - Missing type safety (`any` types)
        - Accessibility issues
        - Svelte-specific rules (e.g., navigation with `resolve()`)
    - Must pass before marking work complete

3. **Type-check**: `npm run check` (optional during development, required before completion)
    - Validates TypeScript types across the entire project
    - Catches type mismatches Svelte components
    - Use `npm run check:watch` for continuous feedback

**Example workflow**:

```bash
# 1. Make code changes
# ... edit files ...

# 2. Format and validate
npm run format          # Fix formatting issues
npm run lint            # Check for errors
npm run check           # Verify types

# 3. If lint/check report errors, fix them and repeat step 2
```

### Testing During Development

**Run tests early and often** to catch regressions:

```bash
npm run test:unit       # Run tests in watch mode (auto-reruns on file changes)
npm run test            # Run tests once (CI mode, for final validation)
```

**When to run tests**:

- After implementing new functionality
- After fixing bugs
- After refactoring existing code
- Before marking work complete

**Test-driven development flow**:

1. Write or update tests for new behavior
2. Run `npm run test:unit` in watch mode
3. Implement code changes
4. Watch tests pass automatically
5. Run full `npm run test` suite before completion

### Local Development Server

**Use the dev server to manually test UI changes**:

```bash
npm run dev              # Start dev server on localhost:3000
npm run dev -- --open    # Start dev server and open browser automatically
```

**When to use the dev server**:

- Testing visual changes to components
- Verifying user interactions (forms, buttons, navigation)
- Debugging authentication flow
- Testing API integration with actual backend
- Validating responsive design
- Checking accessibility with screen readers/keyboard navigation

**Development server features**:

- Hot module replacement (HMR) - changes appear instantly
- Vite-powered fast rebuild
- Source maps for debugging
- Full TypeScript support

### Dev Server Management for AI Agents

**IMPORTANT**: When starting and stopping dev servers, avoid hanging and blocking your workflow.

#### Starting the Dev Server

**For background operation** (when you need to continue working):

```bash
# Start in background with nohup, redirect output to log
nohup npm run dev > /tmp/vite-dev.log 2>&1 &

# Wait briefly and verify it's running
sleep 5 && curl -s http://localhost:3000 > /dev/null && echo "✓ Server ready"
```

**DO NOT**:

- Run `npm run dev` without backgrounding (it will block indefinitely)
- Wait for interactive output when running in background
- Use `npm run dev &` alone (doesn't detach properly from shell)

#### Stopping the Dev Server

**MANDATORY: Always kill the server when testing is complete**:

```bash
# Kill all vite dev processes
pkill -f "vite dev"

# Verify it's stopped
ps aux | grep "vite dev" | grep -v grep
```

**Policy**:

- **Always stop the dev server after testing** unless explicitly instructed to leave it running
- The dev server consumes resources and can interfere with future sessions
- Verify the server is stopped before marking work complete

**DO NOT**:

- Leave the dev server running at end of testing
- Try to kill with Ctrl+C when running in background
- Wait indefinitely for confirmation when the process is already stopped
- Use `kill` with specific PIDs unless you saved them

#### Checking Server Status

```bash
# Quick check if server is responding
curl -s http://localhost:3000 > /dev/null && echo "Running" || echo "Not running"

# Check for running processes
ps aux | grep "vite dev" | grep -v grep
```

### Pre-Completion Checklist

**Before marking any work as complete**, verify:

- [ ] `npm run format` - All files formatted
- [ ] `npm run lint` - No linting errors
- [ ] `npm run check` - No type errors
- [ ] `npm run test` - All tests pass
- [ ] `npm run dev` - Manually tested changes in browser (for UI work)
- [ ] **Documentation updated** - **MANDATORY**: See "Documentation Maintenance" section below
    - [ ] `NOTES.md` updated with work summary
    - [ ] Relevant `notes/*.md` files updated (see documentation maintenance rules)
    - [ ] No obsolete information remains in docs
    - [ ] Examples in docs reflect current implementation

**For UI/component changes**, also verify in dev server:

- [ ] Visual appearance matches requirements
- [ ] Responsive behavior on different screen sizes
- [ ] Accessibility (keyboard navigation, screen reader labels)
- [ ] Error states display correctly
- [ ] Loading states work as expected

### Fixing Common Issues

**Lint errors** (`npm run lint` fails):

```bash
# 1. Run format first (fixes most issues automatically)
npm run format

# 2. Check lint again
npm run lint

# 3. If still failing, read the error messages:
#    - "Unused variable/import" → Remove it
#    - "any type" → Add proper types with type guards
#    - "Missing key in each block" → Add unique key expression
#    - "Navigation without resolve" → Import and use resolve() from '$app/paths'
```

**Type errors** (`npm run check` fails):

```bash
# 1. Read error messages carefully - they show file:line:column
# 2. Common fixes:
#    - Add missing type annotations to $state() declarations
#    - Import missing types from correct modules
#    - Use type guards for unknown/any types
#    - Ensure props match component interface
```

**Test failures** (`npm run test` fails):

```bash
# 1. Run in watch mode to see detailed output
npm run test:unit

# 2. Read failure messages:
#    - "Cannot find module" → Import path wrong or file missing
#    - "Element not found" → Query selector wrong or component not rendering
#    - "Expected X but got Y" → Logic error in implementation
```

---

## Documentation Maintenance

### ⚠️ CRITICAL REQUIREMENT ⚠️

**Documentation is NOT optional. It is part of the implementation.**

When you change code, you MUST update the corresponding documentation in the SAME work session. This is not a suggestion—it is a requirement for marking work as complete.

### Technical Documentation (`notes/` directory)

The `notes/` directory contains comprehensive technical documentation that **MUST be kept in sync** with code changes:

- **01-overview.md** - Project purpose, tech stack, goals, environment
- **02-architecture.md** - System design, patterns, data flow
- **03-api-endpoints.md** - Complete API reference with request/response schemas
- **04-data-types.md** - All TypeScript interfaces and types
- **05-functionality.md** - Feature explanations and implementation details
- **06-external-interactions.md** - External systems integration (AWS, APIs, libraries)
- **07-user-workflows.md** - User interaction flows with success/error states
- **08-submit-page-walkthrough.md** - Detailed Submit component walkthrough (partially archived)
- **09-workflows-api-analysis.md** - Workflows API analysis and design decisions
- **10-workflows-submission-monitoring.md** - Workflow submission and monitoring
- **11-workflow-submit-ui-design.md** - UI design for workflow submission
- **12-coding-style-guide.md** - Comprehensive coding style patterns and examples

### When to Update Documentation (MANDATORY)

**You MUST update documentation when you change:**

1. **API Integration**:
    - New/removed/modified endpoints → Update `03-api-endpoints.md`
    - Changed request/response schemas → Update `03-api-endpoints.md`
    - New query parameters or headers → Update `03-api-endpoints.md`

2. **Type Definitions**:
    - New/modified TypeScript interfaces → Update `04-data-types.md`
    - Changed field names or types → Update `04-data-types.md`
    - New constants or utility types → Update `04-data-types.md`

3. **Architecture or Patterns**:
    - New patterns or design decisions → Update `02-architecture.md`
    - Changed data flow or component structure → Update `02-architecture.md`
    - Modified state management approach → Update `02-architecture.md`

4. **Features or Functionality**:
    - New features or functionality → Update `05-functionality.md`
    - Modified user-facing behavior → Update `05-functionality.md` and `07-user-workflows.md`
    - Changed validation or error handling → Update `05-functionality.md`

5. **External Integration**:
    - New external services or APIs → Update `06-external-interactions.md`
    - Changed authentication flow → Update `06-external-interactions.md`
    - Modified library usage → Update `06-external-interactions.md`

6. **User Workflows**:
    - New user workflows → Update `07-user-workflows.md`
    - Changed UI interactions → Update `07-user-workflows.md`
    - Modified error states or recovery paths → Update `07-user-workflows.md`

7. **Environment or Setup**:
    - New environment variables → Update `01-overview.md`
    - Changed tech stack or dependencies → Update `01-overview.md`
    - Modified development setup → Update `01-overview.md`

8. **Code Examples in Documentation**:
    - When you remove a function (like `getCliOptionsString()`), update ALL docs that reference it
    - Replace outdated examples with current patterns
    - Update `12-coding-style-guide.md` if function signatures change

### How to Update Documentation

**DO**:

- Update docs in the SAME session as code changes
- Search for references to changed/removed code: `grep -r "functionName" notes/`
- Update type definitions to match actual implementation
- Add update notes to archived sections explaining what changed
- Update `NOTES.md` with summary of documentation changes

**DON'T**:

- Skip documentation updates "to save time"
- Leave outdated examples or explanations
- Assume someone else will update docs later
- Mark work complete without verifying documentation accuracy

### Documentation Review Checklist (MANDATORY)

Before marking work complete, verify:

- [ ] Code changes are reflected in relevant `notes/*.md` files
- [ ] Type definitions match between code and `04-data-types.md`
- [ ] API endpoint documentation matches actual implementation
- [ ] User workflows are accurate for current UI behavior
- [ ] No obsolete information remains in docs (old endpoints, removed features)
- [ ] Examples in docs use current schemas and patterns
- [ ] Cross-references between doc files are still valid
- [ ] `NOTES.md` updated with comprehensive work summary
- [ ] You searched for all references to changed/removed code in `notes/`

### Why This Matters

**Documentation drift is technical debt.** Outdated docs are worse than no docs because they actively mislead future developers and maintainers. Keeping docs synchronized with code:

- Accelerates onboarding for new team members
- Reduces debugging time (accurate API/type references)
- Prevents reimplementation of existing features
- Documents design decisions while context is fresh
- Enables confident refactoring (clear current state vs. desired state)
- Prevents wasting time debugging based on incorrect documentation

**If you change code without updating documentation, the work is incomplete.**

---

## Architecture

### Core Libraries (`src/lib/`)

**Authentication & User State**

- `cognito.ts`: OIDC UserManager configuration for AWS Cognito authentication
- `user.svelte.ts`: Svelte 5 reactive state for authenticated user (exported `auth` object)

**API Integration**

- `pipeline.ts`: API client for fetching pipelines and pipeline profiles from CAPE API
    - Uses AJV for JSON Schema validation of pipeline parameters
    - Key types: `Pipeline`, `PipelineProfile` (includes `parametersSchema` for dynamic form generation)
- `mpu.ts`: Multipart upload manager for large file uploads to S3
- `stream.ts`: TAR streaming for bundling sample metadata with FASTA files

**Utilities**

- `toaster.ts`: Toast notification system
- `env.ts`: Public environment variable exports

### Component Organization (`src/lib/components/`)

Each component directory contains:

- Main `.svelte` file
- `.svelte.test.ts` test file
- Additional type definitions or fixtures as needed

**Key Components**:

- **FileUpload**: Handles FASTA file uploads with multipart upload progress tracking
- **Submit**: Dynamic pipeline submission form
    - Fetches pipeline list and selected pipeline profile from API
    - Generates form fields from `PipelineProfile.parametersSchema` (JSON Schema)
    - Validates submission against schema before sending
- **Report**: Displays pipeline execution reports
- **LoggingIn**: Authentication flow UI
- **Navbar**: Top navigation with user info and tab switching
- **Menu**: Navigation menu component

### Routes (`src/routes/`)

- `+layout.svelte`: Root layout
- `+page.svelte`: Main application page with three tabs (Upload, Submit, Report)
    - Conditionally renders based on authentication state (`auth.user`)
    - Tab state managed in component (`activeKey`)
- `auth/callback/+page.svelte`: OAuth callback handler

### Svelte 5 State Management

This project uses Svelte 5's runes-based reactivity:

- `$state()`: Reactive state declarations
- `$derived()`: Computed values
- `$effect()`: Side effects
- `$props()`: Component props with TypeScript

Global auth state is managed via `src/lib/user.svelte.ts` as a reactive module-level state object.

---

## Coding Style & Best Practices

### Style Guide Reference

**Complete style guide**: See `notes/12-coding-style-guide.md` for comprehensive patterns

**Quick Reference**:

- **Indentation**: 4 spaces (not tabs)
- **Quotes**: Single quotes for strings
- **Line width**: 100 characters
- **Svelte 5**: Use runes (`$state`, `$derived`, `$effect`, `$props`)
- **TypeScript**: Strict mode, always type complex $state
- **Accessibility**: All inputs need `aria-label`

### Code Modification Principles

#### 1. Minimal, Focused Edits

**DO**:

- Change only what's necessary for the task
- Keep edits localized to affected functionality
- Prefer Edit tool over rewriting entire files
- Use smallest correct implementation

**DON'T**:

- Refactor unrelated code while making changes
- "Clean up" code not touched by current task
- Add features beyond stated requirements
- Restructure architecture unless explicitly required

**Example - Adding workflow submission**:

```typescript
// Good: Add new function for workflows, leave existing DAP code alone
async function submitWorkflow(dagId: string, profiles: PipelineProfile[]) {
    // New implementation
}

// Bad: Refactor existing submit function "while we're here"
async function submit(type: 'pipeline' | 'workflow', ...) {
    // Unnecessary abstraction
}
```

#### 2. Delete Stale Code

**When code becomes unused, remove it immediately**:

**DO** remove:

- Functions no longer called
- Imports no longer used
- State variables made obsolete
- Props no longer passed
- Type definitions without references
- Comments explaining removed code

**DON'T** remove:

- Code still used elsewhere (verify with grep)
- Shared utilities even if only one call site
- Type definitions exported for other components

**Verification before deletion**:

```bash
# Check if function is used elsewhere
grep -r "functionName" src/ --include="*.ts" --include="*.svelte"

# Check if type is imported
grep -r "import.*TypeName" src/
```

**Example - Removing old pipeline selection**:

```typescript
// REMOVE these when migrating to workflows:
let pipelineName = $state('');           // ← Delete
let pipelineVersion = $state('');        // ← Delete
function groupPipelines(...) { }         // ← Delete
const pipelineChoices = $derived(...);   // ← Delete

// KEEP these (still used):
function getParameterFields(...) { }     // ← Keep (reused for workflows)
function getCliOptionsString(...) { }    // ← Keep (reused for workflows)
```

#### 3. Constrained Scope

**Stay within task boundaries**:

**DO**:

- Implement requested feature only
- Fix bugs directly related to change
- Update documentation for changed behavior
- Add tests for new functionality

**DON'T**:

- Add "nice to have" features
- Implement features "while we're here"
- Refactor working code for style
- Optimize without measuring
- Add error handling for scenarios that can't happen

**Scope creep example**:

```
Task: Add workflow selection dropdown

✓ Add workflow selection dropdown
✓ Fetch workflows from API
✓ Display workflow list
✗ Add search/filter to dropdown (not requested)
✗ Add workflow favoriting (not requested)
✗ Cache workflows in localStorage (not requested)
```

#### 4. Preserve Working Code

**If it works and isn't in the change path, leave it alone**:

**DO** preserve:

- Existing component structure
- Working validation logic
- Current form rendering
- Established patterns

**Example - Adding workflow support**:

```typescript
// Keep existing form generation logic
function getParameterFields(schema: unknown): ParameterField[] {
    // This works for both single pipelines and workflow stages
    // DON'T rewrite it unless broken
}

// Add new workflow-specific logic separately
function getWorkflowProfiles(dagId: string): Promise<PipelineProfile[]> {
    // New function, doesn't touch existing code
}
```

### Workflow-Specific Guidelines

#### Component Reuse Strategy

**Reuse existing logic for form generation**:

- `getParameterFields()` - works for any schema
- `getDefaultOptions()` - works for any schema
- Field rendering template - works for any field
- `getCliOptionsString()` - works for any options object

**Add new logic for workflow orchestration**:

- Workflow selection (new)
- Multi-stage state management (new)
- Accordion UI (new)
- Array-based submission (new)

#### Migration Approach

**Phase 1: Add workflow support alongside existing**

- New functions for workflow API calls
- New state management for multiple stages
- New UI for workflow selection
- Existing single-pipeline code untouched

**Phase 2: Remove old code only when fully migrated**

- Remove `/dap` API calls
- Remove pipeline name/version selection
- Remove `bucketURI` prop
- Remove single-pipeline submission

**NOT: Rewrite everything at once**

---

## JSON Schema Usage

The Submit component dynamically generates form fields from JSON Schema definitions retrieved from the CAPE API (`PipelineProfile.parametersSchema`). This allows the frontend to support new pipelines without code changes.

**Schema Validation Flow**:

1. Fetch `PipelineProfile` for selected pipeline/version
2. Extract `parametersSchema` (JSON Schema)
3. Generate form fields from schema properties
4. Compile validator with AJV (`compile()` from `pipeline.ts`)
5. Validate user input before submission (`validate()` from `pipeline.ts`)

**Schema Features Used**:

- Property types: `string`, `integer`, `number`, `boolean`
- Metadata: `title`, `description`, `default`
- Validation: `minimum`, `maximum`, `const`, `enum`
- Required fields via `required` array

---

## Key Patterns

### API Base URL Configuration

Components receive `baseUrl` as props. Current hardcoded value: `https://api.cape-dev.org/capi-dev`

### File Upload Flow

1. User selects FASTA files in FileUpload component
2. Files bundled into TAR archive with sample metadata (via `stream.ts`)
3. TAR uploaded to S3 via multipart upload (via `mpu.ts`)
4. Progress tracked and displayed with `FileUploadProgress`

### Pipeline Submission Flow

1. User selects pipeline name and version
2. Component fetches `PipelineProfile` from API
3. Form fields generated from `parametersSchema`
4. User fills form, values validated against schema
5. Validated data POSTed to API

---

## Configuration Files

- `vite.config.ts`: Vite + SvelteKit + Tailwind setup, Vitest workspace configuration
- `tsconfig.json`: TypeScript strict mode, extends `.svelte-kit/tsconfig.json`
- `svelte.config.js`: SvelteKit adapter configuration
- `package.json`: Scripts and dependencies

---

## Testing Conventions

- Component tests co-located with components (`*.svelte.test.ts`)
- Use `@testing-library/svelte` render and query utilities
- Use `@testing-library/jest-dom/vitest` matchers (`toBeInTheDocument`, etc.)
- Mock external dependencies (axios, OIDC client) in tests
- Client tests run in jsdom, server tests run in node

---

## Important Notes

- **Branch Context**: The current branch (`19-use-jsonschema-from-pipelineprofile`) is implementing JSON Schema-based form generation from `PipelineProfile.parametersSchema`
- **Svelte 5**: This project uses Svelte 5's new reactivity model (runes), not Svelte 4 patterns
- **Authentication**: The app gates all functionality behind Cognito authentication (`{#if auth.user}`)
- **Schema-Driven UI**: Pipeline submission forms are dynamically generated from backend JSON schemas, not hardcoded

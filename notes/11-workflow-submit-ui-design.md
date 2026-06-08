# Multi-Stage Workflow Submit UI Design

**Target Users**: Biomedical/epidemiology domain scientists (non-technical)

**Design Goals**:

- Clear workflow context
- Simple pipeline configuration
- Minimal cognitive load
- Error guidance without jargon
- Visual workflow understanding

---

## Design Principles

### 1. Progressive Disclosure

Show only what the user needs at each step. Hide technical complexity.

### 2. Visual Hierarchy

Use clear visual separation between workflow-level and pipeline-level information.

### 3. Contextual Help

Provide tooltips and descriptions from the schema, not technical error messages.

### 4. Validation Feedback

Show errors inline near the problematic field, not in a toast or console.

### 5. Confidence Before Submission

User should understand what will happen before clicking Submit.

---

## Layout Option A: Tabbed Interface

### Overview

**Structure**: Horizontal tabs for each pipeline stage, plus overview tab

**Pros**:

- Clean, one stage at a time
- Familiar pattern (browser tabs)
- Good for workflows with many stages

**Cons**:

- User must remember to fill all tabs
- Can't see parameters across stages at once
- Easy to miss validation errors in other tabs

### ASCII Mockup

```
┌────────────────────────────────────────────────────────────────┐
│ Submit Workflow                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Selected Workflow: Bactopia v3.2.0 and Kraken2 v3.2.0         │
│ Workflow that runs bactopia v3.2.0 followed by kraken2        │
│ (as a bactopia tool) using bactopia v3.2.0                    │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ ┌─ [Overview] ──┬─ Stage 1: Bactopia ─┬─ Stage 2: Kraken2 ─┐ │
│ │                                                            │ │
│ │  Workflow Execution Flow                                  │ │
│ │  ┌──────────────────┐                                     │ │
│ │  │  Bactopia ONT    │  Bacterial genome assembly         │ │
│ │  │  Sample          │  from Oxford Nanopore reads        │ │
│ │  └────────┬─────────┘                                     │ │
│ │           │                                               │ │
│ │           ↓                                               │ │
│ │  ┌──────────────────┐                                     │ │
│ │  │  Bactopia        │  Taxonomic classification of       │ │
│ │  │  Kraken2         │  assembled genomes                 │ │
│ │  └──────────────────┘                                     │ │
│ │                                                            │ │
│ │  Stage 1 → Stage 2                                        │ │
│ │  Output from Bactopia becomes input to Kraken2            │ │
│ │                                                            │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ [ Back ]                                      [ Next: Stage 1 ] │
└────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────┐
│ Submit Workflow                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Selected Workflow: Bactopia v3.2.0 and Kraken2 v3.2.0         │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ ┌── Overview ──┬─[ Stage 1: Bactopia ]─┬─ Stage 2: Kraken2 ─┐│
│ │ Bactopia ONT Sample v3.2.0                                 ││
│ │ Execute Bactopia's ONT sample sequencing workflow          ││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Sample Name *                                           │││
│ │ │ ┌─────────────────────────────────────────────────────┐ │││
│ │ │ │ my-sample-001                                       │ │││
│ │ │ └─────────────────────────────────────────────────────┘ │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ ONT Sequencing Reads *                                  │││
│ │ │ ┌─────────────────────────────────────────────────────┐ │││
│ │ │ │ s3://bucket/reads.fastq.gz                          │ │││
│ │ │ └─────────────────────────────────────────────────────┘ │││
│ │ │ Path to Oxford Nanopore sequencing reads                │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Output Directory *                                      │││
│ │ │ ┌─────────────────────────────────────────────────────┐ │││
│ │ │ │ s3://results/bactopia-output                        │ │││
│ │ │ └─────────────────────────────────────────────────────┘ │││
│ │ │ S3 location where results will be written               │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Max CPUs                                                │││
│ │ │ ┌─────────────────────────────────────────────────────┐ │││
│ │ │ │ 8                                                   │ │││
│ │ │ └─────────────────────────────────────────────────────┘ │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Max Memory                                              │││
│ │ │ ┌─────────────────────────────────────────────────────┐ │││
│ │ │ │ 24.GB                                               │ │││
│ │ │ └─────────────────────────────────────────────────────┘ │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ [ ← Overview ]                              [ Next: Stage 2 → ] │
└────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────┐
│ Submit Workflow                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Selected Workflow: Bactopia v3.2.0 and Kraken2 v3.2.0         │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ ┌── Overview ──┬── Stage 1: Bactopia ──┬[ Stage 2: Kraken2 ]┐│
│ │ Bactopia Kraken2 v3.2.0                                    ││
│ │ Execute Bactopia's Kraken2 workflow                        ││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Bactopia Output Directory *                             │││
│ │ │ ┌─────────────────────────────────────────────────────┐ │││
│ │ │ │ s3://results/bactopia-output                        │ │││
│ │ │ └─────────────────────────────────────────────────────┘ │││
│ │ │ 💡 This should match the Output Directory from Stage 1  │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Kraken2 Database Path                                   │││
│ │ │ ┌─────────────────────────────────────────────────────┐ │││
│ │ │ │ /mnt/nextflow_shared_data/kraken2                   │ │││
│ │ │ └─────────────────────────────────────────────────────┘ │││
│ │ │ (Read-only: managed by infrastructure)                  │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Max CPUs                                                │││
│ │ │ ┌─────────────────────────────────────────────────────┐ │││
│ │ │ │ 2                                                   │ │││
│ │ │ └─────────────────────────────────────────────────────┘ │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Max Memory                                              │││
│ │ │ ┌─────────────────────────────────────────────────────┐ │││
│ │ │ │ 8.GB                                                │ │││
│ │ │ └─────────────────────────────────────────────────────┘ │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ [ ← Stage 1 ]                                   [ Review → ] │
└────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────┐
│ Submit Workflow                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Selected Workflow: Bactopia v3.2.0 and Kraken2 v3.2.0         │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ ┌── Overview ──┬── Stage 1 ──┬── Stage 2 ──┬─[ Review ]─────┐│
│ │ Review Configuration                                       ││
│ │                                                             ││
│ │ ✓ Stage 1: Bactopia ONT Sample                            ││
│ │   • Sample: my-sample-001                                  ││
│ │   • ONT Reads: s3://bucket/reads.fastq.gz                  ││
│ │   • Output: s3://results/bactopia-output                   ││
│ │   • Resources: 8 CPUs, 24.GB memory                        ││
│ │                                                             ││
│ │ ✓ Stage 2: Bactopia Kraken2                               ││
│ │   • Input: s3://results/bactopia-output                    ││
│ │   • Database: /mnt/nextflow_shared_data/kraken2            ││
│ │   • Resources: 2 CPUs, 8.GB memory                         ││
│ │                                                             ││
│ │ ⚠ Estimated runtime: 30-60 minutes                         ││
│ │ ⚠ Estimated cost: ~$2.50 USD                               ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ [ ← Stage 2 ]                          [ Submit Workflow → ] │
└────────────────────────────────────────────────────────────────┘
```

### Tab Navigation Flow

1. **Overview Tab** - Workflow description + visual task flow
2. **Stage 1 Tab** - Configure first pipeline
3. **Stage 2 Tab** - Configure second pipeline
4. **Review Tab** - Summary before submission

### Tab State Indicators

```
✓ Stage 1: Bactopia    (Complete - green checkmark)
⚠ Stage 2: Kraken2     (Incomplete/errors - yellow warning)
○ Stage 3: Analysis    (Not started - gray circle)
```

---

## Layout Option B: Accordion Interface

### Overview

**Structure**: Vertically stacked collapsible panels, all visible at once

**Pros**:

- See all stages simultaneously
- Clear what's configured vs not configured
- Can jump to any stage directly
- Validation errors visible at a glance

**Cons**:

- Takes more vertical space
- Can feel overwhelming with many stages
- Scrolling required for long forms

### ASCII Mockup

```
┌────────────────────────────────────────────────────────────────┐
│ Submit Workflow                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Workflow: Bactopia v3.2.0 and Kraken2 v3.2.0                  │
│ Bacterial genome assembly followed by taxonomic classification│
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Workflow Overview                               [ − ]    │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │  Execution Flow:                                         │  │
│ │                                                           │  │
│ │  ┏━━━━━━━━━━━━━━━━━━━┓                                   │  │
│ │  ┃ Stage 1           ┃  Assemble bacterial genomes       │  │
│ │  ┃ Bactopia ONT      ┃  from nanopore sequencing data    │  │
│ │  ┗━━━━━━━┯━━━━━━━━━━━┛                                   │  │
│ │          │                                               │  │
│ │          ↓                                               │  │
│ │  ┏━━━━━━━━━━━━━━━━━━━┓                                   │  │
│ │  ┃ Stage 2           ┃  Classify assembled genomes       │  │
│ │  ┃ Bactopia Kraken2  ┃  using Kraken2 database          │  │
│ │  ┗━━━━━━━━━━━━━━━━━━━┛                                   │  │
│ │                                                           │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ✓ Stage 1: Bactopia ONT Sample              [ − ]       │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │                                                           │  │
│ │ Sample Name * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│ │ ┌─────────────────────────────────────────────────────┐  │  │
│ │ │ my-sample-001                                       │  │  │
│ │ └─────────────────────────────────────────────────────┘  │  │
│ │                                                           │  │
│ │ ONT Sequencing Reads * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│ │ ┌─────────────────────────────────────────────────────┐  │  │
│ │ │ s3://bucket/reads.fastq.gz                          │  │  │
│ │ └─────────────────────────────────────────────────────┘  │  │
│ │ Path to Oxford Nanopore sequencing reads                 │  │
│ │                                                           │  │
│ │ Output Directory * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│ │ ┌─────────────────────────────────────────────────────┐  │  │
│ │ │ s3://results/bactopia-output                        │  │  │
│ │ └─────────────────────────────────────────────────────┘  │  │
│ │                                                           │  │
│ │ Max CPUs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│ │ ┌─────────────────────────────────────────────────────┐  │  │
│ │ │ 8                                                   │  │  │
│ │ └─────────────────────────────────────────────────────┘  │  │
│ │                                                           │  │
│ │ Max Memory ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│ │ ┌─────────────────────────────────────────────────────┐  │  │
│ │ │ 24.GB                                               │  │  │
│ │ └─────────────────────────────────────────────────────┘  │  │
│ │                                                           │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ⚠ Stage 2: Bactopia Kraken2                 [ + ]       │  │
│ └──────────────────────────────────────────────────────────┘  │
│ (Collapsed - click to expand)                                 │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Review & Submit                                          │  │
│ ├──────────────────────────────────────────────────────────┤  │
│ │ ✓ All stages configured                                  │  │
│ │ ✓ All required fields completed                          │  │
│ │ ✓ No validation errors                                   │  │
│ │                                                           │  │
│ │                        [ Submit Workflow ]               │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Collapsed State (Stage 2 not configured)

```
┌──────────────────────────────────────────────────────────┐
│ ⚠ Stage 2: Bactopia Kraken2                 [ + ]       │
│ 2 required fields missing                                │
└──────────────────────────────────────────────────────────┘
```

### Expanded State (with validation error)

```
┌──────────────────────────────────────────────────────────┐
│ ⚠ Stage 2: Bactopia Kraken2                 [ − ]       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Bactopia Output Directory * ━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ s3://results/bactopia-output                        │  │
│ └─────────────────────────────────────────────────────┘  │
│ 💡 This should match Output Directory from Stage 1       │
│                                                           │
│ Max CPUs * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ┌─────────────────────────────────────────────────────┐  │
│ │                                                     │  │ ← Empty
│ └─────────────────────────────────────────────────────┘  │
│ ⚠ Max CPUs is required                                   │
│                                                           │
│ Max Memory ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ 8.GB                                                │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Layout Option C: Hybrid Stepper + Accordion

### Overview

**Structure**: Stepper progress indicator at top, current stage accordion below

**Pros**:

- Clear progress through workflow
- Focus on one stage at a time
- Visual progress indicator
- Best for linear workflows

**Cons**:

- Can't see other stages while configuring
- More complex navigation

### ASCII Mockup

```
┌────────────────────────────────────────────────────────────────┐
│ Submit Workflow                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Workflow: Bactopia v3.2.0 and Kraken2 v3.2.0                  │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐    │
│ │     ①━━━━━━━━━②━━━━━━━━━③━━━━━━━━━④                  │    │
│ │   Overview → Stage 1 → Stage 2 → Review               │    │
│ │     ✓          ●          ○          ○                 │    │
│ │              (Current)                                 │    │
│ └────────────────────────────────────────────────────────┘    │
│                                                                │
│ ╔══════════════════════════════════════════════════════════╗  │
│ ║ Stage 1 of 2: Bactopia ONT Sample                       ║  │
│ ║ Execute Bactopia's ONT sample sequencing workflow       ║  │
│ ╚══════════════════════════════════════════════════════════╝  │
│                                                                │
│ Sample Name * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ my-sample-001                                            │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ONT Sequencing Reads * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ s3://bucket/reads.fastq.gz                               │  │
│ └──────────────────────────────────────────────────────────┘  │
│ Path to Oxford Nanopore sequencing reads                      │
│                                                                │
│ Output Directory * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ s3://results/bactopia-output                             │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌────────────────────┬────────────────────┐                   │
│ │ Max CPUs           │ Max Memory         │                   │
│ ├────────────────────┼────────────────────┤                   │
│ │ ┌────────────────┐ │ ┌────────────────┐ │                   │
│ │ │ 8              │ │ │ 24.GB          │ │                   │
│ │ └────────────────┘ │ └────────────────┘ │                   │
│ └────────────────────┴────────────────────┘                   │
│                                                                │
│                                                                │
│ [ ← Back to Overview ]                    [ Next: Stage 2 → ] │
└────────────────────────────────────────────────────────────────┘
```

---

## Recommended Design: **Option B (Accordion)**

### Rationale

1. **Visibility**: User sees all stages and their status simultaneously
2. **Validation**: Errors visible at section level without navigation
3. **Simplicity**: Single page, no tab switching confusion
4. **Flexibility**: Works for 2 stages or 10 stages
5. **Domain-appropriate**: Scientists want to see the full picture

### Key Features

#### 1. Workflow Header

```
┌────────────────────────────────────────────────────────┐
│ Bactopia v3.2.0 and Kraken2 v3.2.0                    │
│ Bacterial genome assembly followed by taxonomic       │
│ classification using Kraken2                           │
│                                                        │
│ [i] This workflow takes 30-60 minutes to complete     │
└────────────────────────────────────────────────────────┘
```

#### 2. Workflow Visualization (Collapsible)

Simple linear flow diagram showing:

- Stage names
- Brief descriptions
- Data flow arrows

**Not included**:

- Task-level details (submit_bactopia_batch_job, etc.)
- Airflow operators
- Technical implementation

#### 3. Stage Accordions

**Header States**:

```
✓ Stage 1: Pipeline Name     (Complete, valid)
⚠ Stage 2: Pipeline Name     (Incomplete or has errors)
○ Stage 3: Pipeline Name     (Not started)
```

**Collapsed Header Info**:

```
┌──────────────────────────────────────────────────┐
│ ✓ Stage 1: Bactopia ONT Sample      [ − ]       │
│ Sample: my-sample-001 • Output: s3://...        │
└──────────────────────────────────────────────────┘
```

**Error State**:

```
┌──────────────────────────────────────────────────┐
│ ⚠ Stage 2: Bactopia Kraken2         [ + ]       │
│ 1 required field missing                         │
└──────────────────────────────────────────────────┘
```

#### 4. Parameter Fields

**Standard Field**:

```
Sample Name * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────┐
│ my-sample-001                                   │
└─────────────────────────────────────────────────┘
Unique identifier for your sample
```

**Field with Error**:

```
Max CPUs * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────┐
│ 100                                             │
└─────────────────────────────────────────────────┘
⚠ Must be between 1 and 38
```

**Field with Contextual Help**:

```
Bactopia Output Directory * ━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────┐
│ s3://results/bactopia-output                    │
└─────────────────────────────────────────────────┘
💡 This should match "Output Directory" from Stage 1
   (Output from Stage 1 becomes input to this stage)
```

**Read-only Field**:

```
Kraken2 Database Path ━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────┐
│ /mnt/nextflow_shared_data/kraken2               │ 🔒
└─────────────────────────────────────────────────┘
Managed by infrastructure (cannot be changed)
```

#### 5. Submit Section

**Before Validation**:

```
┌──────────────────────────────────────────────────┐
│ Ready to Submit?                                 │
├──────────────────────────────────────────────────┤
│ ⚠ Please configure all stages before submitting │
│                                                  │
│ [ Submit Workflow ] (disabled)                  │
└──────────────────────────────────────────────────┘
```

**After Validation (All valid)**:

```
┌──────────────────────────────────────────────────┐
│ Ready to Submit                                  │
├──────────────────────────────────────────────────┤
│ ✓ All 2 stages configured                       │
│ ✓ All required fields completed                 │
│ ✓ No validation errors                          │
│                                                  │
│          [ Submit Workflow ]                    │
└──────────────────────────────────────────────────┘
```

**With Errors**:

```
┌──────────────────────────────────────────────────┐
│ Cannot Submit - Issues Found                     │
├──────────────────────────────────────────────────┤
│ ⚠ Stage 2: 1 required field missing             │
│ ⚠ Stage 2: Max CPUs exceeds maximum (38)        │
│                                                  │
│ [ Submit Workflow ] (disabled)                  │
└──────────────────────────────────────────────────┘
```

---

## Validation Strategy

### Real-Time Validation

**When**: User tabs out of field (onBlur) or after 500ms of no typing

**What**:

- Check against JSON Schema constraints
- Validate required fields
- Check min/max bounds
- Validate enums
- Check string patterns (if defined)

**Display**:

- Inline error below field (red text with ⚠ icon)
- Update accordion header status (⚠ indicator)
- Update submit section error summary

### Validation Error Messages

**Schema-based errors → User-friendly messages**:

| Schema Error        | User Message                                 |
| ------------------- | -------------------------------------------- |
| `required`          | "This field is required"                     |
| `minimum: 1`        | "Must be at least 1"                         |
| `maximum: 38`       | "Must be 38 or less"                         |
| `type: "integer"`   | "Must be a whole number"                     |
| `type: "number"`    | "Must be a number"                           |
| `enum: [...]`       | "Please select one of the available options" |
| `pattern: "^s3://"` | "Must be an S3 path (starts with s3://)"     |

**No technical jargon**: Avoid terms like "schema validation failed", "instancePath", "keyword", etc.

### Submit-Time Validation

**Before submission**:

1. Validate all stages at once
2. Show summary of all errors in submit section
3. Scroll to first error
4. Highlight problematic accordion(s)
5. Keep submit button disabled until all resolved

---

## Workflow Visualization

### Simplified Task Flow

**Show**:

- Stage names
- Brief purpose of each stage
- Data flow between stages (arrows)
- Linear progression

**Don't Show**:

- Individual Airflow tasks
- Operators (BatchOperator, S3CreateObjectOperator, etc.)
- Technical details (queue names, retry logic, etc.)
- Task IDs

### Example Visualization

```
┌──────────────────────────────────────────────────────────┐
│ Workflow Overview                               [ − ]    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  What This Workflow Does:                                │
│                                                           │
│  ┏━━━━━━━━━━━━━━━━━━━━━┓                                │
│  ┃ 1. Genome Assembly  ┃                                │
│  ┃    Bactopia ONT     ┃  Assembles bacterial genomes   │
│  ┃                     ┃  from raw sequencing reads     │
│  ┗━━━━━━━━┯━━━━━━━━━━━━┛                                │
│           │                                              │
│           │ Assembled genomes                            │
│           ↓                                              │
│  ┏━━━━━━━━━━━━━━━━━━━━━┓                                │
│  ┃ 2. Classification   ┃                                │
│  ┃    Kraken2          ┃  Identifies species present    │
│  ┃                     ┃  in assembled genomes          │
│  ┗━━━━━━━━━━━━━━━━━━━━━┛                                │
│                                                           │
│  Results: Assembled genomes + taxonomic classification   │
│  Estimated Time: 30-60 minutes                           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Design Notes**:

- Collapsible (can hide if not needed)
- Plain language descriptions
- Focus on scientific workflow, not technical execution
- No mention of AWS Batch, Airflow, S3 sensors, etc.

---

## Data Flow Hints

### Cross-Stage Parameter References

When Stage 2 parameter should reference Stage 1 output:

**Stage 1**:

```
Output Directory * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────┐
│ s3://results/sample-001/bactopia                │
└─────────────────────────────────────────────────┘
Where Bactopia will write assembled genomes
```

**Stage 2** (with hint):

```
Bactopia Output Directory * ━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────┐
│ s3://results/sample-001/bactopia                │
└─────────────────────────────────────────────────┘
💡 Should match "Output Directory" from Stage 1
   (Kraken2 will read assembled genomes from here)
```

**Implementation**: Detect when parameter names suggest data flow (e.g., "bactopia" in name references earlier stage)

---

## Mobile / Responsive Considerations

### On Small Screens

- Accordion still works well (vertical stacking)
- Forms stack naturally
- Submit button becomes full-width sticky footer
- Workflow visualization can be collapsed by default

### Tablet / Desktop

- Side-by-side fields for related parameters (Max CPUs | Max Memory)
- Wider forms for better readability
- Workflow visualization expanded by default

---

## Accessibility

### Keyboard Navigation

- Tab through all form fields
- Enter to expand/collapse accordions
- Arrow keys for dropdowns/radio buttons
- Clear focus indicators

### Screen Readers

- Proper ARIA labels on all fields
- Aria-live regions for validation errors
- Accordion state announced (expanded/collapsed)
- Error summary readable before submit

### Color Considerations

- Don't rely only on color for status (use icons + text)
- ✓ Green checkmark (not just green)
- ⚠ Yellow warning icon (not just yellow)
- Sufficient contrast ratios (WCAG AA)

---

## Implementation Notes

### State Management

```typescript
// One options object per stage, indexed by position
const stageOptions = $state<Record<string, unknown>[]>([]);

// Validation state per stage
const stageErrors = $state<ValidationError[][]>([]);

// Accordion expanded state per stage
const stageExpanded = $state<boolean[]>([]);

// Validation status per stage
const stageValid = $state<boolean[]>([]);
```

### Validation Trigger

```typescript
function validateStage(stageIndex: number) {
    const profile = profiles[stageIndex];
    const options = stageOptions[stageIndex];
    const validator = compile(profile.parametersSchema);

    try {
        validate(validator, options);
        stageValid[stageIndex] = true;
        stageErrors[stageIndex] = [];
    } catch (err) {
        stageValid[stageIndex] = false;
        stageErrors[stageIndex] = parseAjvErrors(validator.errors);
    }
}
```

### Submit Validation

```typescript
async function onSubmit() {
    // Validate all stages
    for (let i = 0; i < profiles.length; i++) {
        validateStage(i);
    }

    // Check if all valid
    if (!stageValid.every((v) => v)) {
        // Scroll to first invalid stage
        const firstInvalidIndex = stageValid.findIndex((v) => !v);
        scrollToStage(firstInvalidIndex);

        // Show error summary
        toaster.error({
            title: 'Please fix validation errors before submitting'
        });
        return;
    }

    // Build request body
    const requestBody = profiles.map((profile, index) => ({
        pipelineId: profile.pipelineId,
        nextflowOptions: { ...stageOptions[index] }
    }));

    // Submit
    await axios.post(`${baseUrl}/workflows/trigger?dagId=${selectedDagId}`, requestBody);

    toaster.success({
        title: 'Workflow submitted successfully'
    });
}
```

---

## Success State

After successful submission:

```
┌────────────────────────────────────────────────────────┐
│ ✓ Workflow Submitted Successfully                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Your workflow has been submitted and is now running.  │
│                                                        │
│ Workflow: Bactopia v3.2.0 and Kraken2 v3.2.0         │
│ Sample: my-sample-001                                  │
│ Submitted: June 2, 2026 3:45 PM                       │
│                                                        │
│ Results will be available in:                         │
│ s3://results/sample-001/                              │
│                                                        │
│ [ Submit Another Workflow ]                           │
└────────────────────────────────────────────────────────┘
```

---

## Summary

**Recommended Design**: Accordion-based layout with:

- Collapsible workflow overview with simple visualization
- Accordion panels for each pipeline stage
- Visual indicators for completion/errors (✓ ⚠ ○)
- Inline validation with user-friendly error messages
- Submit section with error summary
- Cross-stage parameter hints where applicable
- Accessible keyboard navigation and screen reader support

**Why This Design Works**:

1. **Visibility**: See all stages and validation status at once
2. **Simplicity**: Single page, no complex navigation
3. **Guidance**: Clear error messages and contextual help
4. **Domain-appropriate**: Focuses on scientific workflow, hides technical details
5. **Scalable**: Works for 2 stages or 10 stages
6. **Accessible**: Keyboard and screen reader friendly

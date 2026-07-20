# File Upload Feature

The Upload tab lets users submit sequencing files with sample metadata. Component:
`src/lib/components/FileUpload/FileUpload.svelte` (with `FileUploadProgress.svelte`
for per-part progress). Entry point is the `upload` tab in `routes/+page.svelte`.

## Flow

1. User enters sample metadata (`sampleId`, `sampleType`, `sampleMatrix`,
   `sampleCollectionDate`) and selects FASTA/FASTQ files.
2. On upload, [[concepts/tar-streaming]] `tarPack()` builds a TAR stream containing
   `meta.json` + `sequencing/<file>`; `tarSize()` precomputes total bytes.
3. `chunkStream()` splits the TAR byte stream into 10 MB chunks.
4. [[concepts/multipart-upload]] `multiPartUpload()` initiates an S3 multipart upload
   through the CAPE `objstorage` endpoints, PUTs each part to its presigned URL with
   retry/backoff, and completes the upload.
5. Progress is surfaced per part; errors surface via [[concepts/data-models]] toaster
   notifications. On error the multipart upload is aborted.

## File validation

Only `.fastq` / `.fastq.gz` files are accepted; client-side validation rejects
others before upload. A rejected file surfaces as `RejectFile`
(`{ file, errors }`) with error code `NOT_A_FASTQ_GZ_FILE` and an error toast.

## Notable

- The destination bucket is passed as a prop and is currently hardcoded in
  `routes/+page.svelte` to `ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5`; the object
  key is `unprocessed/${filename}` (e.g. `unprocessed/sample-<id>.tar`). Pipeline
  results live in a separate output bucket
  `ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821`. `PLAN.md` proposes a governed
  storage-browser design to replace the hardcoding (not yet implemented).
- Chunks upload sequentially (one at a time), not in parallel; abort MPU cleanup
  uses a 15s timeout.

## Related

- [[analyses/workflow-submission-feature]]
- [[syntheses/cape-frontend-architecture-overview]]

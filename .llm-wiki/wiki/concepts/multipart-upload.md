# Multipart Upload (S3)

`src/lib/mpu.ts` implements a browser-side S3 multipart upload manager that talks
to CAPE `objstorage` endpoints (not S3 directly - the backend brokers presigned
URLs). Used by [[analyses/file-upload-feature]] to move multi-GB genomic bundles
without loading the whole file into memory.

## API endpoints used

- `POST {base}/objstorage/creatempu` - initiate, returns `UploadId` (XML)
- `GET {base}/objstorage/parturls` - fetch presigned part URLs
- `POST {base}/objstorage/completempu` - finalize (XML body)
- `DELETE {base}/objstorage/abortmpu` - abort/cleanup

AWS XML responses are parsed with `fast-xml-parser`.

## Behavior

- `multiPartUpload(stream, streamSize, params)` orchestrates create -> send ->
  complete, aborting the upload on any error.
- Default part size 10 MB (`DEFAULT_PART_SIZE`); parts uploaded sequentially from
  the chunk stream, each PUT to its presigned URL.
- Retry with exponential backoff + jitter (`backoff`), retrying on network errors
  and HTTP 5xx / 429 / 408 up to `numRetries` (default 3).
- Per-part progress reported via `OnProgress` callback (bytesSent / totalBytes).
- `AbortSignal` support throughout; abort triggers `abortMultipartUpload` cleanup.
- ETags collected per part and assembled into the completion XML.

## Related

- [[concepts/tar-streaming]]
- [[analyses/file-upload-feature]]
- [[concepts/data-models]]

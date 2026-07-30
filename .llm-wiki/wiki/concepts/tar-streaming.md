# TAR Streaming

`src/lib/stream.ts` bundles sample metadata and sequencing files into a TAR
archive as a stream, so large uploads never fully materialize in browser memory.
Feeds [[concepts/multipart-upload]].

## Contents of the archive

- `meta.json` - JSON-encoded `SampleMeta` (`sampleId`, `sampleType`,
  `sampleMatrix`, `sampleCollectionDate`).
- `sequencing/<filename>` - each selected FASTA/FASTQ file, streamed via
  `file.stream()`.

## Functions

- `tarPack(meta, files): tar.Pack` - builds the archive using `tar-stream`;
  bridges web `ReadableStream` to Node `Readable` (`toReadableStream`) with a
  `buffer` polyfill.
- `tarSize(meta, files): number` - precomputes final archive byte size (needed to
  size the multipart upload), accounting for 512-byte TAR block padding and the
  two trailing zero blocks.
- `chunkStream(nodeStream, chunkSize)` - async generator that re-chunks the TAR
  byte stream into fixed-size pieces (10 MB) for multipart parts.

## Related

- [[analyses/file-upload-feature]]
- [[syntheses/cape-frontend-architecture-overview]]

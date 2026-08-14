---
type: source
title: b4a 1.7.x/1.8.0 browser write() offset bug corrupts tar-stream upload archives
status: insight
category: bugfix
created: 2026-08-14
updated: 2026-08-14
slug: b4a-browser-write-offset-corrupts-tar-stream-headers
---

# b4a 1.7.x/1.8.0 browser write() offset bug corrupts tar-stream upload archives

## Symptom

CAPE Frontend Upload tab produced tar archives that were the right total size but not valid archives. Files uploaded via multipart to S3 (`unprocessed/sample-<id>.tar`) could not be read by any conformant tar reader. Backend reconstruction was blameless.

## Root cause (client-side)

The uploaded object was a structurally aligned tar (correct 512-byte block layout, correct total length, `meta.json` then `sequencing/*` order) whose numeric octal-ASCII header fields (mode, uid, gid, size, mtime, checksum, devmajor/minor) were all zero bytes, while string fields (name, `ustar` magic, typeflag) survived.

`tar-stream@3.1.8` `headers.encode` writes every numeric field with the 3-argument form `b4a.write(buf, encodeOct(...), offset)`. In `b4a@1.8.0` (and the whole 1.7.x line) the browser build (`b4a/browser.js`) `write(buffer, string, offset, length, encoding)` called with a numeric `offset` and no `length`/`encoding` computes `length = Math.min(undefined, ...) = NaN`, then `buffer.subarray(offset, NaN)` -> empty view, so the write is a silent no-op. Node's `b4a` delegates to `Buffer.prototype.write` and is unaffected, so Node reproductions and the backend build valid archives - the bug only manifests in the browser bundle.

Trigger was version drift: `b4a` is transitive (via `tar-stream` -> `streamx`), declared `^1.6.4`, and an "update packages / npm audit" lockfile refresh froze it at the broken 1.8.0.

## Version matrix (verified empirically)

- 1.6.7 OK (older codec path honored offset)
- 1.7.5 BROKEN
- 1.8.0 BROKEN (was locked here)
- 1.8.1 OK (fixed via parameter defaults: `write(buffer, string, offset = 0, length = buffer.byteLength, encoding)`)

## Fix

Added `overrides: { "b4a": "^1.8.1" }` to `package.json` and refreshed `package-lock.json` (3-line, b4a-only diff). `npm ls b4a` resolves 1.8.1 in both spots. The explicit override (not just `npm update`) prevents future audits from drifting back onto a broken 1.7.x/1.8.0. Verified end to end: re-downloaded upload has populated header fields and parses as a valid 42-member archive.

## Blast radius / durable option

The entire `tar-stream` -> `streamx` -> `b4a` / `readable-stream` chain plus the `buffer` polyfill exists solely for `src/lib/stream.ts` (`tarSize`/`tarPack`/`chunkStream`), consumed only by `FileUpload.svelte` (see [[analyses/file-upload-feature]] and [[concepts/multipart-upload]]). A hand-rolled ustar writer would remove the dependency entirely but must own two edge cases tar-stream handles for free: files > ~8 GiB (base-256 size encoding, realistic for genomics) and entry paths > 100 bytes / non-ASCII (PAX/GNU extended headers). Client-side tar reading (`tar-stream.extract`) is the only wholesale capability lost. Kept the library + override for now.

See [[concepts/external-dependencies-and-boundaries]] and [[concepts/dev-environment-and-tooling]].

_Category: bugfix_

---

_Captured: 2026-08-14_

## Related

_Add links to related pages._

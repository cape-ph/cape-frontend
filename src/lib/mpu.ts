import axios from 'axios';
import https from 'https';
import { XMLParser } from 'fast-xml-parser';
import { API_BASE } from "$lib/env";


const CREATE_MPU_URL = `${API_BASE}/objstorage/creatempu`;
const PART_URLS_URL = `${API_BASE}/objstorage/parturls`;
const COMPLETE_MPU_URL = `${API_BASE}/objstorage/completempu`;
const ABORT_MPU_URL = `${API_BASE}/objstorage/abortmpu`;


/**
 * Multi-part upload management.
 * 
 * AWS's multi-part upload (MPU) API is a several step process.
 * 
 * 1. `createMultipartUpload`. Send a multipart upload request to AWS. If
 *      successful, AWS returns an object with the `uploadId`, which uniquely
 *      identifies the upload session.
 * 
 * 2. `openMultipartUpload`. Using the `uploadId` request, AWS returns 
 *      `numParts` pre-signed URL's. The caller must close the open URLS
 *      with either `completeMultipartUpload` (to signal success), or
 *      `abortMultipartUpload` (to signal failure).
 *
 * 3. `completeMultipartUpload`. Notify AWS that the MPU has completed
 *       sucessfully and the URLS should be closed.
 * 
 * 4. `abortMultipartUpload`. Notify AWS that the MPU has failed and should
 *       be aborted.
 */

const DEFAULT_PART_SIZE = 10 * 1024 * 1024;  // 10 MB
const DEFAULT_NUM_RETRIES = 10;


export interface multipartUploadResult {
    location: string;
    bucket: string;
    key: string;
    etag: string;
    checksum: string;
    checksumType: string;
}

export async function multiPartUpload(
    file: Blob,
    {
        bucket,
        key,
        partSize = DEFAULT_PART_SIZE,
        numRetries = DEFAULT_NUM_RETRIES
    }: {
        bucket: string,
        key: string,
        partSize?: number,
        numRetries?: number
    }
): Promise<multipartUploadResult> {
    const size = normalizePartSize(file, partSize);
    const numParts = getNumParts(file, size);
    const { uploadId } = await createMultipartUpload(bucket, key);
    try {
        const urls = await openMultipartUpload(bucket, key, uploadId, numParts);
        const parts = await doMultipartUpload(file, size, urls, numRetries);
        const result = await completeMultipartUpload(bucket, key, uploadId, parts);
        return result;
    } catch (err: any) {
        await abortMultipartUpload(bucket, key, uploadId);
        throw err;
    }
}


/** XML parser to parse AWS MPU responses */
const parser = new XMLParser({
    ignoreDeclaration: true,
    ignoreAttributes: false,
});

const httpsAgent = new https.Agent({ rejectUnauthorized: false });


type CreateMultipartUploadResult = {
    bucket: string;
    key: string;
    uploadId: string;
};

/**
 * Create a multi-part upload request
 * 
 * @param bucket the AWS bucket
 * @param key the key
 * @returns the multipart upload result
 */
async function createMultipartUpload(
    bucket: string,
    key: string
): Promise<CreateMultipartUploadResult> {
    const params = { bucket, key };

    const { data } = await axios.post(
        CREATE_MPU_URL,
        null,
        {
            params,
            httpsAgent,
            responseType: 'text',
        }
    );

    const parsed = parser.parse(data);
    const r = parsed?.InitiateMultipartUploadResult;
    if (!r?.UploadId) {
        throw new Error(`Unexpected XML from MPU create: ${data?.slice?.(0, 200)}...`);
    }

    return {
        bucket: r.Bucket as string,
        key: r.Key as string,
        uploadId: r.UploadId as string,
    };
}


type PartUrl = {
    partNumber: number;
    url: string;
};

/**
 * Fetch presigned part URLs for an S3 multipart upload.
 *
 * @param {string} bucket     Target bucket name/uuid.
 * @param {string} key        Object key (path/filename).
 * @param {string} uploadId   UploadId returned by InitiateMultipartUpload.
 * @param {number} numParts   Total number of parts that will be uploaded (1..10,000).
 * @returns {Promise<PartUrl[]>} A list of `{ partNumber, url }` sorted by `partNumber` ascending.
 * @throws {RangeError} If `numParts` is not a positive integer.
 * @throws {Error} If the server response isn’t the expected array shape.
 */
async function openMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    numParts: number
): Promise<PartUrl[]> {
    if (!Number.isInteger(numParts) || numParts <= 0) {
        throw new RangeError(`numParts must be a positive integer, got ${numParts}`);
    }

    const resp = await axios.get(
        PART_URLS_URL,
        {
            params: {
                bucket,
                key,
                uploadId,
                numParts,
            },
            httpsAgent,
            responseType: 'json'
        }
    );

    const data = resp.data;

    if (!Array.isArray(data)) {
        throw new Error(`Unexpected response: expected array, got ${typeof data}`);
    }

    // Normalize & validate items
    const items: PartUrl[] = data.map((item: any) => {
        const partNumber = typeof item?.partNumber === 'string'
            ? Number(item.partNumber)
            : item?.partNumber;

        if (!Number.isInteger(partNumber) || partNumber <= 0 || typeof item?.url !== 'string') {
            throw new Error(`Invalid item in response: ${JSON.stringify(item)}`);
        }

        return { partNumber, url: item.url };
    });

    // Sort by partNumber
    items.sort((a, b) => a.partNumber - b.partNumber);

    return items;
}


interface UploadedPart {
    partNumber: number;
    eTag: string;
}


function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


function backoff(attempt: number) {
    const offset = Math.floor(Math.random() * 100);
    return 300 * (2 ** (attempt - 1)) + offset;
}


function shouldRetry(status: number) {
    return status >= 500 || status == 429 || status == 408;
}


async function doMultipartUpload(
    file: Blob,
    size: number,
    urls: PartUrl[],
    numRetries: number
): Promise<UploadedPart[]> {

    // sanity check: ensure ascending partNumber 1..N
    for (let i = 0; i < urls.length; i++) {
        const expectedPartNumber = i + 1;
        if (urls[i].partNumber !== expectedPartNumber) {
            throw new Error(
                `doMultipartUpload: urls not in ascending order or missing numbers; ` +
                `found partNumber=${urls[i].partNumber}, expected ${expectedPartNumber}`
            );
        }
    }

    const uploaded: UploadedPart[] = [];
    for (const { index, part } of iterateFileChunks(file, size)) {
        const { partNumber, url } = urls[index];

        let attempt = 0;
        while (true) {
            attempt += 1;
            try {
                const resp = await axios.put(url, part, {
                    validateStatus: () => true,
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                });

                if (resp.status >= 200 && resp.status <= 300) {
                    const headers = resp.headers;
                    if (headers && typeof headers === 'object' && 'etag' in headers && typeof (headers as any).etag === 'string') {
                        const eTag: string = headers.etag;
                        uploaded.push({ partNumber, eTag });
                        break;
                    } else {
                        throw new Error(
                            `Part ${partNumber}: missing etag in response headers `
                        )
                    }
                }

                if (attempt <= numRetries && shouldRetry(resp.status)) {
                    await sleep(backoff(attempt));
                    continue;
                }

                const snippet = typeof resp.data === "string"
                    ? resp.data.slice(0, 200)
                    : JSON.stringify(resp.data ?? {}).slice(0, 200);
                throw new Error(
                    `Part ${partNumber} upload failed: ${resp.status} ${resp.statusText} - ${snippet}`
                );

            } catch (err: any) {

                // Continue trying if we had a network drop
                const isNetworkError = axios.isAxiosError(err) && !err.response;
                if (isNetworkError && attempt <= numRetries) {
                    await sleep(backoff(attempt));
                    continue;
                }

                const msg = err instanceof Error ? err.message : String(err);
                throw new Error(
                    `Part ${partNumber} upload failed after ${attempt} attempt(s): ${msg}`
                );
            }
        }
    }

    return uploaded;
}


function ensureQuoted(tag: string): string {
    const t = tag.trim();
    return (t.startsWith('"') && t.endsWith('"')) ? t : `"${t.replace(/^"+|"+$/g, '')}"`;
}


function getMultipartUploadXML(parts: UploadedPart[]): string {
    const ns = 'http://s3.amazonaws.com/doc/2006-03-01/';
    const items = parts
        .map(
            ({ partNumber, eTag }) =>
                `<Part><PartNumber>${partNumber}</PartNumber><ETag>${ensureQuoted(eTag)}</ETag></Part>`
        )
        .join('');
    return `<?xml version="1.0" encoding="UTF-8"?>` +
        `<CompleteMultipartUpload xmlns="${ns}">${items}</CompleteMultipartUpload>`;
}


async function completeMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    parts: UploadedPart[]
): Promise<multipartUploadResult> {
    if (parts.length === 0) throw new Error('completeMultipartUpload: no parts provided');
    const xml = getMultipartUploadXML(parts);

    const resp = await axios.post(
        COMPLETE_MPU_URL,
        xml,
        {
            params: { bucket, key, uploadId },
            headers: { 'Content-Type': 'application/xml' },
            httpsAgent,
            responseType: 'text',
        }
    );

    if (resp.status >= 400) {
        const body = typeof resp.data === 'string' ? resp.data.slice(0, 400) : JSON.stringify(resp.data);
        throw new Error(`Complete MPU failed: ${resp.status} ${resp.statusText} – ${body}`);
    }

    const { CompleteMultipartUploadResult } = parser.parse(resp.data);
    return {
        location: CompleteMultipartUploadResult.Location,
        bucket: CompleteMultipartUploadResult.Bucket,
        key: CompleteMultipartUploadResult.Key,
        etag: CompleteMultipartUploadResult.ETag,
        checksum: CompleteMultipartUploadResult.ChecksumCRC64NVME,
        checksumType: CompleteMultipartUploadResult.ChecksumType
    };
}


/**
 * Abort an in-progress S3 multipart upload.
 *
 * NOTE: If your endpoint expects lowercase param names (bucket/key/uploadId) or POST instead of DELETE,
 *       adjust the `params` keys or the HTTP method below.
 *
 * @param bucket    Target bucket name/UUID.
 * @param key       Object key (path/filename).
 * @param uploadId  UploadId returned by InitiateMultipartUpload.
 * @returns Resolves on success; throws on HTTP error (status >= 400).
 */
async function abortMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string
): Promise<void> {
    const resp = await axios.delete(ABORT_MPU_URL, {
        params: {
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
        },
        httpsAgent
    });
}


/**
 * Chunking
 * 
 * Methods and iterators to lazily read an upload a file to be sent to AWS
 * through a Multi-Part Upload.
 */


/** S3 Multi-Part Upload size limits  */
const S3_MIN_PART_SIZE = 5 * 1024 * 1024; // 5 MiB
const S3_MAX_PARTS = 10_000;

/**
 * Normalize a desired chunk size so it respects common S3 MPU limits:
 */
function normalizePartSize(file: Blob, desired: number): number {
    if (!Number.isFinite(desired) || desired <= 0) {
        throw new RangeError(`chunkSize must be a positive integer, got ${desired}`);
    }
    const minByRule = S3_MIN_PART_SIZE;
    const minByCount = Math.ceil(file.size / S3_MAX_PARTS) || 0;
    return Math.max(desired, minByRule, minByCount);
}


/**
 * Compute how many parts are needed to cover the file.
 */
function getNumParts(file: Blob, size: number): number {
    if (!Number.isFinite(size) || size <= 0) {
        throw new RangeError(`chunkSize must be a positive integer, got ${size}`);
    }
    return file.size === 0 ? 0 : Math.ceil(file.size / size);
}


interface FileChunk {
    index: number;
    start: number;
    end: number;
    isLast: boolean;
    part: Blob;
}

/**
 * Create a **lazy** (zero-copy) iterator over `Blob` chunks. Each yield provides
 * metadata plus a `Blob` slice for that chunk. Only one chunk is held in memory
 * at a time unless you read buffers yourself.
 *
 * @param {Blob} file           A browser `File` or `Blob`.
 * @param {number} chunkSize    Chunk size in bytes; must be > 0. For S3 MPU, use
 *                              {@link normalizePartSize} first to satisfy size/part limits.
 * @returns {Generator<FileChunk, void, unknown>} A synchronous generator yielding {@link FileChunk}.
 * @throws {RangeError}         If `chunkSize` is not a positive finite number.
 */
function* iterateFileChunks(
    file: Blob,
    chunkSize: number
): Generator<{
    index: number;
    start: number;
    end: number;
    isLast: boolean;
    part: Blob;
}, void, unknown> {
    if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
        throw new RangeError(`chunkSize must be a positive integer, got ${chunkSize}`);
    }
    if (file.size === 0) return;

    const total = Math.ceil(file.size / chunkSize);
    for (let index = 0; index < total; index++) {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const isLast = end === file.size;
        const part = file.slice(start, end);
        yield { index, start, end, isLast, part };
    }
}

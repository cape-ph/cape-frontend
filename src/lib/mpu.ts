import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';


const createMpuUrl = (base: string) => `${base}/objstorage/creatempu`;
const partUrlsUrl = (base: string) => `${base}/objstorage/parturls`;
const completeMpuUrl = (base: string) => `${base}/objstorage/completempu`;
const abortMpuUrl = (base: string) => `${base}/objstorage/abortmpu`;


/**
 * Multi-part upload management.
 */

const DEFAULT_PART_SIZE = 10 * 1024 * 1024;  // 10 MB
const DEFAULT_NUM_RETRIES = 10;


export interface MultipartUploadResult {
    location: string;
    bucket: string;
    key: string;
    etag: string;
    checksum: string;
    checksumType: string;
}

export type OnProgress = (
    bytesSent: number, 
    totalBytes: number,
    ctx: {
        partNumber: number,
        numParts: number,
        partSize: number,
        attempt: number
    }
) => void;

export type Agent = unknown;

export async function multiPartUpload(
    file: Blob,
    {
        baseUrl,
        bucket,
        key,
        partSize = DEFAULT_PART_SIZE,
        numRetries = DEFAULT_NUM_RETRIES,
        signal,
        onProgress,
        httpsAgent,
    }: {
        baseUrl: string,
        bucket: string,
        key: string,
        partSize?: number,
        numRetries?: number,
        signal?: AbortSignal,
        onProgress?: OnProgress,
        httpsAgent?: Agent
    }
): Promise<MultipartUploadResult> {
    const size = normalizePartSize(file, partSize);
    const numParts = getNumParts(file, size);
    const { uploadId } = await createMultipartUpload(baseUrl, bucket, key, httpsAgent);
    try {
        const urls = await openMultipartUpload(baseUrl, bucket, key, uploadId, numParts, httpsAgent);
        const parts = await doMultipartUpload(file, size, urls, numRetries, signal, onProgress, httpsAgent);
        const result = await completeMultipartUpload(baseUrl, bucket, key, uploadId, parts, httpsAgent);
        return result;
    } catch (err: any) {
        await abortMultipartUpload(baseUrl, bucket, key, uploadId, httpsAgent);
        throw err;
    }
}


/** XML parser to parse AWS MPU responses */
const parser = new XMLParser({
    ignoreDeclaration: true,
    ignoreAttributes: false,
});


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
    base: string,
    bucket: string,
    key: string,
    httpsAgent: Agent,
): Promise<CreateMultipartUploadResult> {
    const params = { bucket, key };

    const { data } = await axios.post(
        createMpuUrl(base),
        null,
        {
            params,
            responseType: 'text',
            httpsAgent
        },
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
    base: string,
    bucket: string,
    key: string,
    uploadId: string,
    numParts: number,
    httpsAgent: Agent,
): Promise<PartUrl[]> {
    if (!Number.isInteger(numParts) || numParts <= 0) {
        throw new RangeError(`numParts must be a positive integer, got ${numParts}`);
    }

    const resp = await axios.get(
        partUrlsUrl(base),
        {
            params: {
                bucket,
                key,
                uploadId,
                numParts,
            },
            responseType: 'json',
            httpsAgent
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
    numRetries: number,
    signal: AbortSignal | undefined,
    onProgress: OnProgress | undefined,
    httpsAgent: Agent | undefined
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
    const numParts = getNumParts(file, size);
    const totalBytes = file.size;
    let bytesSent = 0;

    for (const { index, part } of iterateFileChunks(file, size)) {
        const { partNumber, url } = urls[index];

        let attempt = 0;
        let perLoaded = 0;
        const partSize = part.size;

        while (true) {
            attempt += 1;
            try {
                const resp = await axios.put(url, part, {
                    validateStatus: () => true,
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                    httpsAgent,
                    signal,
                    onUploadProgress: (e) => {
                        if (!onProgress) return;
                        const loaded = e.loaded ?? 0;
                        const delta = loaded - perLoaded;

                        if (delta > 0) {
                            perLoaded += delta;
                            bytesSent += delta;
                            onProgress(bytesSent, totalBytes, {
                                partNumber,
                                numParts,
                                partSize,
                                attempt
                            });
                        }
                    }
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
    base:  string,
    bucket: string,
    key: string,
    uploadId: string,
    parts: UploadedPart[],
    httpsAgent: Agent,
): Promise<MultipartUploadResult> {
    if (parts.length === 0) throw new Error('completeMultipartUpload: no parts provided');
    const xml = getMultipartUploadXML(parts);

    const resp = await axios.post(
        completeMpuUrl(base),
        xml,
        {
            params: { bucket, key, uploadId },
            headers: { 'Content-Type': 'application/xml' },
            responseType: 'text',
            httpsAgent
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
    base: string,
    bucket: string,
    key: string,
    uploadId: string,
    httpsAgent: Agent
): Promise<void> {
    const resp = await axios.delete(abortMpuUrl(base), {
        params: {
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            httpsAgent
        },
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

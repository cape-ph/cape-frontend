import axios, { CanceledError } from 'axios';
import { XMLParser } from 'fast-xml-parser';


const createMpuUrl = (base: string) => `${base}/objstorage/creatempu`;
const partUrlsUrl = (base: string) => `${base}/objstorage/parturls`;
const completeMpuUrl = (base: string) => `${base}/objstorage/completempu`;
const abortMpuUrl = (base: string) => `${base}/objstorage/abortmpu`;


/**
 * Multi-part upload management.
 */

const DEFAULT_PART_SIZE = 10 * 1024 * 1024;  // 10 MB
const DEFAULT_NUM_RETRIES = 3;

/**
 * Parameters used in the multi-part upload API
 */
export interface MultipartUploadParams {
    baseUrl: string,
    bucket: string,
    key: string,
    partSize?: number,
    numRetries?: number,
    signal?: AbortSignal,
    onProgress?: OnProgress,
    httpsAgent?: Agent
}

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
    params: MultipartUploadParams
): Promise<MultipartUploadResult | undefined> {
    const uploadId = await createMultipartUpload(params);
    try {
        const result = await sendMultipartUpload(file, uploadId, params);
        return result;
    } catch (err: any) {
        await abortMultipartUpload(uploadId, params);
        throw err;
    }
}


/** XML parser to parse AWS MPU responses */
const parser = new XMLParser({
    ignoreDeclaration: true,
    ignoreAttributes: false,
});


/**
 * Creates a new multipart upload request for an object in the specified bucket.
 *
 * This function sends an `InitiateMultipartUpload` request to the storage service,
 * using the provided `bucket` and `key`. It parses the XML response and extracts
 * the `UploadId`, which uniquely identifies the multipart upload session.
 *
 * @async
 * @function createMultipartUpload
 * @param {Object} params - Parameters for initiating the multipart upload.
 * @param {string} params.bucket - The name of the bucket where the object will be stored.
 * @param {string} params.key - The object key (path/filename) within the bucket.
 * @param {string} params.baseUrl - The base URL of the storage service endpoint.
 * @param {import("https").Agent} [params.httpsAgent] - Optional custom HTTPS agent (e.g., for TLS settings or proxy).
 * @returns {Promise<string>} A promise that resolves to the `UploadId` string, which must be used in subsequent multipart upload requests.
 *
 * @throws {Error} If the service response does not contain a valid `UploadId`.
 * @throws {Error} If the request fails (network error, invalid credentials, etc.).
 */
export async function createMultipartUpload(
    { bucket, key, baseUrl, httpsAgent, signal }: MultipartUploadParams
): Promise<string> {
    const queryParams = { bucket, key };
    const { data } = await axios.post(
        createMpuUrl(baseUrl),
        null,
        {
            params: queryParams,
            responseType: 'text',
            httpsAgent,
            signal
        },
    );

    const parsed = parser.parse(data);
    const r = parsed?.InitiateMultipartUploadResult;
    if (!r?.UploadId) {
        throw new Error(`Unexpected XML from MPU create: ${data?.slice?.(0, 200)}...`);
    }
    return r.UploadId as string;
}


export async function sendMultipartUpload(
    file: Blob,
    uploadId: string,
    params: MultipartUploadParams
): Promise<MultipartUploadResult | undefined> {
    const { partSize, numParts } = splitMultipartUpload(file, params);
    const urls = await openMultipartUpload(uploadId, numParts, params);
    const parts = await doMultipartUpload(file, partSize, urls, params);
    if (!(params.signal && params.signal.aborted)) {
        const result = await completeMultipartUpload(uploadId, parts, params);
        return result;
    }
}


/**
 * Abort an in-progress S3 multipart upload.
 *
 * This sends an `AbortMultipartUpload` request to the backend so that
 * all uploaded parts are discarded and storage resources are released.
 *
 * Unlike other helper functions, this request is **not** bound to the
 * `AbortSignal` in {@link MultipartUploadParams}. Cleanup should always
 * be attempted, even if the original upload was canceled or the signal
 * has already been triggered.
 *
 * @async
 * @function abortMultipartUpload
 * @param {string} uploadId - The `UploadId` identifying the multipart upload to abort.
 * @param {MultipartUploadParams} params - Configuration for the request.
 * @param {string} params.baseUrl - Base URL of the backend service.
 * @param {string} params.bucket - Target bucket name/UUID.
 * @param {string} params.key - Object key (path/filename).
 * @param {import("https").Agent} [params.httpsAgent] - Optional custom HTTPS agent.
 * @returns {Promise<void>} Resolves once the abort request completes.
 *
 * @throws {Error} If the server responds with an error or the request fails.
 */
export async function abortMultipartUpload(
    uploadId: string,
    params: MultipartUploadParams
): Promise<void> {
    const {
        baseUrl,
        bucket,
        key,
        httpsAgent,
    } = params;

    await axios.delete(abortMpuUrl(baseUrl), {
        params: {
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            httpsAgent,
            timeout: 15_000,
        },
    });
}


/** Private functions ====================================================== */


function splitMultipartUpload(
    file: Blob,
    { partSize = DEFAULT_PART_SIZE }: MultipartUploadParams
): { partSize: number, numParts: number } {
    const size = normalizePartSize(file, partSize);
    const numParts = getNumParts(file, size);
    if (!Number.isInteger(numParts) || numParts <= 0) {
        throw new RangeError(`numParts must be a positive integer, got ${numParts}`);
    }
    return { partSize: size, numParts };
}


interface PartUrl {
    partNumber: number;
    url: string;
};


/**
 * Fetch presigned part URLs for an S3 multipart upload.
 *
 * This function requests presigned URLs for each part of a multipart upload.
 * The part size is normalized, and the number of parts is derived from the file size.
 * The server is expected to return an array of objects with `partNumber` and `url`.
 */
async function openMultipartUpload(
    uploadId: string,
    numParts: number,
    params: MultipartUploadParams
): Promise<PartUrl[]> {
    const {
        baseUrl,
        bucket,
        key,
        signal,
        httpsAgent,
    } = params;

    if (signal?.aborted) {
        throw new CanceledError()
    }

    const resp = await axios.get(
        partUrlsUrl(baseUrl),
        {
            params: {
                bucket,
                key,
                uploadId,
                numParts,
            },
            responseType: 'json',
            httpsAgent,
            signal
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
    partSize: number,
    urls: PartUrl[],
    parameters: MultipartUploadParams
): Promise<UploadedPart[]> {
    const {
        httpsAgent,
        signal,
        onProgress,
        numRetries = DEFAULT_NUM_RETRIES
    } = parameters;

    // sanity check: ensure ascending partNumber 1..N
    for (let i = 0; i < urls.length; i++) {
        const expectedPartNumber = i + 1;
        if (urls[i].partNumber !== expectedPartNumber) {
            throw new Error(
                `Urls not in ascending order or missing numbers; ` +
                `found partNumber=${urls[i].partNumber}, expected ${expectedPartNumber}`
            );
        }
    }

    const uploaded: UploadedPart[] = [];
    const numParts = getNumParts(file, partSize);
    const totalBytes = file.size;
    let bytesSent = 0;

    for (const { index, part } of iterateFileChunks(file, partSize)) {
        const { partNumber, url } = urls[index];
        let attempt = 0;
        let perLoaded = 0;
        const partSize = part.size;

        while (true) {
            if (parameters.signal && parameters.signal.aborted) {
                break;
            }

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

                if (attempt < numRetries && shouldRetry(resp.status)) {
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
    uploadId: string,
    parts: UploadedPart[],
    params: MultipartUploadParams
): Promise<MultipartUploadResult> {
    const {
        baseUrl,
        bucket,
        key,
        httpsAgent,
        signal,
    } = params;

    if (parts.length === 0) throw new Error('completeMultipartUpload: no parts provided');
    const xml = getMultipartUploadXML(parts);

    const resp = await axios.post(
        completeMpuUrl(baseUrl),
        xml,
        {
            params: { bucket, key, uploadId },
            headers: { 'Content-Type': 'application/xml' },
            responseType: 'text',
            httpsAgent,
            signal
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

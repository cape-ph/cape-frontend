import axios, { CanceledError } from 'axios';
import { XMLParser } from 'fast-xml-parser';

const createMpuUrl = (base: string) => `${base}/objstorage/creatempu`;
const partUrlsUrl = (base: string) => `${base}/objstorage/parturls`;
const completeMpuUrl = (base: string) => `${base}/objstorage/completempu`;
const abortMpuUrl = (base: string) => `${base}/objstorage/abortmpu`;

/**
 * Multi-part upload management.
 */

const DEFAULT_PART_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_NUM_RETRIES = 3;

/**
 * Parameters used in the multi-part upload API
 */
export interface MultipartUploadParams {
    baseUrl: string;
    bucket: string;
    key: string;
    partSize?: number;
    numRetries?: number;
    signal?: AbortSignal;
    onProgress?: OnProgress;
    httpsAgent?: Agent;
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
        partNumber: number;
        numParts: number;
        partSize: number;
        attempt: number;
    }
) => void;

export type ChunkStream = AsyncGenerator<Uint8Array, void, unknown>;

export type Agent = unknown;

export async function multiPartUpload(
    stream: ChunkStream,
    streamSize: number,
    params: MultipartUploadParams
): Promise<MultipartUploadResult | undefined> {
    const uploadId = await createMultipartUpload(params);
    try {
        const result = await sendMultipartUpload(stream, streamSize, uploadId, params);
        return result;
    } catch (err: any) {
        await abortMultipartUpload(uploadId, params);
        throw err;
    }
}

/** XML parser to parse AWS MPU responses */
const parser = new XMLParser({
    ignoreDeclaration: true,
    ignoreAttributes: false
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
export async function createMultipartUpload({
    bucket,
    key,
    baseUrl,
    httpsAgent,
    signal
}: MultipartUploadParams): Promise<string> {
    const queryParams = { bucket, key };
    const { data } = await axios.post(createMpuUrl(baseUrl), null, {
        params: queryParams,
        responseType: 'text',
        httpsAgent,
        signal
    });

    const parsed = parser.parse(data);
    const r = parsed?.InitiateMultipartUploadResult;
    if (!r?.UploadId) {
        throw new Error(`Unexpected XML from MPU create: ${data?.slice?.(0, 200)}...`);
    }
    return r.UploadId as string;
}

export async function sendMultipartUpload(
    stream: ChunkStream,
    streamSize: number,
    uploadId: string,
    params: MultipartUploadParams
): Promise<MultipartUploadResult | undefined> {

    const partSize = DEFAULT_PART_SIZE;
    const numParts = Math.ceil(streamSize / partSize);
    const urls = await openMultipartUpload(uploadId, numParts, params);
    const parts = await doMultipartUpload(stream, streamSize, partSize, urls, params);
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
    const { baseUrl, bucket, key, httpsAgent } = params;

    await axios.delete(abortMpuUrl(baseUrl), {
        params: {
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            httpsAgent,
            timeout: 15_000
        }
    });
}

/** Private functions ====================================================== */

interface PartUrl {
    partNumber: number;
    url: string;
}

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
    const { baseUrl, bucket, key, signal, httpsAgent } = params;

    if (signal?.aborted) {
        throw new CanceledError();
    }

    const resp = await axios.get(partUrlsUrl(baseUrl), {
        params: {
            bucket,
            key,
            uploadId,
            numParts
        },
        responseType: 'json',
        httpsAgent,
        signal
    });

    const data = resp.data;
    if (!Array.isArray(data)) {
        throw new Error(`Unexpected response: expected array, got ${typeof data}`);
    }

    // Normalize & validate items
    const items: PartUrl[] = data.map((item: any) => {
        const partNumber =
            typeof item?.partNumber === 'string' ? Number(item.partNumber) : item?.partNumber;

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
    return 300 * 2 ** (attempt - 1) + offset;
}

function shouldRetry(status: number) {
    return status >= 500 || status == 429 || status == 408;
}

async function doMultipartUpload(
    stream: ChunkStream,
    streamSize: number,
    partSize: number,
    urls: PartUrl[],
    parameters: MultipartUploadParams
): Promise<UploadedPart[]> {
    const { httpsAgent, signal, onProgress, numRetries = DEFAULT_NUM_RETRIES } = parameters;
    const uploaded: UploadedPart[] = [];
    const numParts = urls.length;
    const totalBytes = streamSize;
    let bytesSent = 0;
    let index = 0;

    for await (const chunk of stream) {
        const { partNumber, url } = urls[index];
        let attempt = 0;
        let perLoaded = 0;

        while (true) {
            if (parameters.signal && parameters.signal.aborted) {
                break;
            }

            attempt += 1;
            try {
                const resp = await axios.put(url, chunk, {
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
                    if (
                        headers &&
                        typeof headers === 'object' &&
                        'etag' in headers &&
                        typeof (headers as any).etag === 'string'
                    ) {
                        const eTag: string = headers.etag;
                        uploaded.push({ partNumber, eTag });
                        break;
                    } else {
                        throw new Error(`Part ${partNumber}: missing etag in response headers `);
                    }
                }

                if (attempt < numRetries && shouldRetry(resp.status)) {
                    await sleep(backoff(attempt));
                    continue;
                }

                const snippet =
                    typeof resp.data === 'string'
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

        index += 1;
    }

    return uploaded;
}

function ensureQuoted(tag: string): string {
    const t = tag.trim();
    return t.startsWith('"') && t.endsWith('"') ? t : `"${t.replace(/^"+|"+$/g, '')}"`;
}

function getMultipartUploadXML(parts: UploadedPart[]): string {
    const ns = 'http://s3.amazonaws.com/doc/2006-03-01/';
    const items = parts
        .map(
            ({ partNumber, eTag }) =>
                `<Part><PartNumber>${partNumber}</PartNumber><ETag>${ensureQuoted(eTag)}</ETag></Part>`
        )
        .join('');
    return (
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<CompleteMultipartUpload xmlns="${ns}">${items}</CompleteMultipartUpload>`
    );
}

async function completeMultipartUpload(
    uploadId: string,
    parts: UploadedPart[],
    params: MultipartUploadParams
): Promise<MultipartUploadResult> {
    const { baseUrl, bucket, key, httpsAgent, signal } = params;

    if (parts.length === 0) throw new Error('completeMultipartUpload: no parts provided');
    const xml = getMultipartUploadXML(parts);

    const resp = await axios.post(completeMpuUrl(baseUrl), xml, {
        params: { bucket, key, uploadId },
        headers: { 'Content-Type': 'application/xml' },
        responseType: 'text',
        httpsAgent,
        signal
    });

    if (resp.status >= 400) {
        const body =
            typeof resp.data === 'string' ? resp.data.slice(0, 400) : JSON.stringify(resp.data);
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

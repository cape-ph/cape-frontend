import * as tar from 'tar-stream';
import { Readable } from 'readable-stream';
import { Buffer } from 'buffer';


interface SampleMeta {
    sampleId: string;
    sampleType: string;
    sampleMatrix: string;
    sampleCollectionDate: string;
}

const TAR_BLOCK_SIZE = 512;


/**
 * Encode sample metadata into a bytes array
 * 
 * @param meta - the sample metadata
 * @returns the byte array
 */
function metaJsonBytes(meta: SampleMeta): Uint8Array<ArrayBuffer> {
    const metaStr = JSON.stringify(meta);
    return new TextEncoder().encode(metaStr);
}


/**
 * Calculate the final size of the *.tar file.
 * 
 * @param meta - the sample metadata
 * @param files - the sequence of *.fasta.gz files
 * @returns the size of the final tar archive in bytes
 */
export function tarSize(meta: SampleMeta, files: File[]): number {
    let numBytes = 0;

    // meta.json
    const metaNumBytes = metaJsonBytes(meta).length;
    numBytes += TAR_BLOCK_SIZE;
    numBytes += Math.ceil(metaNumBytes / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;

    // *.fasta.gz files
    for (const f of files) {
        const fileNumBytes = f.size;
        numBytes += TAR_BLOCK_SIZE;
        numBytes += Math.ceil(fileNumBytes / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
    }

    // Two final blocks
    numBytes += 2 * TAR_BLOCK_SIZE;
    return numBytes;
}


function toReadableStream(stream: ReadableStream<Uint8Array>): Readable {
    const reader = stream.getReader();
    return new Readable({
        read() {
            reader.read().then(({ done, value }) => {
                if (done) this.push(null);
                else this.push(Buffer.from(value));
            }).catch(err => this.destroy(err));
        }
    });
}


/**
 * Construct the tar archive from a meta object and an array of files
 * 
 * @param meta - the sample metadata
 * @param files - the array of files
 * @returns the tar.Pack used to stream the tar file
 */
export function tarPack(meta: SampleMeta, files: File[]): tar.Pack {
    const pack = tar.pack();

    const metaBytes = metaJsonBytes(meta);
    const metaBuffer = Buffer.from(metaBytes);
    pack.entry({ name: 'meta.json', size: metaBytes.length }, metaBuffer);

    for (const file of files) {
        const header = {
            name: `sequencing/${file.name}`,
            size: file.size,
            mode: 0o644,
        }
        const entry = pack.entry(header);
        toReadableStream(file.stream()).pipe(entry);
    }

    pack.finalize();
    return pack;
}


export async function* chunkStream(
    nodeStream: AsyncIterable<Uint8Array, Buffer>,
    chunkSize: number
): AsyncGenerator<Uint8Array> {
    let buffer = Buffer.alloc(0);

    for await (const chunk of nodeStream) {
        buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
        while (buffer.length >= chunkSize) {
            yield buffer.subarray(0, chunkSize);
            buffer = buffer.subarray(chunkSize);
        }
    }

    if (buffer.length > 0) {
        yield buffer; // last partial chunk
    }
}

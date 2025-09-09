

export interface Upload {
    /** The destination S3 key */
    // key: string;

    /** The state of the upload */
    state: 'pending' | 'uploading' | 'complete';

    /** The number of bytes sent */
    bytesSent: number;

    /** The total number of bytes in the stream */
    totalBytes: number;

    /** The abort upload controller */
    controller?: AbortController;
};


export interface RejectFile {
    file: File;
    errors: string[];
}
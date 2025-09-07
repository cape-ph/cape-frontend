import type { Snippet } from 'svelte';



export interface FileUploadItem {
    /** Set the item id in the DOM */
    id: string
    /** The file to upload */
    file: File;
    /** The S3 bucket key */
    key: string;
    /** The number of bytes sent */
    bytesSent: number;
    /** The total number of bytes for the file */
    totalBytes: number;
    /** The upload result */
    result?: MultipartUploadResult;
    /** The abort controller */
    controller?: AbortController;
};



export interface FileUploadProps {
    /* The S3 API URL base */
    baseUrl: string; 
    /* The S3 bucket */
    bucket: string;
    /** Set file list base classes */
    filesListBase?: string;
    /** Set file list arbitrary classes */
    filesListClasses?: string;
    /** Set file base classes */
    fileBase?: string;
    /** Set file background classes */
    fileBg?: string;
    /** Set file gap classes */
    fileGap?: string;
    /** Set file padding classes */
    filePadding?: string;
    /** Set file border-radius classes */
    fileRounded?: string;
    /** Set file arbitrary classes */
    fileClasses?: string;
    /** Set file icon classes */
    fileIcon?: string;
    /** Set file name classes */
    fileName?: string;
    /** Set file size classes */
    fileSize?: string;
    /** Set file button classes */
    fileButton?: string;
}
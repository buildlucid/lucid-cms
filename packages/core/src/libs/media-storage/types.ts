import type { Readable } from "node:stream";
import type {
	MediaAdapterData,
	MediaStatus,
	MediaType,
	ServiceResponse,
} from "../../exports/types.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

export type MediaStorageAdapterStreamBody =
	| Readable
	| ReadableStream<Uint8Array>
	| Uint8Array;

export type MediaStorageAdapterUploadBody =
	| Readable
	| ReadableStream<Uint8Array>
	| Uint8Array;

export type MediaStorageAdapterUploadPart = {
	/** One-based multipart upload part number. */
	partNumber: number;
	etag: string;
	size?: number;
};

/** Instructions for uploading a file directly over HTTP, multipart parts or TUS. */
export type MediaStorageAdapterCreateUploadSessionResponse =
	| {
			protocol: "http";
			key: string;
			request: {
				url: string;
				method: "PUT" | "POST";
				headers?: Record<string, string>;
				body:
					| { type: "raw" }
					| {
							type: "form-data";
							fileField: string;
							fields: Record<string, string>;
					  };
			};
	  }
	| {
			protocol: "multipart-parts";
			key: string;
			uploadId: string;
			/** Size of each upload part in bytes, except the final part. */
			partSize: number;
			expiresAt?: string;
			uploadedParts: MediaStorageAdapterUploadPart[];
	  }
	| {
			protocol: "tus";
			key: string;
			uploadId?: string;
			/** TUS creation endpoint used by the browser to create an upload resource. */
			endpoint: string;
			headers?: Record<string, string>;
			metadata?: Record<string, string>;
			expiresAt?: string;
	  };

export type MediaStorageAdapterCreateUploadSessionParams = {
	key: string;
	host: string;
	secretKey: string;
	fileName: string;
	mimeType: string;
	extension?: string;
	/** File size in bytes. */
	size: number;
};

/** Create an upload session for the requested key and return instructions the browser can follow. */
export type MediaStorageAdapterServiceCreateUploadSession = (
	context: ServiceContext,
	params: MediaStorageAdapterCreateUploadSessionParams,
) => ServiceResponse<MediaStorageAdapterCreateUploadSessionResponse>;

export type MediaStorageAdapterGetUploadPartUrlsParams = {
	key: string;
	uploadId: string;
	partNumbers: number[];
	expiresAt: string;
};

/** Return signed URLs for the requested multipart part numbers. */
export type MediaStorageAdapterServiceGetUploadPartUrls = (
	context: ServiceContext,
	params: MediaStorageAdapterGetUploadPartUrlsParams,
) => ServiceResponse<{
	parts: Array<{
		/** One-based multipart upload part number. */
		partNumber: number;
		url: string;
		headers?: Record<string, string>;
	}>;
}>;

export type MediaStorageAdapterListUploadPartsParams = {
	key: string;
	uploadId: string;
};

/** List parts already uploaded so an interrupted upload can resume. */
export type MediaStorageAdapterServiceListUploadParts = (
	context: ServiceContext,
	params: MediaStorageAdapterListUploadPartsParams,
) => ServiceResponse<{
	uploadedParts: MediaStorageAdapterUploadPart[];
}>;

export type MediaStorageAdapterCompleteUploadSessionParams =
	| {
			protocol: "http";
			key: string;
	  }
	| {
			protocol: "multipart-parts";
			key: string;
			uploadId: string;
			parts: MediaStorageAdapterUploadPart[];
	  }
	| {
			protocol: "tus";
			key: string;
			uploadId?: string;
	  };

/** Finalize an upload and return its ETag when available. */
export type MediaStorageAdapterServiceCompleteUploadSession = (
	context: ServiceContext,
	params: MediaStorageAdapterCompleteUploadSessionParams,
) => ServiceResponse<{
	etag?: string | null;
}>;

export type MediaStorageAdapterAbortUploadSessionParams =
	| {
			protocol: "http";
			key: string;
	  }
	| {
			protocol: "multipart-parts";
			key: string;
			uploadId: string;
	  }
	| {
			protocol: "tus";
			key: string;
			uploadId?: string;
	  };

/** Abandon an upload and release unfinished provider resources. */
export type MediaStorageAdapterServiceAbortUploadSession = (
	context: ServiceContext,
	params: MediaStorageAdapterAbortUploadSessionParams,
) => ServiceResponse<undefined>;

export type MediaStorageAdapterGetDownloadUrlParams = {
	key: string;
	host: string;
	secretKey: string;
	fileName?: string | null;
	extension?: string | null;
};

/** Return a download URL for the requested storage key. */
export type MediaStorageAdapterServiceGetDownloadUrl = (
	context: ServiceContext,
	params: MediaStorageAdapterGetDownloadUrlParams,
) => ServiceResponse<{
	url: string;
}>;

export type MediaStorageAdapterGetMetaParams = {
	key: string;
};

/** Read stored file metadata and availability status. */
export type MediaStorageAdapterServiceGetMeta = (
	context: ServiceContext,
	params: MediaStorageAdapterGetMetaParams,
) => ServiceResponse<{
	/** File size in bytes. */
	size: number;
	mimeType: string | null;
	etag: string | null;
	status: MediaStatus;
	width?: number | null;
	height?: number | null;
	duration?: number | null;
	adapterReference?: string | null;
	adapterData?: MediaAdapterData | null;
}>;

export type MediaStorageAdapterStreamParams = {
	key: string;
	/** ETag to compare before returning file content. */
	ifNoneMatch?: string;
	/** Inclusive byte offsets to read. */
	range?: {
		/** First byte offset. */
		start: number;
		/** Last byte offset. Omission reads through the end of the file. */
		end?: number;
	};
};

/** Read a file, optionally honoring an ETag or byte range. Return content metadata alongside the body. */
export type MediaStorageAdapterServiceStream = (
	context: ServiceContext,
	params: MediaStorageAdapterStreamParams,
) => ServiceResponse<{
	contentLength: number | undefined;
	contentType: string | undefined;
	body: MediaStorageAdapterStreamBody;
	etag?: string | null;
	notModified?: boolean;
	isPartialContent?: boolean;
	totalSize?: number;
	/** Inclusive byte offsets to read. */
	range?: {
		/** First byte offset. */
		start: number;
		end: number;
	};
}>;

export type MediaStorageAdapterUploadSingleParams = {
	key: string;
	body: MediaStorageAdapterUploadBody;
	mimeType: string;
	extension: string;
	/** File size in bytes. */
	size: number;
	type: MediaType;
};

/** Upload the supplied bytes or stream under the requested storage key. */
export type MediaStorageAdapterServiceUploadSingle = (
	context: ServiceContext,
	params: MediaStorageAdapterUploadSingleParams,
) => ServiceResponse<{
	etag?: string;
}>;

export type MediaStorageAdapterDeleteSingleParams = {
	key: string;
};

export type MediaStorageAdapterServiceDeleteSingle = (
	context: ServiceContext,
	params: MediaStorageAdapterDeleteSingleParams,
) => ServiceResponse<undefined>;

export type MediaStorageAdapterDeleteMultipleParams = {
	keys: string[];
};

export type MediaStorageAdapterServiceDeleteMultiple = (
	context: ServiceContext,
	params: MediaStorageAdapterDeleteMultipleParams,
) => ServiceResponse<undefined>;

export type MediaStorageAdapterRenameKeyParams = {
	from: string;
	to: string;
};

export type MediaStorageAdapterServiceRenameKey = (
	context: ServiceContext,
	params: MediaStorageAdapterRenameKeyParams,
) => ServiceResponse<undefined>;

/** Factory that returns a configured adapter, synchronously or asynchronously. */
export type MediaStorageAdapter<T = undefined> = T extends undefined
	? () => MediaStorageAdapterInstance | Promise<MediaStorageAdapterInstance>
	: (
			options: T,
		) =>
			| MediaStorageAdapterInstance<T>
			| Promise<MediaStorageAdapterInstance<T>>;

/** Adapter contract used by Lucid. Use the context supplied to each operation for current request and transaction state. */
export type MediaStorageAdapterInstance<T = unknown> = {
	/** The adapter type */
	type: "media-storage-adapter";
	/** A unique identifier key for the adapter of this type */
	key: "file-system" | string;
	/**
	 * Lifecycle callbacks
	 * */
	lifecycle?: {
		/**
		 * Initialize the adapter
		 */
		init?: (context: AdapterLifecycleContext) => Promise<void>;
		/**
		 * Destroy the adapter
		 */
		destroy?: (context: AdapterLifecycleContext) => Promise<void>;
	};
	/** Create an upload session using one of Lucid's supported protocols. */
	createUploadSession: MediaStorageAdapterServiceCreateUploadSession;
	/** Generate upload URLs for multipart upload parts. */
	getUploadPartUrls?: MediaStorageAdapterServiceGetUploadPartUrls;
	/** List already uploaded multipart upload parts. */
	listUploadParts?: MediaStorageAdapterServiceListUploadParts;
	/** Complete or verify an adapter-managed upload session. */
	completeUploadSession?: MediaStorageAdapterServiceCompleteUploadSession;
	/** Abort an adapter-managed upload session. */
	abortUploadSession?: MediaStorageAdapterServiceAbortUploadSession;
	/** Generate a direct download URL */
	getDownloadUrl: MediaStorageAdapterServiceGetDownloadUrl;
	/** Get media metadata  */
	getMeta: MediaStorageAdapterServiceGetMeta;
	/** Stream media */
	stream: MediaStorageAdapterServiceStream;
	/** Upload media */
	upload: MediaStorageAdapterServiceUploadSingle;
	/** Delete media. Succeed when the object is already absent so cleanup can be retried. */
	delete: MediaStorageAdapterServiceDeleteSingle;
	/** Delete multiple media items */
	deleteMultiple: MediaStorageAdapterServiceDeleteMultiple;
	/** Rename a media key (copy then delete) */
	rename: MediaStorageAdapterServiceRenameKey;
	/** Get passed adapter options */
	getOptions?: () => T;
};

export type FileSystemStorageAdapterOptions = {
	/** The directory where the files will be uploaded. Defaults to "uploads" */
	uploadDir: string;
	/** Signs media URLs. Defaults to the final config's secrets.encryption value. */
	secretKey?: string;
};

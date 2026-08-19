import type { Readable } from "node:stream";
import type {
	MediaAdapterData,
	MediaStatus,
	MediaType,
	ServiceResponse,
} from "../../types.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

export type MediaStorageAdapterStreamBody =
	| Readable
	| ReadableStream<Uint8Array>
	| Uint8Array;

export type MediaStorageAdapterUploadBody =
	| Readable
	| ReadableStream<Uint8Array>
	| Buffer;

export type MediaStorageAdapterUploadPart = {
	partNumber: number;
	etag: string;
	size?: number;
};

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
	size: number;
};

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

export type MediaStorageAdapterServiceGetUploadPartUrls = (
	context: ServiceContext,
	params: MediaStorageAdapterGetUploadPartUrlsParams,
) => ServiceResponse<{
	parts: Array<{
		partNumber: number;
		url: string;
		headers?: Record<string, string>;
	}>;
}>;

export type MediaStorageAdapterListUploadPartsParams = {
	key: string;
	uploadId: string;
};

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

export type MediaStorageAdapterServiceGetDownloadUrl = (
	context: ServiceContext,
	params: MediaStorageAdapterGetDownloadUrlParams,
) => ServiceResponse<{
	url: string;
}>;

export type MediaStorageAdapterGetMetaParams = {
	key: string;
};

export type MediaStorageAdapterServiceGetMeta = (
	context: ServiceContext,
	params: MediaStorageAdapterGetMetaParams,
) => ServiceResponse<{
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
	ifNoneMatch?: string;
	range?: {
		start: number;
		end?: number;
	};
};

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
	range?: {
		start: number;
		end: number;
	};
}>;

export type MediaStorageAdapterUploadSingleParams = {
	key: string;
	body: MediaStorageAdapterUploadBody;
	mimeType: string;
	extension: string;
	size: number;
	type: MediaType;
};

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

export type MediaStorageAdapter<T = undefined> = T extends undefined
	? () => MediaStorageAdapterInstance | Promise<MediaStorageAdapterInstance>
	: (
			options: T,
		) =>
			| MediaStorageAdapterInstance<T>
			| Promise<MediaStorageAdapterInstance<T>>;

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
	/**
	 * The media storage adapter services
	 */
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
	/** Delete media */
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
	/** The secret key used to sign the URLs. Falls back to the configs keys.encryptionKey */
	secretKey: string;
};

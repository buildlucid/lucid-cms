import type { Readable } from "node:stream";
import type { TenantConfig } from "../../types/config.js";
import type { MediaType, ServiceResponse } from "../../types.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

export type MediaAdapterStreamBody =
	| Readable
	| ReadableStream<Uint8Array>
	| Uint8Array;

export type MediaAdapterUploadBody =
	| Readable
	| ReadableStream<Uint8Array>
	| Buffer;

export type MediaAdapterUploadPart = {
	partNumber: number;
	etag: string;
	size?: number;
};

/**
 * The tenant responsible for the media operation.
 * Adapters can use this to choose tenant-specific buckets, clients, or paths.
 */
export type MediaAdapterTenant = TenantConfig | null;

export type MediaAdapterCreateUploadSessionResponse =
	| {
			mode: "single";
			key: string;
			url: string;
			headers?: Record<string, string>;
	  }
	| {
			mode: "resumable";
			key: string;
			uploadId: string;
			partSize: number;
			expiresAt: string;
			uploadedParts: MediaAdapterUploadPart[];
	  };

export type MediaAdapterCreateUploadSessionParams = {
	key: string;
	host: string;
	secretKey: string;
	mimeType: string;
	extension?: string;
	size: number;
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceCreateUploadSession = (
	context: ServiceContext,
	params: MediaAdapterCreateUploadSessionParams,
) => ServiceResponse<MediaAdapterCreateUploadSessionResponse>;

export type MediaAdapterGetUploadPartUrlsParams = {
	key: string;
	uploadId: string;
	partNumbers: number[];
	expiresAt: string;
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceGetUploadPartUrls = (
	context: ServiceContext,
	params: MediaAdapterGetUploadPartUrlsParams,
) => ServiceResponse<{
	parts: Array<{
		partNumber: number;
		url: string;
		headers?: Record<string, string>;
	}>;
}>;

export type MediaAdapterListUploadPartsParams = {
	key: string;
	uploadId: string;
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceListUploadParts = (
	context: ServiceContext,
	params: MediaAdapterListUploadPartsParams,
) => ServiceResponse<{
	uploadedParts: MediaAdapterUploadPart[];
}>;

export type MediaAdapterCompleteUploadSessionParams = {
	key: string;
	uploadId: string;
	parts: MediaAdapterUploadPart[];
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceCompleteUploadSession = (
	context: ServiceContext,
	params: MediaAdapterCompleteUploadSessionParams,
) => ServiceResponse<{
	etag?: string | null;
}>;

export type MediaAdapterAbortUploadSessionParams = {
	key: string;
	uploadId: string;
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceAbortUploadSession = (
	context: ServiceContext,
	params: MediaAdapterAbortUploadSessionParams,
) => ServiceResponse<undefined>;

export type MediaAdapterGetDownloadUrlParams = {
	key: string;
	host: string;
	secretKey: string;
	fileName?: string | null;
	extension?: string | null;
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceGetDownloadUrl = (
	context: ServiceContext,
	params: MediaAdapterGetDownloadUrlParams,
) => ServiceResponse<{
	url: string;
}>;

export type MediaAdapterGetMetaParams = {
	key: string;
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceGetMeta = (
	context: ServiceContext,
	params: MediaAdapterGetMetaParams,
) => ServiceResponse<{
	size: number;
	mimeType: string | null;
	etag: string | null;
}>;

export type MediaAdapterStreamParams = {
	key: string;
	ifNoneMatch?: string;
	range?: {
		start: number;
		end?: number;
	};
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceStream = (
	context: ServiceContext,
	params: MediaAdapterStreamParams,
) => ServiceResponse<{
	contentLength: number | undefined;
	contentType: string | undefined;
	body: MediaAdapterStreamBody;
	etag?: string | null;
	notModified?: boolean;
	isPartialContent?: boolean;
	totalSize?: number;
	range?: {
		start: number;
		end: number;
	};
}>;

export type MediaAdapterUploadSingleParams = {
	key: string;
	body: MediaAdapterUploadBody;
	mimeType: string;
	extension: string;
	size: number;
	type: MediaType;
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceUploadSingle = (
	context: ServiceContext,
	params: MediaAdapterUploadSingleParams,
) => ServiceResponse<{
	etag?: string;
}>;

export type MediaAdapterDeleteSingleParams = {
	key: string;
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceDeleteSingle = (
	context: ServiceContext,
	params: MediaAdapterDeleteSingleParams,
) => ServiceResponse<undefined>;

export type MediaAdapterDeleteMultipleParams = {
	keys: string[];
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceDeleteMultiple = (
	context: ServiceContext,
	params: MediaAdapterDeleteMultipleParams,
) => ServiceResponse<undefined>;

export type MediaAdapterRenameKeyParams = {
	from: string;
	to: string;
	tenant: MediaAdapterTenant;
};

export type MediaAdapterServiceRenameKey = (
	context: ServiceContext,
	params: MediaAdapterRenameKeyParams,
) => ServiceResponse<undefined>;

export type MediaAdapter<T = undefined> = T extends undefined
	? () => MediaAdapterInstance | Promise<MediaAdapterInstance>
	: (options: T) => MediaAdapterInstance<T> | Promise<MediaAdapterInstance<T>>;

// biome-ignore lint/suspicious/noExplicitAny: explanation
export type MediaAdapterInstance<T = any> = {
	/** The adapter type */
	type: "media-adapter";
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
	 * The media adapter services
	 */
	/** Create a single or resumable upload session */
	createUploadSession: MediaAdapterServiceCreateUploadSession;
	/** Generate upload URLs for resumable upload parts */
	getUploadPartUrls?: MediaAdapterServiceGetUploadPartUrls;
	/** List already uploaded resumable upload parts */
	listUploadParts?: MediaAdapterServiceListUploadParts;
	/** Complete a resumable upload session */
	completeUploadSession?: MediaAdapterServiceCompleteUploadSession;
	/** Abort a resumable upload session */
	abortUploadSession?: MediaAdapterServiceAbortUploadSession;
	/** Generate a direct download URL */
	getDownloadUrl: MediaAdapterServiceGetDownloadUrl;
	/** Get media metadata  */
	getMeta: MediaAdapterServiceGetMeta;
	/** Stream media */
	stream: MediaAdapterServiceStream;
	/** Upload media */
	upload: MediaAdapterServiceUploadSingle;
	/** Delete media */
	delete: MediaAdapterServiceDeleteSingle;
	/** Delete multiple media items */
	deleteMultiple: MediaAdapterServiceDeleteMultiple;
	/** Rename a media key (copy then delete) */
	rename: MediaAdapterServiceRenameKey;
	/** Get passed adapter options */
	getOptions?: () => T;
};

export type FileSystemMediaAdapterOptions = {
	/** The directory where the files will be uploaded. Defaults to "uploads" */
	uploadDir: string;
	/** The secret key used to sign the URLs. Falls back to the configs keys.encryptionKey */
	secretKey: string;
};

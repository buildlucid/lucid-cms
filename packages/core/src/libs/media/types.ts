import type { Readable } from "node:stream";
import type { TenantConfig } from "../../types/config.js";
import type { MediaType, ServiceResponse } from "../../types.js";
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

/**
 * Shared operation context passed to every adapter service.
 * This keeps request scope separate from file metadata and service options.
 */
export type MediaAdapterServiceContext = {
	tenant: MediaAdapterTenant;
};

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

export type MediaAdapterServiceCreateUploadSession = (props: {
	key: string;
	meta: {
		host: string;
		secretKey: string;
		mimeType: string;
		extension?: string;
		size: number;
	};
	context: MediaAdapterServiceContext;
}) => ServiceResponse<MediaAdapterCreateUploadSessionResponse>;

export type MediaAdapterServiceGetUploadPartUrls = (props: {
	key: string;
	uploadId: string;
	partNumbers: number[];
	expiresAt: string;
	context: MediaAdapterServiceContext;
}) => ServiceResponse<{
	parts: Array<{
		partNumber: number;
		url: string;
		headers?: Record<string, string>;
	}>;
}>;

export type MediaAdapterServiceListUploadParts = (props: {
	key: string;
	uploadId: string;
	context: MediaAdapterServiceContext;
}) => ServiceResponse<{
	uploadedParts: MediaAdapterUploadPart[];
}>;

export type MediaAdapterServiceCompleteUploadSession = (props: {
	key: string;
	uploadId: string;
	parts: MediaAdapterUploadPart[];
	context: MediaAdapterServiceContext;
}) => ServiceResponse<{
	etag?: string | null;
}>;

export type MediaAdapterServiceAbortUploadSession = (props: {
	key: string;
	uploadId: string;
	context: MediaAdapterServiceContext;
}) => ServiceResponse<undefined>;

export type MediaAdapterServiceGetDownloadUrl = (props: {
	key: string;
	meta: {
		host: string;
		secretKey: string;
		fileName?: string | null;
		extension?: string | null;
	};
	context: MediaAdapterServiceContext;
}) => ServiceResponse<{
	url: string;
}>;

export type MediaAdapterServiceGetMeta = (props: {
	key: string;
	context: MediaAdapterServiceContext;
}) => ServiceResponse<{
	size: number;
	mimeType: string | null;
	etag: string | null;
}>;

export type MediaAdapterServiceStream = (props: {
	key: string;
	ifNoneMatch?: string;
	range?: {
		start: number;
		end?: number;
	};
	context: MediaAdapterServiceContext;
}) => ServiceResponse<{
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

export type MediaAdapterServiceUploadSingle = (props: {
	key: string;
	data: MediaAdapterUploadBody;
	meta: {
		mimeType: string;
		extension: string;
		size: number;
		type: MediaType;
	};
	context: MediaAdapterServiceContext;
}) => ServiceResponse<{
	etag?: string;
}>;

export type MediaAdapterServiceDeleteSingle = (props: {
	key: string;
	context: MediaAdapterServiceContext;
}) => ServiceResponse<undefined>;

export type MediaAdapterServiceDeleteMultiple = (props: {
	keys: string[];
	context: MediaAdapterServiceContext;
}) => ServiceResponse<undefined>;

export type MediaAdapterServiceRenameKey = (props: {
	from: string;
	to: string;
	context: MediaAdapterServiceContext;
}) => ServiceResponse<undefined>;

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

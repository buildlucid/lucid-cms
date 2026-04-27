import type { Readable } from "node:stream";
import type { MediaType, ServiceResponse } from "../../types.js";

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

export type MediaAdapterServiceCreateUploadSession = (
	key: string,
	meta: {
		host: string;
		secretKey: string;
		mimeType: string;
		extension?: string;
		size: number;
	},
) => ServiceResponse<MediaAdapterCreateUploadSessionResponse>;

export type MediaAdapterServiceGetUploadPartUrls = (props: {
	key: string;
	uploadId: string;
	partNumbers: number[];
	expiresAt: string;
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
}) => ServiceResponse<{
	uploadedParts: MediaAdapterUploadPart[];
}>;

export type MediaAdapterServiceCompleteUploadSession = (props: {
	key: string;
	uploadId: string;
	parts: MediaAdapterUploadPart[];
}) => ServiceResponse<{
	etag?: string | null;
}>;

export type MediaAdapterServiceAbortUploadSession = (props: {
	key: string;
	uploadId: string;
}) => ServiceResponse<undefined>;

export type MediaAdapterServiceGetDownloadUrl = (
	key: string,
	meta: {
		host: string;
		secretKey: string;
		fileName?: string | null;
		extension?: string | null;
	},
) => ServiceResponse<{
	url: string;
}>;

export type MediaAdapterServiceGetMeta = (key: string) => ServiceResponse<{
	size: number;
	mimeType: string | null;
	etag: string | null;
}>;

export type MediaAdapterServiceStream = (
	key: string,
	options?: {
		ifNoneMatch?: string;
		range?: {
			start: number;
			end?: number;
		};
	},
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

export type MediaAdapterServiceUploadSingle = (props: {
	key: string;
	data: MediaAdapterUploadBody;
	meta: {
		mimeType: string;
		extension: string;
		size: number;
		type: MediaType;
	};
}) => ServiceResponse<{
	etag?: string;
}>;

export type MediaAdapterServiceDeleteSingle = (
	key: string,
) => ServiceResponse<undefined>;

export type MediaAdapterServiceDeleteMultiple = (
	keys: string[],
) => ServiceResponse<undefined>;

export type MediaAdapterServiceRenameKey = (props: {
	from: string;
	to: string;
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
		init?: () => Promise<void>;
		/**
		 * Destroy the adapter
		 */
		destroy?: () => Promise<void>;
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

import type { Readable } from "node:stream";
import type { MediaType, ServiceResponse } from "../../types.js";

export type MediaAdapterServiceGetPresignedUrl = (
	key: string,
	meta: {
		host: string;
		mimeType: string;
		extension?: string;
	},
) => ServiceResponse<{
	url: string;
	headers?: Record<string, string>;
}>;

export type MediaAdapterServiceGetMeta = (key: string) => ServiceResponse<{
	size: number;
	mimeType: string | null;
	etag: string | null;
}>;

export type MediaAdapterServiceStream = (
	key: string,
	options?: {
		range?: {
			start: number;
			end?: number;
		};
	},
) => ServiceResponse<{
	contentLength: number | undefined;
	contentType: string | undefined;
	body: Readable;
	isPartialContent?: boolean;
	totalSize?: number;
	range?: {
		start: number;
		end: number;
	};
}>;

export type MediaAdapterServiceUploadSingle = (props: {
	key: string;
	data: Readable | Buffer;
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

export type MediaAdapter = () =>
	| MediaAdapterInstance
	| Promise<MediaAdapterInstance>;

export type MediaAdapterInstance = {
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
	services: {
		/** Generate a presigned URL */
		getPresignedUrl: MediaAdapterServiceGetPresignedUrl;
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
	};
};

export type MediaAdapterFileSystemOptions = {
	/** The directory where the files will be uploaded */
	uploadDir: string;
	/** The secret key used to sign the URLs */
	secretKey: string;
};

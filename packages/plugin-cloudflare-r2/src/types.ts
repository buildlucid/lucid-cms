/// <reference types="@cloudflare/workers-types" />

/** S3 HTTP access used alongside the R2 binding. */
export type HttpOptions = {
	/** S3-compatible API endpoint, including protocol. */
	endpoint: string;
	/** Bucket name used to store media. */
	bucket: string;
	/** Credentials and signing options for S3 HTTP requests. */
	clientOptions: {
		/** Access key ID with permission to read and write this bucket. */
		accessKeyId: string;
		/** Secret access key. Keep it in server environment variables. */
		secretAccessKey: string;
		/** Session token for temporary credentials. */
		sessionToken?: string;
		/** AWS signing service override. */
		service?: string;
		/** AWS signing region. */
		region?: string;
		/** Shared cache for signing keys. */
		cache?: Map<string, ArrayBuffer>;
		/** Maximum HTTP retries performed by the signing client. */
		retries?: number;
		/** Initial retry delay in milliseconds. */
		initRetryMs?: number;
	};
};

/** R2 bucket bindings, optional HTTP credentials and upload metadata. */
export type PluginOptions = {
	/**
	 * Cloudflare R2 binding name. Defaults to "LUCID_MEDIA_BUCKET".
	 */
	binding?: string;
	/**
	 * Wrangler R2 bucket name. Defaults to a generated name based on the worker
	 * and binding.
	 */
	bucketName?: string;
	/**
	 * Wrangler R2 preview bucket name.
	 */
	previewBucketName?: string;
	/** HTTP credentials for operations that need signed S3 requests. */
	http?: HttpOptions;
	/** Metadata and storage class applied to uploaded objects. */
	upload?: {
		/** Response metadata stored with each object. */
		httpMetadata?: Pick<
			R2HTTPMetadata,
			| "cacheControl"
			| "contentDisposition"
			| "contentEncoding"
			| "contentLanguage"
		>;
		/** Application metadata stored with each object. */
		customMetadata?: Record<string, string>;
		/** R2 storage class for uploads. */
		storageClass?: string;
	};
};

/// <reference types="@cloudflare/workers-types" />

export type HttpOptions = {
	endpoint: string;
	bucket: string;
	clientOptions: {
		accessKeyId: string;
		secretAccessKey: string;
		sessionToken?: string;
		service?: string;
		region?: string;
		cache?: Map<string, ArrayBuffer>;
		retries?: number;
		initRetryMs?: number;
	};
};

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
	http?: HttpOptions;
	upload?: {
		httpMetadata?: Pick<
			R2HTTPMetadata,
			| "cacheControl"
			| "contentDisposition"
			| "contentEncoding"
			| "contentLanguage"
		>;
		customMetadata?: Record<string, string>;
		storageClass?: string;
	};
};

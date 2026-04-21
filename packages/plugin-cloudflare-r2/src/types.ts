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
	binding: R2Bucket;
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

export type PluginOptions = {
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

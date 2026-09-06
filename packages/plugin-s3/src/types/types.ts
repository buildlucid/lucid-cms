/** S3-compatible bucket and signing credentials. */
export type PluginOptions = {
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

/// <reference types="@cloudflare/workers-types" />

export type PluginOptions = {
	/**
	 * Cloudflare Queue binding name. Defaults to "LUCID_QUEUE".
	 */
	binding?: string;
	/**
	 * The maximum number of attempts to retry a job. Defaults to 3.
	 */
	maxRetries?: number;
	/**
	 * The base delay in seconds for the exponential backoff. Defaults to 30 seconds.
	 */
	baseDelaySeconds?: number;
};

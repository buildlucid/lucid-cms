/// <reference types="@cloudflare/workers-types" />

export type PluginOptions = {
	/**
	 * Cloudflare Queue binding name. Defaults to "LUCID_QUEUE".
	 */
	binding?: string;
	/**
	 * Wrangler Queue name. Defaults to a generated name based on the worker and
	 * binding.
	 */
	queueName?: string;
	/**
	 * Wrangler Queue consumer options.
	 */
	consumer?: {
		maxBatchSize?: number;
		maxRetries?: number;
		maxConcurrency?: number;
	};
	/**
	 * The maximum number of attempts to retry a job. Defaults to 3.
	 */
	maxRetries?: number;
	/**
	 * The base delay in seconds for the exponential backoff. Defaults to 30 seconds.
	 */
	baseDelaySeconds?: number;
};

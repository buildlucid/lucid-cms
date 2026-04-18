/// <reference types="@cloudflare/workers-types" />

export type PluginOptions = {
	/**
	 * The queue binding to use.
	 */
	binding: Queue;
	/**
	 * The maximum number of attempts to retry a job. Defaults to 3.
	 *
	 * If in your wrangler config you have set `max_retries`, then keep this value in sync with it.
	 */
	maxRetries?: number;
	/**
	 * The base delay in seconds for the exponential backoff. Defaults to 30 seconds.
	 */
	baseDelaySeconds?: number;
};

import type { Queue } from "@cloudflare/workers-types";

export type PluginOptions = {
	/**
	 * The queue binding to use.
	 */
	binding: Queue;
	/**
	 * Determines whether the queue consumer should be bundled with the main worker or generated as a separate worker.
	 * If "inline", the consumer will be bundled with the main worker.
	 * If "separate", the consumer will be generated as a separate worker.
	 */
	consumer?: "inline" | "separate";
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

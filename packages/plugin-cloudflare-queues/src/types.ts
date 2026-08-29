/// <reference types="@cloudflare/workers-types" />

/** Configures the Cloudflare Queue binding and consumer. */
export type PluginOptions = {
	/** Cloudflare Queue binding name. */
	binding?: string;
	/** Wrangler Queue name. Defaults to a name derived from the worker and binding. */
	queueName?: string;
	/** Wrangler Queue consumer options. */
	consumer?: {
		/** Maximum messages Cloudflare delivers in one batch. */
		maxBatchSize?: number;
		/** Maximum delivery retries managed by Cloudflare. */
		maxRetries?: number;
		/** Maximum concurrent Cloudflare consumer invocations. */
		maxConcurrency?: number;
	};
};

import type { Queue } from "@cloudflare/workers-types";

export type PluginOptions = {
	binding: Queue;
	/**
	 * Determines whether the queue consumer should be bundled with the main worker or generated as a separate worker.
	 * If "inline", the consumer will be bundled with the main worker.
	 * If "separate", the consumer will be generated as a separate worker.
	 */
	consumer?: "inline" | "separate";
	maxAttempts?: number;
};

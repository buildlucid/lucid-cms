import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import inlineQueueAdapter from "./adapters/inline.js";
import type { QueueAdapterInstance } from "./types.js";

/** Resolves the configured queue adapter, using inline execution when omitted. */
const getQueueAdapter = async (
	config: Pick<ResolvedLucidConfig, "queue">,
): Promise<QueueAdapterInstance> => {
	try {
		if (!config.queue.adapter) return inlineQueueAdapter();
		return await (typeof config.queue.adapter === "function"
			? config.queue.adapter()
			: config.queue.adapter);
	} catch (error) {
		if (error instanceof LucidError) throw error;
		throw new LucidError({
			message: "The configured queue adapter could not be initialized.",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
	}
};

export default getQueueAdapter;

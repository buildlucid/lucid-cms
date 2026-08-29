import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import inlineQueueAdapter from "./adapters/inline.js";
import { isQueueAdapterInstance, type QueueAdapterInstance } from "./types.js";

/** Resolves the configured queue adapter, falling back to inline execution. */
const getQueueAdapter = async (
	config: Pick<Config, "queue">,
): Promise<QueueAdapterInstance> => {
	try {
		if (!config.queue.adapter) return inlineQueueAdapter();
		const resolved = await (typeof config.queue.adapter === "function"
			? config.queue.adapter()
			: config.queue.adapter);
		if (isQueueAdapterInstance(resolved)) return resolved;

		logger.error({
			event: "queue-adapter.initialization.failed",
			scope: constants.logScopes.queueAdapter,
			message:
				"The configured queue adapter is invalid. Falling back to inline job execution.",
		});
		return inlineQueueAdapter();
	} catch (error) {
		logger.error({
			error,
			event: "queue-adapter.initialization.failed",
			scope: constants.logScopes.queueAdapter,
			message:
				"Failed to initialize the queue adapter. Falling back to inline job execution.",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
		return inlineQueueAdapter();
	}
};

export default getQueueAdapter;

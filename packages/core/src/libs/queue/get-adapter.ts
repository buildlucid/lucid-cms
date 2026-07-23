import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import type { AdapterRuntimeContext } from "../runtime/types.js";
import passthroughQueueAdapter from "./adapters/passthrough.js";
import type { QueueAdapterInstance } from "./types.js";

const getQueueAdapter = async (
	config: Config,
	_runtimeContext?: AdapterRuntimeContext,
): Promise<QueueAdapterInstance> => {
	try {
		if (config.queue?.adapter) {
			const adapter =
				typeof config.queue.adapter === "function"
					? await config.queue.adapter()
					: config.queue.adapter;

			return await adapter;
		}

		return passthroughQueueAdapter();
	} catch (error) {
		logger.error({
			error,
			event: "queue-adapter.initialization.failed",
			scope: constants.logScopes.queueAdapter,
			message: "Failed to initialize queue adapter",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
		return passthroughQueueAdapter();
	}
};

export default getQueueAdapter;

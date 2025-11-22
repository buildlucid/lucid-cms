import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import type { AdapterRuntimeContext } from "../runtime-adapter/types.js";
import passthroughQueueAdapter from "./adapters/passthrough.js";
import type { QueueAdapterInstance } from "./types.js";

const getQueueAdapter = async (
	config: Config,
	runtimeContext: AdapterRuntimeContext,
): Promise<QueueAdapterInstance> => {
	try {
		if (config.queue?.adapter) {
			const adapter =
				typeof config.queue.adapter === "function"
					? await config.queue.adapter()
					: config.queue.adapter;

			return await adapter;
		}

		if (!runtimeContext.configEntryPoint) {
			return passthroughQueueAdapter();
		}

		const { default: workerQueueAdapter } = await import(
			"./adapters/worker/index.js"
		);
		return workerQueueAdapter();
	} catch (error) {
		logger.error({
			scope: constants.logScopes.queueAdapter,
			message:
				error instanceof Error
					? error.message
					: "Failed to initialize queue adapter",
		});
		return passthroughQueueAdapter();
	}
};

export default getQueueAdapter;

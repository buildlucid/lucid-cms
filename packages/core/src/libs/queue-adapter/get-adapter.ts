import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughQueueAdapter from "./adapters/passthrough.js";
import createQueueContext from "./create-context.js";
import type { QueueAdapterFactory, QueueAdapterInstance } from "./types.js";

const getQueueAdapter = async (
	config: Config,
): Promise<QueueAdapterInstance> => {
	const queueContext = createQueueContext();
	try {
		if (config.queue?.adapter) {
			return await config.queue.adapter(queueContext);
		}

		const { default: workerQueueAdapter } = await import(
			"./adapters/worker/index.js"
		);
		return workerQueueAdapter()(queueContext);
	} catch (error) {
		logger.error({
			scope: constants.logScopes.queue,
			message:
				error instanceof Error
					? error.message
					: "Failed to initialize queue adapter",
		});
		return passthroughQueueAdapter()(queueContext);
	}
};

export default getQueueAdapter;

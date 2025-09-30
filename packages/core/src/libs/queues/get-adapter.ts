import passthroughQueueAdapter from "./adapters/passthrough.js";
import type { QueueAdapterInstance } from "./types.js";
import createQueueContext from "./create-context.js";
import type { Config } from "../../types/config.js";

const getQueueAdapter = async (
	config: Config,
): Promise<QueueAdapterInstance> => {
	const queueContext = createQueueContext();
	try {
		if (config.queue?.adapter) {
			return config.queue?.adapter(queueContext);
		}

		const { default: workerQueueAdapter } = await import(
			"./adapters/worker.js"
		);
		return workerQueueAdapter(queueContext);
	} catch (error) {
		return passthroughQueueAdapter(queueContext);
	}
};

export default getQueueAdapter;

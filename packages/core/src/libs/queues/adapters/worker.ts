import type { QueueAdapter } from "../types.js";
import { Worker } from "node:worker_threads";
import logger from "../../logger/index.js";

/**
 * The worker queue adapter
 */
const workerQueueAdapter: QueueAdapter = (context) => {
	let worker: Worker | null = null;

	return {
		key: "worker-queue-adapter",
		start: async () => {
			logger.debug({
				message: "The worker queue has started",
				scope: context.logScope,
			});
			const workerUrl = new URL(
				"./libs/queues/worker/consumer.js",
				import.meta.url,
			);
			worker = new Worker(workerUrl);
		},
		add: async (event, data) => {
			logger.info({
				message: "Adding job to the worker queue",
				scope: context.logScope,
				data: { event, data },
			});
		},
	};
};

export default workerQueueAdapter;

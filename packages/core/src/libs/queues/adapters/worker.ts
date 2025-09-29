import type { QueueAdapter } from "../types.js";
import { Worker } from "node:worker_threads";
import logger from "../../logger/index.js";

const ADAPTER_KEY = "worker-queue-adapter";

/**
 * The worker queue adapter
 */
const workerQueueAdapter: QueueAdapter = (context) => {
	let worker: Worker | null = null;

	return {
		key: ADAPTER_KEY,
		lifecycle: {
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
			kill: async () => {
				if (worker) {
					worker.terminate();
				}
			},
		},
		add: async (event, data, options) => {
			if (!worker) {
				return {
					error: { message: "Worker queue is not started" },
					data: undefined,
				};
			}

			logger.info({
				message: "Adding job to the worker queue",
				scope: context.logScope,
				data: { event, data },
			});

			const jobResponse = await context.insertJob(event, data, {
				queueAdapterKey: ADAPTER_KEY,
				...options,
			});
			if (jobResponse.error) return jobResponse;

			return jobResponse;
		},
	};
};

export default workerQueueAdapter;

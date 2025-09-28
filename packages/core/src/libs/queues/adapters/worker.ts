import type { QueueAdapter } from "../types.js";
import { Worker } from "node:worker_threads";

/**
 * The worker queue adapter
 */
const workerQueueAdapter: QueueAdapter = (context) => {
	let worker: Worker | null = null;

	return {
		key: "worker-queue-adapter",
		start: async () => {
			context.log("The queue has started");
			const workerUrl = new URL(
				"./libs/queues/worker/consumer.js",
				import.meta.url,
			);
			worker = new Worker(workerUrl);
		},
		add: async (event, data) => {
			context.log("Adding event to the queue", { event, data });
		},
	};
};

export default workerQueueAdapter;

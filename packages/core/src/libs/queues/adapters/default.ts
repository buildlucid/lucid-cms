import type { QueueAdapter } from "../types.js";

/**
 * The default queue adapter
 */
const defaultQueueAdapter: QueueAdapter = (context) => {
	return {
		key: "default-queue-adapter",
		start: async () => {
			context.log("The queue has started");
		},
		add: async (event, data) => {
			context.log("Adding event to the queue", { event, data });
		},
	};
};

export default defaultQueueAdapter;

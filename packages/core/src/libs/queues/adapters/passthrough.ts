import type { QueueAdapter } from "../types.js";

/**
 * A passthrough queue adapter that will only mock the queue, and execute the event handlers immediately
 */
const passthroughQueueAdapter: QueueAdapter = (context) => {
	return {
		key: "passthrough-queue-adapter",
		start: async () => {
			context.log("The queue has started");
		},
		add: async (event, data) => {
			context.log("Adding event to the queue", { event, data });
		},
	};
};

export default passthroughQueueAdapter;

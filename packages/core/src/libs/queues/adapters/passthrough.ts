import type { QueueAdapter } from "../types.js";
import logger from "../../logger/index.js";

/**
 * A passthrough queue adapter that will only mock the queue, and execute the event handlers immediately
 */
const passthroughQueueAdapter: QueueAdapter = (context) => {
	return {
		key: "passthrough-queue-adapter",
		start: async () => {
			logger.debug({
				message: "The passthrough queue has started",
				scope: context.logScope,
			});
		},
		add: async (event, data) => {
			logger.info({
				message: "Adding job to the passthrough queue",
				scope: context.logScope,
				data: { event, data },
			});
		},
	};
};

export default passthroughQueueAdapter;

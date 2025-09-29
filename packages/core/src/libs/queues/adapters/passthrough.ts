import type { QueueAdapter } from "../types.js";
import logger from "../../logger/index.js";

const ADAPTER_KEY = "passthrough-queue-adapter";

/**
 * A passthrough queue adapter that will only mock the queue, and execute the event handlers immediately
 */
const passthroughQueueAdapter: QueueAdapter<{
	/** Bypasses the immediate execution of the event handlers */
	bypassImmediateExecution?: boolean;
}> = (context, adapter) => ({
	key: ADAPTER_KEY,
	lifecycle: {
		start: async () => {
			logger.debug({
				message: "The passthrough queue has started",
				scope: context.logScope,
			});
		},
		kill: async () => {
			logger.debug({
				message: "The passthrough queue has stopped",
				scope: context.logScope,
			});
		},
	},
	add: async (event, data) => {
		logger.info({
			message: "Adding job to the passthrough queue",
			scope: context.logScope,
			data: { event, data },
		});

		//* insert event into the database and KV
		const jobResponse = await context.insertJobToDB(event, data, {
			queueAdapterKey: ADAPTER_KEY,
		});
		if (jobResponse.error) return jobResponse;

		//* skip immediate execution
		if (adapter?.bypassImmediateExecution) {
			return jobResponse;
		}

		//* execute the event handler immediately
		const eventHandlers = context.getEventHandlers();

		return jobResponse;
	},
});

export default passthroughQueueAdapter;

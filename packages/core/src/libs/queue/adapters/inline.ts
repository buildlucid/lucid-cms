import constants from "../../../constants/constants.js";
import logger from "../../logger/index.js";
import { consumeJob } from "../jobs/consume-job.js";
import type { QueueAdapterInstance } from "../types.js";

const CONCURRENT_LIMIT = 4;

/** Executes durable jobs in-process after their surrounding transaction commits. */
const inlineQueueAdapter = (): QueueAdapterInstance => ({
	type: "queue-adapter",
	key: "inline",
	support: { scheduling: false, maxDelayMs: null },
	lifecycle: {
		init: async () => {
			logger.debug({
				message: "The inline job adapter has started",
				scope: constants.logScopes.queueAdapter,
			});
		},
		destroy: async () => {
			logger.debug({
				message: "The inline job adapter has stopped",
				scope: constants.logScopes.queueAdapter,
			});
		},
	},
	publish: async (context, messages) => {
		for (let index = 0; index < messages.length; index += CONCURRENT_LIMIT) {
			await Promise.all(
				messages.slice(index, index + CONCURRENT_LIMIT).map((message) =>
					consumeJob(context, {
						jobId: message.jobId,
						retry: "immediate",
					}),
				),
			);
		}
	},
});

export default inlineQueueAdapter;

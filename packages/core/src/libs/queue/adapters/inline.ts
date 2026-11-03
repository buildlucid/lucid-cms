import constants from "../../../constants/constants.js";
import { copy } from "../../i18n/index.js";
import { consumeJob } from "../../jobs/consume/index.js";
import logger from "../../logger/index.js";
import type { QueueAdapterInstance } from "../types.js";

const CONCURRENT_LIMIT = 4;

/** Runs jobs in-process after commit. Retries resume on a scheduler tick after their backoff. */
const inlineQueueAdapter = (): QueueAdapterInstance => ({
	type: "queue-adapter",
	key: "inline",
	support: { delayedDelivery: false },
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
			const results = await Promise.all(
				messages
					.slice(index, index + CONCURRENT_LIMIT)
					.map((message) => consumeJob(context, { jobId: message.jobId })),
			);
			if (results.some((result) => result.type === "retry-transport")) {
				return {
					error: {
						message: copy("server:core.queue.inline.consume.failed"),
					},
					data: undefined,
				};
			}
		}
		return { error: undefined, data: undefined };
	},
});

export default inlineQueueAdapter;

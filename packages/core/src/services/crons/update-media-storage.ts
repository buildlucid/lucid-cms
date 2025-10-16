import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Queues a job to recalculate the media storage usage
 */
const updateMediaStorage: ServiceFn<[], undefined> = async (context) => {
	const queueRes = await context.queue.command.add("media:update-storage", {
		payload: {},
		serviceContext: context,
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateMediaStorage;

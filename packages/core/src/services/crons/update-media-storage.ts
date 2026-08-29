import { enqueueJob } from "../../libs/queue/jobs/enqueue-job.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { updateMediaStorageJob } from "../media/jobs/update-storage.js";

/**
 * Queues a job to recalculate the media storage usage
 */
const updateMediaStorage: ServiceFn<[], undefined> = async (context) => {
	const queueRes = await enqueueJob(context, {
		job: updateMediaStorageJob,
		payload: {},
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateMediaStorage;

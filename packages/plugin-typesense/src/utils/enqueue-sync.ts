import type {
	CoreToolkit,
	JobReceipt,
	ServiceResponse,
} from "@lucidcms/core/types";
import type { SyncJob } from "../jobs/types.js";

/** Wakes a worker for persisted changes. The work table combines repeated IDs. */
const enqueueSync = (data: {
	toolkit: CoreToolkit;
	indexKey: string;
	job: SyncJob;
}): ServiceResponse<JobReceipt> =>
	data.toolkit.jobs.enqueueJob({
		job: data.job,
		payload: { index: data.indexKey },
	});

export default enqueueSync;

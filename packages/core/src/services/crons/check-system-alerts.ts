import { getAlertConfigs } from "../../libs/alerts/alert-map.js";
import { executeAlertJob } from "../../libs/alerts/execute-alert.js";
import { enqueueJobs } from "../../libs/queue/jobs/enqueue-jobs.js";
import type { JobInput } from "../../libs/queue/types.js";
import type { ServiceFn } from "../../utils/services/types.js";

const checkSystemAlerts: ServiceFn<[], undefined> = async (context) => {
	const payload: JobInput<typeof executeAlertJob>[] = [];
	for (const config of getAlertConfigs()) {
		if (!config.nightly) continue;
		payload.push({
			key: config.key,
			source: "cron",
			trigger: "scheduled",
			metadata: {},
		});
	}

	const queueRes = await enqueueJobs(context, {
		job: executeAlertJob,
		payload,
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkSystemAlerts;

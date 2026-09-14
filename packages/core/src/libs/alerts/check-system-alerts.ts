import z from "zod";
import defineJob from "../jobs/define-job.js";
import { enqueueJobs } from "../jobs/enqueue.js";
import type { JobHandler, JobInput } from "../jobs/types.js";
import { getAlertConfigs } from "./alert-map.js";
import { executeAlertJob } from "./execute-alert.js";

const checkSystemAlerts: JobHandler = async ({ context }) => {
	const payload: JobInput<typeof executeAlertJob>[] = [];
	for (const config of getAlertConfigs()) {
		if (!config.nightly) continue;
		payload.push({
			key: config.key,
			source: "schedule",
			trigger: "scheduled",
			metadata: {},
		});
	}

	const queueRes = await enqueueJobs(context, {
		job: executeAlertJob,
		payload,
	});
	if (queueRes.error) return queueRes;

	return { error: undefined, data: undefined };
};

/** Queues an alert job for every alert that opts into the nightly check. */
export const checkSystemAlertsJob = defineJob({
	name: "core:check-system-alerts",
	version: 1,
	input: z.null(),
	schedules: [
		{
			name: "automatic",
			cron: "0 0 * * *",
			timezone: "UTC",
			input: null,
		},
	],
	handler: checkSystemAlerts,
});

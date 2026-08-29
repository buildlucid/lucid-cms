import { jobsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { QueueJobsRepository } from "../../libs/repositories/index.js";
import type { Job } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	Job
> = async (context, data) => {
	const Jobs = new QueueJobsRepository(context.db);

	const jobRes = await Jobs.selectSingleById({
		select: [
			"id",
			"job_id",
			"job_name",
			"job_version",
			"display_data",
			"queue_adapter_key",
			"status",
			"attempts",
			"max_attempts",
			"dispatch_status",
			"dispatch_attempts",
			"dispatch_error",
			"error_message",
			"created_at",
			"available_at",
			"started_at",
			"completed_at",
			"failed_at",
			"cancelled_at",
			"dispatched_at",
			"lease_expires_at",
			"created_by_user_id",
			"updated_at",
		],
		id: data.id,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.job.not.found.message"),
				status: 404,
			},
		},
	});
	if (jobRes.error) return jobRes;

	return {
		error: undefined,
		data: jobsFormatter.formatSingle({
			job: jobRes.data,
		}),
	};
};

export default getSingle;

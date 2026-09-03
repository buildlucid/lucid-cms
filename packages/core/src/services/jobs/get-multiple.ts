import formatter, { jobsFormatter } from "../../libs/formatters/index.js";
import { JobsRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/jobs.js";
import type { Job } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
		},
	],
	{
		data: Job[];
		count: number;
	}
> = async (context, data) => {
	const Jobs = new JobsRepository(context.db);

	const jobsRes = await Jobs.selectMultipleFilteredFixed({
		select: [
			"id",
			"job_id",
			"job_name",
			"job_version",
			"trigger_type",
			"schedule_key",
			"scheduled_for",
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
		queryParams: data.query,
		validation: {
			enabled: true,
		},
	});
	if (jobsRes.error) return jobsRes;

	return {
		error: undefined,
		data: {
			data: jobsFormatter.formatMultiple({
				jobs: jobsRes.data[0],
			}),
			count: formatter.parseCount(jobsRes.data[1]?.count),
		},
	};
};

export default getMultiple;

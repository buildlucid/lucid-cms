import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { JobResponse } from "../../types/response.js";
import type { GetMultipleQueryParams } from "../../schemas/jobs.js";

const getMultiple: ServiceFn<
	[
		{
			query: GetMultipleQueryParams;
		},
	],
	{
		data: JobResponse[];
		count: number;
	}
> = async (context, data) => {
	const Jobs = Repository.get("queue-jobs", context.db, context.config.db);
	const JobsFormatter = Formatter.get("jobs");

	const jobsRes = await Jobs.selectMultipleFiltered({
		select: [
			"id",
			"job_id",
			"event_type",
			"event_data",
			"queue_adapter_key",
			"status",
			"priority",
			"attempts",
			"max_attempts",
			"error_message",
			"created_at",
			"scheduled_for",
			"started_at",
			"completed_at",
			"failed_at",
			"next_retry_at",
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
			data: JobsFormatter.formatMultiple({
				jobs: jobsRes.data[0],
			}),
			count: Formatter.parseCount(jobsRes.data[1]?.count),
		},
	};
};

export default getMultiple;

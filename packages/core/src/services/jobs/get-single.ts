import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { JobResponse } from "../../types/response.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	JobResponse
> = async (context, data) => {
	const Jobs = Repository.get("queue-jobs", context.db, context.config.db);
	const JobsFormatter = Formatter.get("jobs");

	const jobRes = await Jobs.selectSingle({
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
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("job_not_found_message"),
				status: 404,
			},
		},
	});
	if (jobRes.error) return jobRes;

	return {
		error: undefined,
		data: JobsFormatter.formatSingle({
			job: jobRes.data,
		}),
	};
};

export default getSingle;

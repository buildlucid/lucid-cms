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
	const Jobs = new QueueJobsRepository(context.db.client, context.config.db);

	const jobRes = await Jobs.selectSingleById({
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
		id: data.id,
		tenantKey: context.request.tenantKey,
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

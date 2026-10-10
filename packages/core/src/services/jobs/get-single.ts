import { jobsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { JobsRepository } from "../../libs/repositories/index.js";
import type { JobDetails } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Reads one job by its row ID, or by the public job ID that receipts and listings return. */
const getSingle: ServiceFn<
	[{ id: number } | { jobId: string }],
	JobDetails
> = async (context, data) => {
	const Jobs = new JobsRepository(context.db);

	const jobRes = await Jobs.selectSingleById({
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
			"error_stack",
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
		...data,
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
		data: jobsFormatter.formatDetails({
			job: jobRes.data,
		}),
	};
};

export default getSingle;

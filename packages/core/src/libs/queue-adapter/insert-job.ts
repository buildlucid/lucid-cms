import { randomUUID } from "node:crypto";
import constants from "../../constants/constants.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { QueueJobsRepository } from "../repositories/index.js";
import type { QueueEvent, QueueJobOptions, QueueJobStatus } from "./types.js";

/**
 * Inserts jobs into the queue_jobs table
 */
const insertJobs: ServiceFn<
	[
		{
			event: QueueEvent;
			payloads: Record<string, unknown>[];
			options?: QueueJobOptions;
			adapterKey: string;
		},
	],
	{
		jobs: { jobId: string; payload: Record<string, unknown> }[];
		event: QueueEvent;
		status: QueueJobStatus;
	}
> = async (serviceContext, data) => {
	const now = new Date();
	const status: QueueJobStatus = "pending";

	const QueueJobs = new QueueJobsRepository(
		serviceContext.db.client,
		serviceContext.config.db,
	);

	const jobsData = data.payloads.map((payload) => ({
		jobId: randomUUID(),
		payload,
	}));

	const createJobsRes = await QueueJobs.createMultiple({
		data: jobsData.map((job) => ({
			job_id: job.jobId,
			event_type: data.event,
			event_data: job.payload,
			status: status,
			queue_adapter_key: data.adapterKey,
			priority: data.options?.priority ?? 0,
			attempts: 0,
			max_attempts: data.options?.maxAttempts ?? constants.queue.maxAttempts,
			error_message: null,
			created_at: now.toISOString(),
			scheduled_for: data.options?.scheduledFor
				? data.options.scheduledFor.toISOString()
				: undefined,
			created_by_user_id: data.options?.createdByUserId ?? null,
			updated_at: now.toISOString(),
		})),
		returning: ["id"],
	});
	if (createJobsRes.error) return createJobsRes;

	return {
		error: undefined,
		data: {
			jobs: jobsData,
			event: data.event,
			status,
		},
	};
};

export { insertJobs };

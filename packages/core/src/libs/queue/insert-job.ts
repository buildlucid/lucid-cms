import { randomUUID } from "node:crypto";
import constants from "../../constants/constants.js";
import { getTenantConfig } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";
import {
	QueueJobsRepository,
	QueueJobTenantsRepository,
} from "../repositories/index.js";
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
> = async (context, data) => {
	const now = new Date();
	const status: QueueJobStatus = "pending";

	const QueueJobs = new QueueJobsRepository(
		context.db.client,
		context.config.db,
	);
	const QueueJobTenants = new QueueJobTenantsRepository(
		context.db.client,
		context.config.db,
	);

	const tenantKeys = Array.from(
		new Set(
			data.options?.tenantKeys ??
				(context.request.tenantKey ? [context.request.tenantKey] : []),
		),
	);

	const unknownTenant = tenantKeys.find(
		(key) => getTenantConfig(context.config, key) === undefined,
	);
	if (unknownTenant !== undefined) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tenants.unknown", {
					data: { key: unknownTenant },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

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

	const createdJobs = createJobsRes.data ?? [];

	if (tenantKeys.length > 0 && createdJobs.length > 0) {
		const createTenantsRes = await QueueJobTenants.createMultiple({
			data: createdJobs.flatMap((job) =>
				tenantKeys.map((tenantKey) => ({
					queue_job_id: job.id,
					tenant_key: tenantKey,
				})),
			),
		});
		if (createTenantsRes.error) return createTenantsRes;
	}

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

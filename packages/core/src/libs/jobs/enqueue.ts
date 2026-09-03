import { randomUUID } from "node:crypto";
import type { Insertable } from "kysely";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { LucidJobs } from "../db/tables/jobs.js";
import { copy } from "../i18n/index.js";
import { JobsRepository } from "../repositories/index.js";
import { flushPendingJobs } from "./dispatch.js";
import {
	getJobDefinitionKey,
	getJobDefinitionRuntime,
	getJobRegistry,
} from "./registry.js";
import type {
	AnyJobDefinition,
	InternalJobEnqueueOptions,
	JobInput,
	JobReceipt,
} from "./types.js";

/** Validates an optional idempotency key against the batch being stored. */
const resolveIdempotencyKey = (
	options: InternalJobEnqueueOptions | undefined,
	payloadCount: number,
): Awaited<ServiceResponse<string | null>> => {
	const key = options?.idempotencyKey?.trim();
	if (key === undefined) return { error: undefined, data: null };

	if (key.length === 0) {
		return {
			error: { message: copy("server:core.jobs.idempotency.key.empty") },
			data: undefined,
		};
	}
	if (payloadCount !== 1) {
		return {
			error: {
				message: copy("server:core.jobs.idempotency.batch.unsupported"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: key };
};

/** Checks a requested run time against the delay the queue adapter supports. */
const resolveAvailableAt = (
	context: ServiceContext,
	props: { runAt: Date; now: Date },
): Awaited<ServiceResponse<string>> => {
	if (!Number.isFinite(props.runAt.getTime())) {
		return {
			error: { message: copy("server:core.jobs.run.at.invalid") },
			data: undefined,
		};
	}

	const delayMs = Math.max(0, props.runAt.getTime() - props.now.getTime());
	const support = context.queue.support;

	if (delayMs > 0 && !support.delayedDelivery) {
		return {
			error: {
				message: copy("server:core.jobs.scheduling.not.supported", {
					data: { adapter: context.queue.key },
				}),
			},
			data: undefined,
		};
	}
	if (
		delayMs > 0 &&
		support.delayedDelivery &&
		support.maxDelayMs !== null &&
		delayMs > support.maxDelayMs
	) {
		return {
			error: {
				message: copy("server:core.jobs.scheduling.delay.exceeded", {
					data: { adapter: context.queue.key, maxDelayMs: support.maxDelayMs },
				}),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: props.runAt.toISOString() };
};

/** Validates each payload and builds the rows and receipts for one batch. */
const buildJobRows = async (
	context: ServiceContext,
	props: {
		definition: AnyJobDefinition;
		payloads: readonly unknown[];
		options: InternalJobEnqueueOptions | undefined;
		idempotencyKey: string | null;
		availableAt: string;
		now: Date;
	},
): ServiceResponse<{
	rows: Insertable<LucidJobs>[];
	receipts: JobReceipt[];
}> => {
	const runtime = getJobDefinitionRuntime(props.definition);
	const trigger = props.options?.trigger;
	const timestamp = props.now.toISOString();
	const maxAttempts =
		props.definition.retry.type === "none"
			? 1
			: props.definition.retry.maxAttempts;

	const rows: Insertable<LucidJobs>[] = [];
	const receipts: JobReceipt[] = [];

	for (const input of props.payloads) {
		const parsed = await runtime.parse(input);
		if (!parsed.success) return { error: parsed.error, data: undefined };

		const described = await runtime.describe(parsed.data);
		if (!described.success) return { error: described.error, data: undefined };

		const jobId = randomUUID();
		rows.push({
			job_id: jobId,
			job_name: props.definition.name,
			job_version: props.definition.version,
			trigger_type: trigger?.type ?? "enqueue",
			schedule_key: trigger?.type === "schedule" ? trigger.scheduleKey : null,
			scheduled_for:
				trigger?.type === "schedule" ? trigger.scheduledFor : undefined,
			idempotency_key: props.idempotencyKey,
			payload: parsed.data,
			display_data: described.data,
			status: "queued" as const,
			queue_adapter_key: context.queue.key,
			attempts: 0,
			max_attempts: maxAttempts,
			available_at: props.availableAt,
			dispatch_status: "pending" as const,
			dispatch_attempts: 0,
			next_dispatch_at: timestamp,
			created_at: timestamp,
			created_by_user_id: props.options?.createdByUserId ?? null,
			updated_at: timestamp,
		});
		receipts.push({
			jobId,
			name: props.definition.name,
			version: props.definition.version,
		});
	}

	return { error: undefined, data: { rows, receipts } };
};

/** Validates and stores a batch of durable jobs in one database write. */
export const enqueueJobs = async <Definition extends AnyJobDefinition>(
	context: ServiceContext,
	data: {
		job: Definition;
		payload: readonly JobInput<Definition>[];
		options?: InternalJobEnqueueOptions;
	},
): ServiceResponse<JobReceipt[]> => {
	const definitionKey = getJobDefinitionKey(data.job);
	const definition = getJobRegistry(context.config).get(definitionKey);
	if (!definition) {
		return {
			error: {
				message: copy("server:core.jobs.definition.not.registered", {
					data: { definition: definitionKey },
				}),
			},
			data: undefined,
		};
	}

	const idempotencyKey = resolveIdempotencyKey(
		data.options,
		data.payload.length,
	);
	if (idempotencyKey.error) return idempotencyKey;

	const now = new Date();
	const availableAt = resolveAvailableAt(context, {
		runAt: data.options?.runAt ?? now,
		now,
	});
	if (availableAt.error) return availableAt;

	const built = await buildJobRows(context, {
		definition,
		payloads: data.payload,
		options: data.options,
		idempotencyKey: idempotencyKey.data,
		availableAt: availableAt.data,
		now,
	});
	if (built.error) return built;
	if (built.data.rows.length === 0) return { error: undefined, data: [] };

	const Jobs = new JobsRepository(context.db);
	const insert = await Jobs.createMultipleIdempotent(built.data.rows);
	if (insert.error) return insert;

	//* An idempotent insert can be a no-op, so the stored job owns the receipt
	let receipts = built.data.receipts;
	if (idempotencyKey.data) {
		const stored = await Jobs.selectSingleByIdempotencyKey(idempotencyKey.data);
		if (stored.error) return stored;
		if (!stored.data) {
			return {
				error: { message: copy("server:core.jobs.create.failed") },
				data: undefined,
			};
		}
		receipts = [
			{
				jobId: stored.data.job_id,
				name: stored.data.job_name,
				version: stored.data.job_version,
			},
		];
	}

	if (!context.db.isTransaction) {
		await flushPendingJobs(context);
	}

	return { error: undefined, data: receipts };
};

/** Validates and stores one durable job for execution after commit. */
export const enqueueJob = async <Definition extends AnyJobDefinition>(
	context: ServiceContext,
	data: {
		job: Definition;
		payload: JobInput<Definition>;
		options?: InternalJobEnqueueOptions;
	},
): ServiceResponse<JobReceipt> => {
	const result = await enqueueJobs(context, {
		job: data.job,
		payload: [data.payload],
		options: data.options,
	});
	if (result.error) return result;

	const receipt = result.data[0];
	if (!receipt) {
		return {
			error: { message: copy("server:core.jobs.create.failed") },
			data: undefined,
		};
	}

	return { error: undefined, data: receipt };
};

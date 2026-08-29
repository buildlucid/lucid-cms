import { randomUUID } from "node:crypto";
import type { Insertable } from "kysely";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { LucidQueueJobs } from "../../db/tables/queue-jobs.js";
import { copy } from "../../i18n/index.js";
import { getJobDefinitionKey, getJobRegistry } from "../registry.js";
import {
	type AnyJobDefinition,
	getJobDefinitionRuntime,
	type JobEnqueueOptions,
	type JobInput,
	type JobReceipt,
} from "../types.js";
import { flushPendingJobs } from "./flush-pending-jobs.js";

/** Returns the total attempts allowed by a job's retry policy. */
const getMaxAttempts = (definition: AnyJobDefinition) =>
	definition.retry.type === "none" ? 1 : definition.retry.maxAttempts;

/** Validates and stores a batch of durable jobs in one database write. */
export const enqueueJobs = async <Definition extends AnyJobDefinition>(
	context: ServiceContext,
	data: {
		job: Definition;
		payload: readonly JobInput<Definition>[];
		options?: JobEnqueueOptions;
	},
): ServiceResponse<JobReceipt[]> => {
	const registry = getJobRegistry(context.config);
	const definitionKey = getJobDefinitionKey(data.job);
	const registered = registry.get(definitionKey);
	if (!registered) {
		return {
			error: {
				message: copy("server:core.queue.jobs.definition.not.registered", {
					data: { definition: definitionKey },
				}),
			},
			data: undefined,
		};
	}

	const now = new Date();
	const runAt = data.options?.runAt ?? now;
	if (!Number.isFinite(runAt.getTime())) {
		return {
			error: {
				message: copy("server:core.queue.jobs.run.at.invalid"),
			},
			data: undefined,
		};
	}
	const delayMs = Math.max(0, runAt.getTime() - now.getTime());
	if (delayMs > 0 && !context.queue.support.scheduling) {
		return {
			error: {
				message: copy("server:core.queue.jobs.scheduling.not.supported", {
					data: { adapter: context.queue.key },
				}),
			},
			data: undefined,
		};
	}
	if (
		delayMs > 0 &&
		context.queue.support.scheduling &&
		context.queue.support.maxDelayMs !== null &&
		delayMs > context.queue.support.maxDelayMs
	) {
		return {
			error: {
				message: copy("server:core.queue.jobs.scheduling.delay.exceeded", {
					data: {
						adapter: context.queue.key,
						maxDelayMs: context.queue.support.maxDelayMs,
					},
				}),
			},
			data: undefined,
		};
	}

	const runtime = getJobDefinitionRuntime(registered);
	const parsedInputs = [];
	for (const input of data.payload) {
		const parsed = await runtime.parse(input);
		if (!parsed.success) return { error: parsed.error, data: undefined };
		parsedInputs.push(parsed.data);
	}

	const rows: Insertable<LucidQueueJobs>[] = [];
	const receipts: JobReceipt[] = [];
	for (const payload of parsedInputs) {
		const jobId = randomUUID();
		const described = await runtime.describe(payload);
		if (!described.success) {
			return { error: described.error, data: undefined };
		}
		const availableAt = runAt.toISOString();
		rows.push({
			job_id: jobId,
			job_name: registered.name,
			job_version: registered.version,
			payload,
			display_data: described.data,
			status: "queued" as const,
			queue_adapter_key: context.queue.key,
			attempts: 0,
			max_attempts: getMaxAttempts(registered),
			available_at: availableAt,
			dispatch_status: "pending" as const,
			dispatch_attempts: 0,
			next_dispatch_at: now.toISOString(),
			created_at: now.toISOString(),
			created_by_user_id: data.options?.createdByUserId ?? null,
			updated_at: now.toISOString(),
		});
		receipts.push({
			jobId,
			name: registered.name,
			version: registered.version,
		});
	}

	if (rows.length === 0) return { error: undefined, data: [] };

	const insert = await context.db
		.query("queue.jobs.create", (db) =>
			db.insertInto("lucid_queue_jobs").values(rows),
		)
		.first();
	if (insert.error) return insert;

	if (!context.db.isTransaction) {
		await flushPendingJobs(context);
	}

	return { error: undefined, data: receipts };
};

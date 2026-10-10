import z from "zod";
import { controllerSchemas } from "../../../schemas/jobs.js";
import type { Job } from "../../../types/response.js";

export const jobIdInput = z.uuid().meta({
	description:
		"The job's jobId, eg. from jobs_find or the job a tool such as requests_complete returned.",
});

/** A job as listings show it, without its row ID or queue and lease internals. */
export const jobSchema = controllerSchemas.getMultiple.response.element
	.omit({
		id: true,
		queueAdapterKey: true,
		dispatchAttempts: true,
		dispatchedAt: true,
		leaseExpiresAt: true,
	})
	.extend({
		displayData: z.record(z.string(), z.unknown()).nullable().meta({
			description: "What the job was asked to do, as the admin shows it.",
		}),
	});

export const jobDetailsSchema = jobSchema.extend({
	errorStack: z.string().nullable().meta({
		description: "Stack trace of the last failed attempt, when it threw.",
	}),
});

export const formatJob = <T extends Job>({
	id: _id,
	queueAdapterKey: _queueAdapterKey,
	dispatchAttempts: _dispatchAttempts,
	dispatchedAt: _dispatchedAt,
	leaseExpiresAt: _leaseExpiresAt,
	...job
}: T) => job;

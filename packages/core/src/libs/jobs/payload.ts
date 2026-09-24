import z from "zod";
import type { JobPayload, JobValue } from "./types.js";

export const jobStatusSchema = z.enum([
	"queued",
	"running",
	"completed",
	"failed",
	"cancelled",
]);

export const jobDispatchStatusSchema = z.enum(["pending", "dispatched"]);

export const jobTriggerTypeSchema = z.enum(["enqueue", "schedule"]);

export const jobScheduleOverlapSchema = z.enum(["skip", "allow"]);

export const jobScheduleMissedSchema = z.enum(["skip", "run-once"]);

export const jobValueSchema: z.ZodType<JobValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jobValueSchema),
		z.record(z.string(), jobValueSchema),
	]),
);

export const jobPayloadSchema: z.ZodType<JobPayload> = z.record(
	z.string(),
	jobValueSchema,
);

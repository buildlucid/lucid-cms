import z from "zod";
import isPlainObject from "../../utils/helpers/is-plain-object.js";
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

const hasEveryArrayIndex = (value: readonly unknown[]) => {
	if (
		Object.getOwnPropertySymbols(value).length > 0 ||
		Object.keys(value).length !== value.length
	) {
		return false;
	}
	for (let index = 0; index < value.length; index += 1) {
		if (!Object.hasOwn(value, index)) return false;
	}
	return true;
};

/** Checks that a value is a plain JSON object without lossy values or cycles. */
export const isJobPayload = (value: unknown): value is JobPayload => {
	if (!isPlainObject(value)) return false;
	const ancestors = new WeakSet<object>();

	const visit = (current: unknown): current is JobValue => {
		if (
			current === null ||
			typeof current === "string" ||
			typeof current === "boolean"
		) {
			return true;
		}
		if (typeof current === "number") return Number.isFinite(current);
		if (typeof current !== "object") return false;
		if (ancestors.has(current)) return false;

		ancestors.add(current);
		const valid = Array.isArray(current)
			? hasEveryArrayIndex(current) && current.every(visit)
			: isPlainObject(current) &&
				Object.getOwnPropertySymbols(current).length === 0 &&
				Object.values(current).every(visit);
		ancestors.delete(current);
		return valid;
	};

	return visit(value);
};

import z from "zod";
import { isJobDefinition } from "../../jobs/registry.js";
import type { AnyJobDefinition } from "../../jobs/types.js";

export const enqueueSchema = z.object({
	job: z.custom<AnyJobDefinition>(
		isJobDefinition,
		"Provide a job created with defineJob.",
	),
	options: z
		.object({
			runAt: z.date().optional(),
			createdByUserId: z.number().int().positive().optional(),
			idempotencyKey: z.string().trim().min(1).optional(),
		})
		.optional(),
});

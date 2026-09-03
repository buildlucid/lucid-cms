import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampMutable, TimestampRequired } from "../types.js";

export const jobSchedulerTable = defineTable("lucid_job_scheduler", () => ({
	columns: {
		id: { schema: z.number(), type: "primary" },
		scheduler_key: { schema: z.string(), type: "text" },
		cursor_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		updated_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
	},
}));

export interface LucidJobScheduler {
	id: Generated<number>;
	scheduler_key: string;
	cursor_at: TimestampMutable;
	updated_at: TimestampRequired;
}

import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampRequired } from "../types.js";

export const jobScheduleOverridesTable = defineTable(
	"lucid_job_schedule_overrides",
	() => ({
		columns: {
			id: { schema: z.number(), type: "primary" },
			schedule_key: { schema: z.string(), type: "text" },
			paused_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			paused_by_user_id: { schema: z.number().nullable(), type: "integer" },
		},
	}),
);

export interface LucidJobScheduleOverrides {
	id: Generated<number>;
	schedule_key: string;
	paused_at: TimestampRequired;
	paused_by_user_id: number | null;
}

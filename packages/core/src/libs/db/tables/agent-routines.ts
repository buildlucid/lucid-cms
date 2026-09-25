import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
	TimestampRequired,
} from "../types.js";

export const agentRoutinesTable = defineTable("lucid_agent_routines", () => ({
	columns: {
		id: { schema: z.uuid(), type: "text" },
		title: { schema: z.string(), type: "text" },
		instructions: { schema: z.string(), type: "text" },
		cron: { schema: z.string(), type: "text" },
		timezone: { schema: z.string(), type: "text" },
		enabled: {
			schema: z.union([z.boolean(), z.literal(0), z.literal(1)]),
			type: "boolean",
		},
		user_id: { schema: z.number(), type: "integer" },
		next_run_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		created_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
		updated_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
	},
	query: {
		filters: { title: "title" },
		sorts: { title: "title", createdAt: "created_at", updatedAt: "updated_at" },
		operators: { title: "contains" },
	},
}));

export interface LucidAgentRoutines {
	id: string;
	title: string;
	instructions: string;
	cron: string;
	timezone: string;
	enabled: BooleanInt;
	user_id: number;
	next_run_at: TimestampMutable;
	created_at: TimestampImmutable;
	updated_at: TimestampRequired;
}

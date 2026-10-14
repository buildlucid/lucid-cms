import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const agentMemoriesTable = defineTable("lucid_agent_memories", () => ({
	columns: {
		id: { schema: z.uuid(), type: "text" },
		owner_user_id: { schema: z.number().nullable(), type: "integer" },
		content: { schema: z.string(), type: "text" },
		created_by: { schema: z.number().nullable(), type: "integer" },
		created_by_run_id: { schema: z.uuid().nullable(), type: "text" },
		updated_by: { schema: z.number().nullable(), type: "integer" },
		updated_by_run_id: { schema: z.uuid().nullable(), type: "text" },
		created_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
		updated_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
	},
}));

/** Stored memories, owned by a user when personal and ownerless when shared. */
export interface LucidAgentMemories {
	id: string;
	/** Null for shared memories. */
	owner_user_id: number | null;
	content: string;
	created_by: number | null;
	/** The agent run that saved it, acting for `created_by`. */
	created_by_run_id: string | null;
	updated_by: number | null;
	/** The agent run that last changed it, acting for `updated_by`. */
	updated_by_run_id: string | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

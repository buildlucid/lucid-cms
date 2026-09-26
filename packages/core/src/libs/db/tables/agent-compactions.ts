import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const agentCompactionsTable = defineTable(
	"lucid_agent_compactions",
	() => ({
		columns: {
			id: { schema: z.uuid(), type: "text" },
			conversation_id: { schema: z.uuid(), type: "text" },
			run_id: { schema: z.uuid(), type: "text" },
			through_position: {
				schema: z.number().int().positive(),
				type: "integer",
			},
			summary: { schema: z.string(), type: "text" },
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidAgentCompactions {
	id: string;
	conversation_id: string;
	run_id: string;
	through_position: number;
	summary: string;
	created_at: TimestampImmutable;
}

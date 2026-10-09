import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { BooleanInt, TimestampImmutable } from "../types.js";

export const agentAttributionsTable = defineTable(
	"lucid_agent_attributions",
	() => ({
		columns: {
			run_id: { schema: z.uuid(), type: "text" },
			agent_key: { schema: z.string(), type: "text" },
			system: {
				schema: z.union([z.boolean(), z.literal(0), z.literal(1)]),
				type: "boolean",
			},
			conversation_id: { schema: z.uuid().nullable(), type: "text" },
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

/** Keeps agent attribution after its run and chat are deleted. */
export interface LucidAgentAttributions {
	run_id: string;
	agent_key: string;
	/** The run acted as the system rather than for a person. Changes with no user are otherwise ambiguous, as deleting a person clears theirs. */
	system: Generated<BooleanInt>;
	/** The run's chat. Null once the chat is deleted. */
	conversation_id: string | null;
	created_at: TimestampImmutable;
}

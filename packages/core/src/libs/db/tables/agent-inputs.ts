import type { Generated } from "kysely";
import z from "zod";
import { agentInputStatusSchema } from "../../../schemas/agent.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const agentInputsTable = defineTable("lucid_agent_inputs", () => ({
	columns: {
		sequence: { schema: z.number().int(), type: "integer" },
		id: { schema: z.uuid(), type: "text" },
		conversation_id: { schema: z.uuid(), type: "text" },
		user_id: { schema: z.number(), type: "integer" },
		text: { schema: z.string(), type: "text" },
		target_run_id: { schema: z.uuid().nullable(), type: "text" },
		status: { schema: agentInputStatusSchema, type: "text" },
		created_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
	},
}));

/** Input sent while the agent is busy. `sequence` orders the queue; `target_run_id` marks a steer. */
export interface LucidAgentInputs {
	sequence: Generated<number>;
	id: string;
	conversation_id: string;
	/** Who sent it. The run it starts acts for them. */
	user_id: number;
	text: string;
	target_run_id: string | null;
	status: Generated<z.infer<typeof agentInputStatusSchema>>;
	created_at: TimestampImmutable;
}

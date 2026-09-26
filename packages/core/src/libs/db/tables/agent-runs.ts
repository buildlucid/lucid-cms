import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import {
	agentRunOutcomeSchema,
	agentRunStatusSchema,
} from "../../../schemas/agent.js";
import { type Checkpoint, checkpointSchema } from "../../agent/types.js";
import { defineTable } from "../client/table/definition.js";
import type {
	TimestampImmutable,
	TimestampMutable,
	TimestampRequired,
} from "../types.js";

export const agentRunsTable = defineTable("lucid_agent_runs", () => ({
	columns: {
		id: { schema: z.uuid(), type: "text" },
		conversation_id: { schema: z.uuid(), type: "text" },
		routine_id: { schema: z.uuid().nullable(), type: "text" },
		user_id: { schema: z.number().nullable(), type: "integer" },
		status: { schema: agentRunStatusSchema, type: "text" },
		outcome: { schema: agentRunOutcomeSchema.nullable(), type: "text" },
		summary: { schema: z.string().nullable(), type: "text" },
		checkpoint: { schema: checkpointSchema.nullable(), type: "json" },
		error_message: { schema: z.string().nullable(), type: "text" },
		recoveries: { schema: z.number().int().nonnegative(), type: "integer" },
		created_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
		updated_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
		started_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		finished_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		lease_expires_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		execution_token: { schema: z.uuid().nullable(), type: "text" },
		execution_version: {
			schema: z.number().int().nonnegative(),
			type: "integer",
		},
	},
	query: {
		filters: { status: "status" },
		sorts: { createdAt: "created_at" },
	},
}));

export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export interface LucidAgentRuns {
	id: string;
	conversation_id: string;
	routine_id: string | null;
	/** Who the run acts for. Null when it acts as the system. */
	user_id: number | null;
	status: AgentRunStatus;
	outcome: z.infer<typeof agentRunOutcomeSchema> | null;
	summary: string | null;
	checkpoint: JSONColumnType<
		Checkpoint | null,
		Checkpoint | null,
		Checkpoint | null
	>;
	error_message: string | null;
	recoveries: Generated<number>;
	created_at: TimestampImmutable;
	updated_at: TimestampRequired;
	started_at: TimestampMutable;
	finished_at: TimestampMutable;
	lease_expires_at: TimestampMutable;
	execution_token: string | null;
	execution_version: Generated<number>;
}

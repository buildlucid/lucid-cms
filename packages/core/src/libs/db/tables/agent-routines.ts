import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import {
	agentRoutineConversationModeSchema,
	agentRoutineSourceSchema,
} from "../../../schemas/agent.js";
import type { AiModelSelection } from "../../../types/response.js";
import { aiModelSelectionSchema } from "../../agent/model-selection.js";
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
		agent_key: { schema: z.string(), type: "text" },
		key: { schema: z.string().nullable(), type: "text" },
		source: { schema: agentRoutineSourceSchema, type: "text" },
		name: { schema: z.string(), type: "text" },
		instructions: { schema: z.string(), type: "text" },
		conversation_mode: {
			schema: agentRoutineConversationModeSchema,
			type: "text",
		},
		conversation_id: { schema: z.uuid().nullable(), type: "text" },
		model_selection: {
			schema: aiModelSelectionSchema.nullable(),
			type: "json",
		},
		cron: { schema: z.string(), type: "text" },
		timezone: { schema: z.string(), type: "text" },
		enabled: {
			schema: z.union([z.boolean(), z.literal(0), z.literal(1)]),
			type: "boolean",
		},
		user_id: { schema: z.number().nullable(), type: "integer" },
		next_run_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		created_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
		updated_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
	},
	query: {
		filters: { name: "name", agentKey: "agent_key" },
		sorts: { name: "name", createdAt: "created_at", updatedAt: "updated_at" },
		operators: { name: "contains" },
	},
}));

/** Routines defined in code are synced from config and act as the system; the rest belong to their user. */
export interface LucidAgentRoutines {
	id: string;
	agent_key: string;
	/** Only set for routines defined in code. */
	key: string | null;
	source: z.infer<typeof agentRoutineSourceSchema>;
	name: string;
	instructions: string;
	conversation_mode: Generated<
		z.infer<typeof agentRoutineConversationModeSchema>
	>;
	conversation_id: Generated<string | null>;
	/** Null uses the agent's default model. */
	model_selection: JSONColumnType<
		AiModelSelection | null,
		AiModelSelection | null | undefined,
		AiModelSelection | null
	>;
	cron: string;
	timezone: string;
	enabled: BooleanInt;
	user_id: number | null;
	next_run_at: TimestampMutable;
	created_at: TimestampImmutable;
	updated_at: TimestampRequired;
}

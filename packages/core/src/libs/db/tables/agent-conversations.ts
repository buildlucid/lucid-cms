import type { JSONColumnType } from "kysely";
import z from "zod";
import {
	agentContextSchema,
	agentRunOutcomeSchema,
	agentRunStatusSchema,
} from "../../../schemas/agent.js";
import type { ConversationContext } from "../../agent/types.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampRequired } from "../types.js";

export const agentConversationsTable = defineTable(
	"lucid_agent_conversations",
	() => ({
		columns: {
			id: { schema: z.uuid(), type: "text" },
			title: { schema: z.string(), type: "text" },
			user_id: { schema: z.number(), type: "integer" },
			routine_id: { schema: z.uuid().nullable(), type: "text" },
			active_run_id: { schema: z.uuid().nullable(), type: "text" },
			context: { schema: agentContextSchema.nullable(), type: "json" },
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
		results: {
			latest_run_id: { schema: z.uuid().nullish() },
			latest_run_status: { schema: agentRunStatusSchema.nullish() },
			latest_run_outcome: { schema: agentRunOutcomeSchema.nullish() },
			latest_run_error: { schema: z.string().nullish() },
		},
		query: {
			filters: {
				title: "lucid_agent_conversations.title",
				routineId: "lucid_agent_conversations.routine_id",
				status: "lucid_agent_runs.status",
			},
			sorts: {
				title: "lucid_agent_conversations.title",
				createdAt: "lucid_agent_conversations.created_at",
				updatedAt: "lucid_agent_conversations.updated_at",
			},
			operators: {
				title: "contains",
			},
		},
	}),
);

export interface LucidAgentConversations {
	id: string;
	title: string;
	user_id: number;
	routine_id: string | null;
	active_run_id: string | null;
	/** The latest measured context, written by the conversation's active run. */
	context: JSONColumnType<
		ConversationContext | null,
		ConversationContext | null | undefined,
		ConversationContext | null
	>;
	created_at: TimestampImmutable;
	updated_at: TimestampRequired;
}

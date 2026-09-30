import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import {
	agentMessagePartSchema,
	type StoredAgentMessagePart,
} from "../../../schemas/agent.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampRequired } from "../types.js";

export const agentMessagesTable = defineTable("lucid_agent_messages", () => ({
	columns: {
		id: { schema: z.uuid(), type: "text" },
		conversation_id: { schema: z.uuid(), type: "text" },
		run_id: { schema: z.uuid().nullable(), type: "text" },
		position: { schema: z.number().int().positive(), type: "integer" },
		execution_version: {
			schema: z.number().int().nonnegative(),
			type: "integer",
		},
		revision: { schema: z.number().int().nonnegative(), type: "integer" },
		role: { schema: z.enum(["user", "assistant"]), type: "text" },
		parts: { schema: z.array(agentMessagePartSchema), type: "json" },
		created_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
		updated_at: { schema: z.union([z.string(), z.date()]), type: "timestamp" },
	},
}));

export interface LucidAgentMessages {
	id: string;
	conversation_id: string;
	run_id: string | null;
	position: number;
	execution_version: Generated<number>;
	revision: Generated<number>;
	role: "user" | "assistant";
	parts: JSONColumnType<
		StoredAgentMessagePart[],
		StoredAgentMessagePart[],
		StoredAgentMessagePart[]
	>;
	created_at: TimestampImmutable;
	updated_at: TimestampRequired;
}

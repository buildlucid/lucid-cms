import type { Generated } from "kysely";
import z from "zod";
import { agentReferenceSourceTypeSchema } from "../../../schemas/agent-references.js";
import { defineTable } from "../client/table/definition.js";
import type { BooleanInt, TimestampImmutable } from "../types.js";

export const agentMediaReferencesTable = defineTable(
	"lucid_agent_media_references",
	() => ({
		columns: {
			id: { schema: z.uuid(), type: "text" },
			conversation_id: { schema: z.uuid(), type: "text" },
			media_id: { schema: z.number().int(), type: "integer" },
			source: { schema: agentReferenceSourceTypeSchema, type: "text" },
			tool_name: { schema: z.string().nullable(), type: "text" },
			managed: {
				schema: z.union([z.boolean(), z.literal(0), z.literal(1)]),
				type: "boolean",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

/** A media resource linked to a conversation. */
export interface LucidAgentMediaReferences {
	id: string;
	conversation_id: string;
	media_id: number;
	/** Whether a person attached it to a message or a tool linked it. */
	source: z.infer<typeof agentReferenceSourceTypeSchema>;
	/** The tool that linked it, when `source` is "tool". */
	tool_name: string | null;
	/** Linked through the toolkit by a tool that manages it. Only the toolkit can unlink it. */
	managed: Generated<BooleanInt>;
	created_at: TimestampImmutable;
}

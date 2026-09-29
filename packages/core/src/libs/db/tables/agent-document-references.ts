import z from "zod";
import { agentReferenceSourceTypeSchema } from "../../../schemas/agent-references.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const agentDocumentReferencesTable = defineTable(
	"lucid_agent_document_references",
	() => ({
		columns: {
			id: { schema: z.uuid(), type: "text" },
			conversation_id: { schema: z.uuid(), type: "text" },
			collection_key: { schema: z.string(), type: "text" },
			document_id: { schema: z.number().int(), type: "integer" },
			version_id: { schema: z.number().int().nullable(), type: "integer" },
			source: { schema: agentReferenceSourceTypeSchema, type: "text" },
			tool_name: { schema: z.string().nullable(), type: "text" },
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

/** A document resource linked to a conversation. */
export interface LucidAgentDocumentReferences {
	id: string;
	conversation_id: string;
	collection_key: string;
	document_id: number;
	version_id: number | null;
	/** Whether a person attached it to a message or a tool linked it. */
	source: z.infer<typeof agentReferenceSourceTypeSchema>;
	/** The tool that linked it, when `source` is "tool". */
	tool_name: string | null;
	created_at: TimestampImmutable;
}

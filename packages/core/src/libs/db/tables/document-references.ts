import z from "zod";
import { defineTable } from "../client/table/definition.js";

export const documentReferencesTable = defineTable(
	"lucid_document_references",
	() => ({
		columns: {
			generation: { schema: z.string(), type: "text" },
			collection_key: { schema: z.string(), type: "text" },
			document_id: { schema: z.number(), type: "integer" },
			version_id: { schema: z.number(), type: "integer" },
			source_table: { schema: z.string(), type: "text" },
			source_column: { schema: z.string(), type: "text" },
			locale: { schema: z.string(), type: "text" },
			kind: { schema: z.enum(["direct", "embedded"]), type: "text" },
			target_resource: {
				schema: z.enum(["documents", "media", "users"]),
				type: "text",
			},
			target_table: { schema: z.string(), type: "text" },
			target_id: { schema: z.number(), type: "integer" },
		},
	}),
);

/** Derived references, including unresolved identities retained in authored JSON. */
export interface LucidDocumentReferences {
	generation: string;
	collection_key: string;
	document_id: number;
	version_id: number;
	source_table: string;
	source_column: string;
	locale: string;
	kind: "direct" | "embedded";
	target_resource: "documents" | "media" | "users";
	target_table: string;
	target_id: number;
}

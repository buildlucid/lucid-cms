import z from "zod";
import { defineTable } from "../client/table/definition.js";

export const documentIdentitiesTable = defineTable(
	"lucid_document_identities",
	() => ({
		columns: {
			collection_key: { schema: z.string(), type: "text" },
			document_id: { schema: z.number().int(), type: "integer" },
		},
	}),
);

/** One identity per document, retained while the document is soft-deleted. */
export interface LucidDocumentIdentities {
	collection_key: string;
	document_id: number;
}

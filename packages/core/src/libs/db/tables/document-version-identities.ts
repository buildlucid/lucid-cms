import z from "zod";
import { defineTable } from "../client/table/definition.js";

export const documentVersionIdentitiesTable = defineTable(
	"lucid_document_version_identities",
	() => ({
		columns: {
			collection_key: { schema: z.string(), type: "text" },
			document_id: { schema: z.number().int(), type: "integer" },
			version_id: { schema: z.number().int(), type: "integer" },
		},
	}),
);

/** A version's stable identity, independent of whether it is latest, a revision or published. */
export interface LucidDocumentVersionIdentities {
	collection_key: string;
	document_id: number;
	version_id: number;
}

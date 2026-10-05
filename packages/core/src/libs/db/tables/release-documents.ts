import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";

/** A release owns one private source version for each included document. */
export const releaseDocumentsTable = defineTable(
	"lucid_release_documents",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			release_id: {
				schema: z.number(),
				type: "integer",
			},
			collection_key: {
				schema: z.string(),
				type: "text",
			},
			document_id: {
				schema: z.number(),
				type: "integer",
			},
			source: {
				schema: z.string(),
				type: "text",
			},
			source_version_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			approved_version_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			approved_workflow_stage: {
				schema: z.string().nullable(),
				type: "text",
			},
		},
	}),
);

export interface LucidReleaseDocuments {
	id: Generated<number>;
	release_id: number;
	collection_key: string;
	document_id: number;
	/** Fixed starting source. Content is cloned into a proposal or snapshot. */
	source: string;
	/** The release's proposal or snapshot. Proposals are removed once released, and both on permanent deletion. */
	source_version_id: number | null;
	/** The frozen snapshot that was approved and will be published. */
	approved_version_id: number | null;
	approved_workflow_stage: string | null;
}

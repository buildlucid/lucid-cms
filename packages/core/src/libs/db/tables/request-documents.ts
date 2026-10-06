import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";

/** A request owns one private source version for each included document. */
export const requestDocumentsTable = defineTable(
	"lucid_request_documents",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			request_id: {
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

export interface LucidRequestDocuments {
	id: Generated<number>;
	request_id: number;
	collection_key: string;
	document_id: number;
	/** Fixed starting source. Content is cloned into a proposal or snapshot. */
	source: string;
	/** The request's proposal or snapshot. Proposals are removed once completed, and both on permanent deletion. */
	source_version_id: number | null;
	/** The frozen snapshot that was approved and will be published. */
	approved_version_id: number | null;
	approved_workflow_stage: string | null;
}

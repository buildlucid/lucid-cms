import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampRequired } from "../types.js";

export const documentHoldsTable = defineTable("lucid_document_holds", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		collection_key: {
			schema: z.string(),
			type: "text",
		},
		document_id: {
			schema: z.number(),
			type: "integer",
		},
		target: {
			schema: z.string(),
			type: "varchar",
			args: [64],
		},
		tab_id: {
			schema: z.string(),
			type: "varchar",
			args: [64],
		},
		user_id: {
			schema: z.number(),
			type: "integer",
		},
		held_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
		seen_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
	},
}));

/** Stores one atomically claimed editor hold per document version, allowing only the holding tab to edit or save. */
export interface LucidDocumentHolds {
	id: Generated<number>;
	collection_key: string;
	document_id: number;
	/** `latest`, or `request:{id}` for a request's proposal. */
	target: string;
	tab_id: string;
	user_id: number;
	held_at: TimestampRequired;
	/** The holder's last heartbeat or save, with holds older than `constants.documentEditors.ttlMs` free to claim. */
	seen_at: TimestampRequired;
}

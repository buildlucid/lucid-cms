import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const emailAttachmentsTable = defineTable(
	"lucid_email_attachments",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			email_id: {
				schema: z.number(),
				type: "integer",
			},
			type: {
				schema: z.literal("url"),
				type: "text",
			},
			url: {
				schema: z.string(),
				type: "text",
			},
			filename: {
				schema: z.string(),
				type: "text",
			},
			content_type: {
				schema: z.string().nullable(),
				type: "text",
			},
			disposition: {
				schema: z.union([z.literal("attachment"), z.literal("inline")]),
				type: "text",
			},
			content_id: {
				schema: z.string().nullable(),
				type: "text",
			},
			order: {
				schema: z.number(),
				type: "integer",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidEmailAttachments {
	id: Generated<number>;
	email_id: number;
	type: "url";
	url: string;
	filename: string;
	content_type: string | null;
	disposition: "attachment" | "inline";
	content_id: string | null;
	order: number;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}

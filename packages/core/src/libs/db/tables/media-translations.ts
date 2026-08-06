import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";

export const mediaTranslationsTable = defineTable(
	"lucid_media_translations",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			media_id: {
				schema: z.number(),
				type: "integer",
			},
			locale_code: {
				schema: z.string(),
				type: "text",
			},
			title: {
				schema: z.string().nullable(),
				type: "text",
			},
			alt: {
				schema: z.string().nullable(),
				type: "text",
			},
			description: {
				schema: z.string().nullable(),
				type: "text",
			},
			summary: {
				schema: z.string().nullable(),
				type: "text",
			},
		},
	}),
);

export interface LucidMediaTranslations {
	id: Generated<number>;
	media_id: number;
	locale_code: string;
	title: string | null;
	alt: string | null;
	description: string | null;
	summary: string | null;
}

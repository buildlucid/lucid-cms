import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampDefaulted } from "../types.js";

export const translationStylesTable = defineTable(
	"lucid_translation_styles",
	() => ({
		columns: {
			locale: {
				schema: z.string(),
				type: "text",
			},
			instructions: {
				schema: z.string(),
				type: "text",
			},
			updated_by: {
				schema: z.number().nullable(),
				type: "integer",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

/** Notes on tone and style for translations into a locale. */
export interface LucidTranslationStyles {
	locale: string;
	instructions: string;
	updated_by: number | null;
	updated_at: TimestampDefaulted;
}

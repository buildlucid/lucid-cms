import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampDefaulted } from "../types.js";

export const translationGlossaryTable = defineTable(
	"lucid_translation_glossary",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			term: {
				schema: z.string(),
				type: "text",
			},
			locale: {
				schema: z.string().nullable(),
				type: "text",
			},
			translation: {
				schema: z.string().nullable(),
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

/** Terms translations keep as written or always translate the same way. */
export interface LucidTranslationGlossary {
	id: Generated<number>;
	term: string;
	/** The target locale the term applies to. Null for every locale. */
	locale: string | null;
	/** The translation to use. Null keeps the term exactly as written. */
	translation: string | null;
	updated_by: number | null;
	updated_at: TimestampDefaulted;
}

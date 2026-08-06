import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";

export const roleTranslationsTable = defineTable(
	"lucid_role_translations",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			role_id: {
				schema: z.number(),
				type: "integer",
			},
			locale_code: {
				schema: z.string(),
				type: "text",
			},
			name: {
				schema: z.string().nullable(),
				type: "text",
			},
			description: {
				schema: z.string().nullable(),
				type: "text",
			},
		},
	}),
);

export interface LucidRoleTranslations {
	id: Generated<number>;
	role_id: number;
	locale_code: string;
	name: string | null;
	description: string | null;
}

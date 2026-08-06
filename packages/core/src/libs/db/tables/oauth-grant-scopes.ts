import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const oauthGrantScopesTable = defineTable(
	"lucid_oauth_grant_scopes",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			grant_id: {
				schema: z.number(),
				type: "integer",
			},
			scope: {
				schema: z.string(),
				type: "text",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidOAuthGrantScopes {
	id: Generated<number>;
	grant_id: number;
	scope: string;
	created_at: TimestampImmutable;
}

import type { Generated } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const oauthRefreshTokensTable = defineTable(
	"lucid_oauth_refresh_tokens",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			token_hash: {
				schema: z.string(),
				type: "varchar",
				args: [64],
			},
			family_id: {
				schema: z.string(),
				type: "varchar",
				args: [64],
			},
			grant_id: {
				schema: z.number(),
				type: "integer",
			},
			client_id: {
				schema: z.string(),
				type: "text",
			},
			resource: {
				schema: z.string(),
				type: "text",
			},
			expires_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			consumed_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			revoked_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
	}),
);

export interface LucidOAuthRefreshTokens {
	id: Generated<number>;
	token_hash: string;
	family_id: string;
	grant_id: number;
	client_id: string;
	resource: string;
	expires_at: TimestampImmutable;
	consumed_at: TimestampMutable;
	revoked_at: TimestampMutable;
	created_at: TimestampImmutable;
}
